'use strict';

const { enrollAdmin, registerAndEnrollUser, identityExists } = require('../fabric/identityManager');

/**
 * Auto-enroll Org1 & Org2 CA admins and their default operational identities
 * (Hospital01, insuranceCompany01) on server startup.
 *
 * These operational identities are required to submit chaincode onboarding
 * transactions for doctors and insurance agents respectively.
 */
const bootstrapAdmins = async () => {
    console.log('[Bootstrap] Starting admin auto-enrollment...');

    // ── Step 1: Enroll Org1 CA admin (hospitalAdmin) ─────────────────────────
    try {
        await enrollAdmin('Org1');
    } catch (err) {
        console.error('[Bootstrap] Org1 admin enrollment failed:', err.message);
        console.warn('[Bootstrap] Doctor/Patient signup will not work until Org1 CA is available.');
    }

    // ── Step 2: Enroll Org2 CA admin (insuranceAdmin) ────────────────────────
    try {
        await enrollAdmin('Org2');
    } catch (err) {
        console.error('[Bootstrap] Org2 admin enrollment failed:', err.message);
        console.warn('[Bootstrap] Insurance signup will not work until Org2 CA is available.');
    }

    // ── Step 3: Register default Hospital identity (Hospital01) ──────────────
    // Required by onboardDoctor chaincode (needs role='hospital' caller)
    try {
        const exists = await identityExists('Hospital01');
        if (!exists) {
            await registerAndEnrollUser({
                userId: 'Hospital01',
                role: 'hospital',
                orgName: 'Org1',
                adminLabel: 'hospitalAdmin',
            });
            console.log('[Bootstrap] Registered default hospital identity "Hospital01"');
        } else {
            console.log('[Bootstrap] Hospital01 already in wallet — skipped.');
        }
    } catch (err) {
        console.error('[Bootstrap] Hospital01 registration failed:', err.message);
    }

    // ── Step 4: Register default InsuranceCompany identity ───────────────────
    // Required by onboardInsurance chaincode (needs role='insuranceAdmin' caller)
    try {
        const exists = await identityExists('insuranceCompany01');
        if (!exists) {
            await registerAndEnrollUser({
                userId: 'insuranceCompany01',
                role: 'insuranceAdmin',
                orgName: 'Org2',
                adminLabel: 'insuranceAdmin',
            });
            console.log('[Bootstrap] Registered default insurance identity "insuranceCompany01"');
        } else {
            console.log('[Bootstrap] insuranceCompany01 already in wallet — skipped.');
        }
    } catch (err) {
        console.error('[Bootstrap] insuranceCompany01 registration failed:', err.message);
    }

    console.log('[Bootstrap] Admin auto-enrollment complete.');
};

module.exports = { bootstrapAdmins };
