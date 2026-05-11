'use strict';

// ─── Consent Seeder ──────────────────────────────────────────────────────────
// Generates realistic doctor-patient consent relationships via grantAccess
// chaincode. Includes one revocation edge case for demo purposes.

const { connectGateway } = require('../../fabric/networkConnection');
const { ROLE_CONFIG } = require('../../fabric/constants');
const { throttledForEach } = require('../utils/throttle');
const { createLogger } = require('../utils/logger');
const { pickRandomN } = require('../generators/dataGenerator');

const log = createLogger('Consents');

/**
 * Seed consent relationships between patients and doctors.
 *
 * Strategy:
 *   - Each patient grants access to 1-3 doctors
 *   - Showcase patients grant access to more doctors (3-4)
 *   - Demo patient always grants access to demo doctor
 *   - Outlier doctor accumulates many patients
 *   - One revocation edge case: grant then revoke
 *
 * @param {Object} userMap – { email: { userId, uuid, role, ... } }
 * @param {boolean} dryRun
 * @returns {Object} { consentPairs, revocationCase, stats }
 */
const seedConsents = async (userMap, dryRun = false) => {
    log.header('PHASE 2: CONSENT RELATIONSHIPS');

    // ── Collect patients and doctors from userMap ─────────────────────────────
    const patients = [];
    const doctors = [];

    for (const [email, info] of Object.entries(userMap)) {
        if (info.role === 'patient') patients.push({ email, ...info });
        if (info.role === 'doctor') doctors.push({ email, ...info });
    }

    if (doctors.length === 0) {
        log.error('No doctors found in userMap. Cannot seed consents.');
        return { consentPairs: [], revocationCase: null, stats: { granted: 0, revoked: 0 } };
    }

    log.info(`Patients: ${patients.length}, Doctors: ${doctors.length}`);

    const consentPairs = [];
    const stats = { granted: 0, revoked: 0, skipped: 0, failed: 0 };

    // ── Build consent plan ───────────────────────────────────────────────────
    const consentPlan = [];

    // Find demo doctor and demo patient
    const demoDoctor = doctors.find(d => d.email === 'demo.doctor@ehr.com');
    const demoPatient = patients.find(p => p.email === 'demo.patient@ehr.com');

    for (const patient of patients) {
        // Determine how many doctors to authorize
        let numDoctors;
        if (patient.isShowcase) {
            numDoctors = Math.min(doctors.length, Math.floor(Math.random() * 2) + 3); // 3-4
        } else {
            numDoctors = Math.min(doctors.length, Math.floor(Math.random() * 3) + 1); // 1-3
        }

        // Pick random doctors
        let selectedDoctors = pickRandomN(doctors, numDoctors);

        // Ensure demo patient always has demo doctor
        if (patient.email === 'demo.patient@ehr.com' && demoDoctor) {
            if (!selectedDoctors.find(d => d.email === 'demo.doctor@ehr.com')) {
                selectedDoctors[0] = demoDoctor;
            }
        }

        // Ensure showcase patients have outlier doctor
        const outlierDoc = doctors.find(d => d.isOutlier);
        if (patient.isShowcase && outlierDoc) {
            if (!selectedDoctors.find(d => d.email === outlierDoc.email)) {
                selectedDoctors.push(outlierDoc);
            }
        }

        for (const doctor of selectedDoctors) {
            consentPlan.push({
                patientUserId: patient.userId,
                patientUUID: patient.uuid,
                doctorUUID: doctor.uuid,
                patientEmail: patient.email,
                doctorEmail: doctor.email,
            });
        }
    }

    log.info(`Consent relationships planned: ${consentPlan.length}`);

    if (dryRun) {
        log.warn('DRY RUN — skipping all writes.');
        consentPlan.forEach((c, i) => {
            log.progress(i + 1, consentPlan.length, `[DRY] ${c.patientEmail} → ${c.doctorEmail}`);
        });
        return { consentPairs: consentPlan, revocationCase: null, stats };
    }

    // ── Execute grantAccess transactions ─────────────────────────────────────
    await throttledForEach(consentPlan, async (consent, index) => {
        try {
            const { gateway, contract } = await connectGateway(
                consent.patientUserId, 'Org1'
            );

            try {
                await contract.submitTransaction('grantAccess', JSON.stringify({
                    patientId: consent.patientUUID,
                    doctorIdToGrant: consent.doctorUUID,
                }));

                consentPairs.push(consent);
                stats.granted++;
                log.progress(index + 1, consentPlan.length,
                    `Grant: ${consent.patientEmail} → ${consent.doctorEmail}`);
            } finally {
                gateway.disconnect();
            }
        } catch (err) {
            // May fail if consent already exists (idempotent-safe)
            if (err.message && err.message.includes('already')) {
                log.skip(`Consent already exists: ${consent.patientEmail} → ${consent.doctorEmail}`);
                consentPairs.push(consent);
                stats.skipped++;
            } else {
                log.error(`Grant failed: ${consent.patientEmail} → ${consent.doctorEmail}: ${err.message}`);
                stats.failed++;
            }
        }
    }, 300);

    // ── Revocation Edge Case ─────────────────────────────────────────────────
    // Pick the last patient who has a non-demo doctor, grant then revoke
    let revocationCase = null;
    const revocationPatient = patients.find(p =>
        p.email !== 'demo.patient@ehr.com' && !p.isShowcase
    );
    const revocationDoctor = doctors.find(d =>
        d.email !== 'demo.doctor@ehr.com' && !d.isOutlier
    );

    if (revocationPatient && revocationDoctor) {
        log.info(`Setting up revocation edge case: ${revocationPatient.email} ↛ ${revocationDoctor.email}`);
        try {
            // First ensure consent exists
            const { gateway: gw1, contract: c1 } = await connectGateway(
                revocationPatient.userId, 'Org1'
            );
            try {
                await c1.submitTransaction('grantAccess', JSON.stringify({
                    patientId: revocationPatient.uuid,
                    doctorIdToGrant: revocationDoctor.uuid,
                }));
            } catch { /* may already be granted */ } finally {
                gw1.disconnect();
            }

            // Now revoke
            const { gateway: gw2, contract: c2 } = await connectGateway(
                revocationPatient.userId, 'Org1'
            );
            try {
                await c2.submitTransaction('revokeAccess', JSON.stringify({
                    patientId: revocationPatient.uuid,
                    doctorIdToRevoke: revocationDoctor.uuid,
                }));
                revocationCase = {
                    patientEmail: revocationPatient.email,
                    patientUUID: revocationPatient.uuid,
                    doctorEmail: revocationDoctor.email,
                    doctorUUID: revocationDoctor.uuid,
                    doctorUserId: revocationDoctor.userId,
                };
                stats.revoked++;
                log.success(`Revocation set: ${revocationPatient.email} revoked access from ${revocationDoctor.email}`);
            } finally {
                gw2.disconnect();
            }
        } catch (err) {
            log.error(`Revocation edge case failed: ${err.message}`);
        }
    }

    log.success(`Consents: ${stats.granted} granted, ${stats.revoked} revoked, ${stats.skipped} skipped, ${stats.failed} failed.`);
    return { consentPairs, revocationCase, stats };
};

module.exports = { seedConsents };
