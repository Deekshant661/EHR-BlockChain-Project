'use strict';

// ─── Medical Records Seeder ──────────────────────────────────────────────────
// Creates realistic medical records via addRecord chaincode transactions.
// Implements: specialty-weighted diagnoses, variable record counts,
// showcase patient enrichment, analytics outlier doctor activity.

const { connectGateway } = require('../../fabric/networkConnection');
const { throttledForEach } = require('../utils/throttle');
const { createLogger } = require('../utils/logger');
const { getSpecialtyDiagnosis, generateBellCurveTimestamp } = require('../generators/dataGenerator');

const log = createLogger('Records');

/**
 * Seed medical records for all patients via authorized doctors.
 *
 * Strategy:
 *   - Uses consent pairs to determine which doctor writes which patient's records
 *   - Showcase patients get 12-15 records across multiple specialties
 *   - Regular patients get 5-15 records (weighted by targetRecords)
 *   - Outlier doctor writes more records than others
 *   - Diagnoses are weighted by doctor specialty
 *
 * @param {Object} userMap
 * @param {Array} consentPairs – [{ patientUUID, doctorUUID, doctorEmail, patientEmail }]
 * @param {boolean} dryRun
 * @returns {Object} { recordsByPatient, stats }
 */
const seedRecords = async (userMap, consentPairs, dryRun = false) => {
    log.header('PHASE 3: MEDICAL RECORDS');

    // ── Build doctor lookup ──────────────────────────────────────────────────
    const doctorMap = {};
    const patientMap = {};
    for (const [email, info] of Object.entries(userMap)) {
        if (info.role === 'doctor') doctorMap[info.uuid] = { email, ...info };
        if (info.role === 'patient') patientMap[info.uuid] = { email, ...info };
    }

    // ── Build patient→doctors mapping from consent pairs ─────────────────────
    const patientDoctors = {}; // patientUUID → [{ doctorUUID, doctorUserId, specialty, ... }]
    for (const pair of consentPairs) {
        if (!patientDoctors[pair.patientUUID]) {
            patientDoctors[pair.patientUUID] = [];
        }
        const doc = doctorMap[pair.doctorUUID];
        if (doc) {
            patientDoctors[pair.patientUUID].push(doc);
        }
    }

    // ── Build record plan ────────────────────────────────────────────────────
    const recordPlan = [];

    for (const [patientUUID, doctors] of Object.entries(patientDoctors)) {
        if (doctors.length === 0) continue;

        const patient = patientMap[patientUUID];
        if (!patient) continue;

        // Determine record count
        let numRecords;
        if (patient.isShowcase) {
            numRecords = Math.floor(Math.random() * 4) + 12; // 12-15
        } else {
            numRecords = patient.targetRecords || (Math.floor(Math.random() * 6) + 5); // 5-10
        }

        for (let i = 0; i < numRecords; i++) {
            // Pick a doctor (weighted: outlier doctor gets more)
            let doctor;
            const outlier = doctors.find(d => d.isOutlier);
            if (outlier && Math.random() < 0.4) {
                doctor = outlier;
            } else {
                doctor = doctors[Math.floor(Math.random() * doctors.length)];
            }

            // Get specialty-weighted diagnosis
            const { diagnosis, prescription } = getSpecialtyDiagnosis(
                doctor.specialty || 'General Medicine'
            );

            recordPlan.push({
                doctorUserId: doctor.userId,
                doctorSpecialty: doctor.specialty,
                patientUUID,
                patientEmail: patient.email,
                diagnosis,
                prescription,
                timestamp: generateBellCurveTimestamp(),
            });
        }
    }

    log.info(`Medical records planned: ${recordPlan.length}`);

    const stats = { created: 0, failed: 0 };
    const recordsByPatient = {}; // patientUUID → [{ recordId, diagnosis, ... }]

    if (dryRun) {
        log.warn('DRY RUN — skipping all writes.');
        recordPlan.forEach((r, i) => {
            log.progress(i + 1, recordPlan.length, `[DRY] ${r.patientEmail}: ${r.diagnosis}`);
        });
        return { recordsByPatient, stats };
    }

    // ── Execute addRecord transactions ───────────────────────────────────────
    await throttledForEach(recordPlan, async (record, index) => {
        try {
            const { gateway, contract } = await connectGateway(
                record.doctorUserId, 'Org1'
            );

            try {
                const result = await contract.submitTransaction('addRecord', JSON.stringify({
                    patientId: record.patientUUID,
                    diagnosis: record.diagnosis,
                    prescription: record.prescription,
                }));

                let parsed;
                try { parsed = JSON.parse(result.toString()); } catch { parsed = {}; }

                const recordId = parsed.recordId || parsed.key || `rec_${index}`;

                if (!recordsByPatient[record.patientUUID]) {
                    recordsByPatient[record.patientUUID] = [];
                }
                recordsByPatient[record.patientUUID].push({
                    recordId,
                    diagnosis: record.diagnosis,
                    prescription: record.prescription,
                    doctorUserId: record.doctorUserId,
                });

                stats.created++;
                if ((index + 1) % 20 === 0 || index === recordPlan.length - 1) {
                    log.progress(index + 1, recordPlan.length,
                        `${record.patientEmail}: ${record.diagnosis}`);
                }
            } finally {
                gateway.disconnect();
            }
        } catch (err) {
            log.error(`Record failed for ${record.patientEmail}: ${err.message}`);
            stats.failed++;
        }
    }, 200);

    log.success(`Records: ${stats.created} created, ${stats.failed} failed.`);
    return { recordsByPatient, stats };
};

module.exports = { seedRecords };
