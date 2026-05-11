'use strict';

// ─── User Seeder ─────────────────────────────────────────────────────────────
// Seeds synthetic users into SQLite + Fabric CA + chaincode onboarding.
// Implements: batch-and-pause enrollment, idempotency, OTP bypass.

const bcrypt = require('bcrypt');
const crypto = require('crypto');

const { createSyntheticUser, findUserByEmail } = require('../../db/database');
const { registerAndEnrollUser, identityExists } = require('../../fabric/identityManager');
const { connectGateway } = require('../../fabric/networkConnection');
const { ROLE_CONFIG, ROLE_PREFIX, ORG_CONFIG } = require('../../fabric/constants');
const { DEFAULT_PASSWORD } = require('../generators/dataGenerator');
const { batchAndPause } = require('../utils/throttle');
const { createLogger } = require('../utils/logger');

const log = createLogger('Users');

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Generate a userId with role prefix + random hex.
 */
const generateUserId = (role) => {
    const prefix = ROLE_PREFIX[role] || 'usr';
    const hex = crypto.randomBytes(4).toString('hex');
    return `${prefix}_${hex}`;
};

/**
 * Seed all users (patients, doctors, insurance agents, admin demo accounts).
 *
 * For each user:
 *   1. Check email uniqueness in SQLite (skip if exists)
 *   2. Check wallet identity (skip if exists → re-run safe)
 *   3. Register & enroll with Fabric CA
 *   4. Chaincode onboarding (onboardPatient/onboardDoctor/onboardInsurance)
 *   5. Insert into SQLite with isVerified=1, isSynthetic=1
 *
 * Admin accounts (hospital/insuranceAdmin) link to existing bootstrap identities
 * instead of creating new Fabric identities.
 *
 * @param {Object} dataset – Generated dataset from dataGenerator
 * @param {boolean} dryRun – If true, log but don't write
 * @returns {Object} userMap – { email: { userId, uuid, role, name, specialty? } }
 */
