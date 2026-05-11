'use strict';

// ─── Master Seed Orchestrator ────────────────────────────────────────────────
// Runs the complete synthetic data pipeline in order.
// Supports: --dry-run mode, seed versioning, idempotency, credential export.
//
// Usage:
//   node scripts/seed.js            – Full seed
//   node scripts/seed.js --dry-run  – Preview without writing

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');

const { initDatabase, countSyntheticUsers, setSeedMeta, getSeedMeta } = require('../db/database');
const { generateDataset } = require('./generators/dataGenerator');
const { seedUsers } = require('./seeders/seedUsers');
const { seedConsents } = require('./seeders/seedConsents');
const { seedRecords } = require('./seeders/seedRecords');
const { seedClaims } = require('./seeders/seedClaims');
const { seedFiles } = require('./seeders/seedFiles');
const { createLogger, printSummary, printCredentials } = require('./utils/logger');

const log = createLogger('Main');

// ─── Seed Version ────────────────────────────────────────────────────────────
const SEED_VERSION = 'v1.0';

// ─── CLI Flags ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

/**
 * Export generated credentials to synthetic_users.json
 */
const exportCredentials = (userMap) => {
    const outputPath = path.join(__dirname, '..', 'synthetic_users.json');
    const credentials = [];

    for (const [email, info] of Object.entries(userMap)) {
        credentials.push({
            email,
            role: info.role,
            password: 'TestPassword123!',
            userId: info.userId,
            uuid: info.uuid,
            name: info.name,
        });
    }

    // Sort by role then email for readability
    credentials.sort((a, b) => {
        if (a.role !== b.role) return a.role.localeCompare(b.role);
        return a.email.localeCompare(b.email);
    });

    fs.writeFileSync(outputPath, JSON.stringify(credentials, null, 2));
    log.success(`Credentials exported to: ${outputPath}`);
    return credentials;
};

// ─── Main Pipeline ───────────────────────────────────────────────────────────
const main = async () => {
    const startTime = Date.now();

    log.header('EHR BLOCKCHAIN — SYNTHETIC DATA SEEDER');

    if (DRY_RUN) {
        log.warn('═══ DRY RUN MODE ═══ No data will be written.');
    }

    // ── Step 0: Initialize Database ──────────────────────────────────────────
    log.info('Initializing SQLite database...');
    initDatabase();

    // ── Idempotency Check ────────────────────────────────────────────────────
    const existingCount = countSyntheticUsers();
    if (existingCount > 0 && !DRY_RUN) {
        log.warn(`${existingCount} synthetic users already exist in database.`);
        log.info('Re-run will skip existing users (idempotent behavior).');
        log.info('To reset, run: node scripts/cleanup.js');
    }

    // ── Step 1: Generate Dataset ─────────────────────────────────────────────
    log.info('Generating synthetic healthcare dataset...');
    const dataset = generateDataset();
    log.success(`Dataset generated: ${dataset.patients.length} patients, ${dataset.doctors.length} doctors, ${dataset.insuranceAgents.length} agents, ${dataset.demoAccounts.length} demo accounts`);

    // ── Step 2: Seed Users (SQLite + Fabric CA + Chaincode) ──────────────────
    const userMap = await seedUsers(dataset, DRY_RUN);
    const userCount = Object.keys(userMap).length;
    log.success(`User map built: ${userCount} users`);

    // ── Step 3: Seed Consent Relationships ───────────────────────────────────
    const { consentPairs, revocationCase, stats: consentStats } = await seedConsents(userMap, DRY_RUN);
    log.success(`Consent pairs: ${consentPairs.length}`);

    // ── Step 4: Seed Medical Records ─────────────────────────────────────────
    const { recordsByPatient, stats: recordStats } = await seedRecords(userMap, consentPairs, DRY_RUN);
    log.success(`Records by patient: ${Object.keys(recordsByPatient).length} patients with records`);

    // ── Step 5: Seed Insurance Policies + Claims ─────────────────────────────
    const claimStats = await seedClaims(userMap, recordsByPatient, DRY_RUN);

    // ── Step 6: Seed File Metadata ───────────────────────────────────────────
    const fileStats = await seedFiles(userMap, consentPairs, DRY_RUN);

    // ── Step 7: Export Credentials ───────────────────────────────────────────
    if (!DRY_RUN) {
        exportCredentials(userMap);

        // Save seed metadata
        setSeedMeta('seedVersion', SEED_VERSION);
        setSeedMeta('seedDate', new Date().toISOString());
        setSeedMeta('userCount', String(userCount));
        log.success(`Seed metadata saved (version: ${SEED_VERSION})`);
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Count actual enrolled users by role
    let patientCount = 0, doctorCount = 0, agentCount = 0, adminCount = 0;
    for (const info of Object.values(userMap)) {
        if (info.role === 'patient') patientCount++;
        else if (info.role === 'doctor') doctorCount++;
        else if (info.role === 'insuranceAgent') agentCount++;
        else adminCount++;
    }

    printSummary({
        patients: patientCount,
        doctors: doctorCount,
        insuranceAgents: agentCount,
        admins: adminCount,
        consents: consentStats.granted,
        revocations: consentStats.revoked,
        records: recordStats.created,
        policies: claimStats.policies,
        claims: claimStats.claims,
        files: fileStats.files,
        elapsed,
    });

    // Print demo credentials
    const demoCreds = [
        { role: 'Patient', email: 'demo.patient@ehr.com' },
        { role: 'Doctor', email: 'demo.doctor@ehr.com' },
        { role: 'Insurance Agent', email: 'demo.insurance@ehr.com' },
        { role: 'Hospital Admin', email: 'demo.admin@ehr.com' },
        { role: 'Insurance Admin', email: 'demo.insuranceadmin@ehr.com' },
    ];
    printCredentials(demoCreds);

    // Print revocation case
    if (revocationCase) {
        log.info(`Revocation demo: Doctor "${revocationCase.doctorEmail}" was REVOKED from patient "${revocationCase.patientEmail}"`);
        log.info(`  → Login as doctor, attempt to access patient files → expect 403 denial`);
    }

    if (DRY_RUN) {
        log.warn('═══ DRY RUN COMPLETE — No data was written. ═══');
    }
};

// ─── Run ─────────────────────────────────────────────────────────────────────
main().catch((err) => {
    console.error('\n[Seed] FATAL ERROR:', err);
    process.exit(1);
});