const seedUsers = async (dataset, dryRun = false) => {
    log.header('PHASE 1: USER ENROLLMENT');

    // Pre-compute bcrypt hash once (expensive operation)
    log.info('Computing bcrypt password hash...');
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_SALT_ROUNDS);
    log.success('Password hash computed.');

    const userMap = {};
    const stats = { enrolled: 0, skipped: 0, failed: 0 };

    // ── Build unified user list ──────────────────────────────────────────────
    const allUsers = [];

    // Demo accounts first (guaranteed)
    for (const demo of dataset.demoAccounts) {
        allUsers.push({ ...demo, isDemoAccount: true });
    }

    // Demo patient is also in patients list via demoAccounts, skip duplicate
    // Regular patients
    for (const p of dataset.patients) {
        allUsers.push(p);
    }

    // Doctors (demo doctor is in demoAccounts, regulars here)
    for (const d of dataset.doctors) {
        allUsers.push(d);
    }

    // Insurance agents (demo agent is in demoAccounts, regulars here)
    for (const a of dataset.insuranceAgents) {
        allUsers.push(a);
    }

    const total = allUsers.length;
    log.info(`Total users to seed: ${total}`);

    if (dryRun) {
        log.warn('DRY RUN — skipping all writes.');
        allUsers.forEach((u, i) => {
            log.progress(i + 1, total, `[DRY] ${u.role}: ${u.name} (${u.email})`);
            userMap[u.email] = {
                userId: `dry_${u.role}_${i}`, uuid: `dry-uuid-${i}`,
                role: u.role, name: u.name, specialty: u.specialty,
            };
        });
        return userMap;
    }

    // ── Batch-and-Pause Enrollment ───────────────────────────────────────────
    await batchAndPause(allUsers, async (user, index) => {
        try {
            // ── Idempotency: skip if email already exists ────────────────────
            const existing = findUserByEmail(user.email);
            if (existing) {
                log.skip(`${user.email} already in SQLite (userId=${existing.userId})`);
                userMap[user.email] = {
                    userId: existing.userId, uuid: existing.uuid,
                    role: existing.role, name: existing.name,
                    specialty: user.specialty,
                };
                stats.skipped++;
                return;
            }

            // ── Admin accounts: link to existing bootstrap identities ────────
            if (user.fabricUserId) {
                const walletExists = await identityExists(user.fabricUserId);
                if (!walletExists) {
                    log.error(`Bootstrap identity "${user.fabricUserId}" not found. Run server bootstrap first.`);
                    stats.failed++;
                    return;
                }

                // Read existing uuid from _userMeta.json
                const { getUserMeta } = require('../../fabric/identityManager');
                const meta = getUserMeta(user.fabricUserId);
                const uuid = meta?.uuid || crypto.randomUUID();
                const orgName = ROLE_CONFIG[user.role]?.org || 'Org1';

                createSyntheticUser({
                    name: user.name, email: user.email, passwordHash,
                    userId: user.fabricUserId, uuid, role: user.role, orgName,
                });

                log.progress(index + 1, total, `${user.role}: ${user.name} → linked to ${user.fabricUserId}`);
                userMap[user.email] = {
                    userId: user.fabricUserId, uuid, role: user.role,
                    name: user.name, specialty: user.specialty,
                };
                stats.enrolled++;
                return;
            }

            // ── Standard enrollment: Fabric CA + chaincode ───────────────────
            const userId = generateUserId(user.role);

            // Check wallet idempotency
            const walletExists = await identityExists(userId);
            if (walletExists) {
                log.skip(`Wallet identity "${userId}" already exists.`);
                stats.skipped++;
                return;
            }

            const roleConfig = ROLE_CONFIG[user.role];
            const orgName = roleConfig.org;
            const adminLabel = ORG_CONFIG[orgName].adminIdentity;

            // Register & enroll with Fabric CA
            const { uuid, mspId } = await registerAndEnrollUser({
                userId, role: roleConfig.chaincodeRole, orgName, adminLabel,
            });

            // Chaincode onboarding (if applicable)
            if (roleConfig.chaincodeOnboard) {
                let onboardArgs = {};
                if (user.role === 'patient') {
                    onboardArgs = {
                        patientId: uuid, name: user.name,
                        dob: user.dob || '', city: user.city || '',
                    };
                } else if (user.role === 'doctor') {
                    onboardArgs = {
                        doctorId: uuid, name: user.name,
                        hospitalName: user.hospitalName || 'Default Hospital',
                        city: user.city || '',
                    };
                } else if (user.role === 'insuranceAgent') {
                    onboardArgs = {
                        agentId: uuid, name: user.name,
                        insuranceCompany: user.insuranceCompany || 'Default Insurance',
                        city: user.city || '',
                    };
                }

                const { gateway, contract } = await connectGateway(
                    roleConfig.onboardIdentity, roleConfig.org
                );
                try {
                    await contract.submitTransaction(
                        roleConfig.chaincodeOnboard,
                        JSON.stringify(onboardArgs)
                    );
                } finally {
                    gateway.disconnect();
                }
            }

            // Store in SQLite
            createSyntheticUser({
                name: user.name, email: user.email, passwordHash,
                userId, uuid, role: user.role, orgName,
            });

            log.progress(index + 1, total, `${user.role}: ${user.name} (${userId})`);
            userMap[user.email] = {
                userId, uuid, role: user.role, name: user.name,
                specialty: user.specialty, isShowcase: user.isShowcase,
                isOutlier: user.isOutlier, showcaseConditions: user.showcaseConditions,
                targetRecords: user.targetRecords, claimProbability: user.claimProbability,
            };
            stats.enrolled++;

        } catch (err) {
            log.error(`Failed to seed ${user.email}: ${err.message}`);
            stats.failed++;
        }
    }, {
        batchSize: 8,
        itemDelayMs: 350,
        batchPauseMs: 2000,
        onBatchComplete: (batch, totalBatches) => {
            log.info(`Batch ${batch}/${totalBatches} complete. Pausing...`);
        },
    });

    log.success(`Enrollment complete: ${stats.enrolled} enrolled, ${stats.skipped} skipped, ${stats.failed} failed.`);
    return userMap;
};

module.exports = { seedUsers };
