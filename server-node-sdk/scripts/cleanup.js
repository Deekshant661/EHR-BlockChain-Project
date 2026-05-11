'use strict';

// ─── Synthetic Data Cleanup Script ───────────────────────────────────────────
// Removes all synthetic users and their file metadata from SQLite.
// Removes synthetic wallet identities from the filesystem wallet.
//
// NOTE: Blockchain ledger data is immutable and cannot be removed.
// Re-seeding after cleanup will create new UUIDs/identities.
//
// Usage: node scripts/cleanup.js

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');

const { initDatabase, deleteSyntheticFiles, deleteSyntheticUsers, getAllUsers, countSyntheticUsers } = require('../db/database');
const { WALLET_PATH } = require('../fabric/constants');
const { createLogger } = require('./utils/logger');

const log = createLogger('Cleanup');

const main = async () => {
    log.header('EHR BLOCKCHAIN — SYNTHETIC DATA CLEANUP');

    // Initialize DB
    initDatabase();

    // Check current state
    const syntheticCount = countSyntheticUsers();
    if (syntheticCount === 0) {
        log.info('No synthetic users found. Nothing to clean up.');
        return;
    }

    log.info(`Found ${syntheticCount} synthetic users to remove.`);

    // ── Get synthetic user IDs before deletion (for wallet cleanup) ──────────
    const syntheticUsers = getAllUsers().filter(u => u.isSynthetic === 1);
    const syntheticUserIds = syntheticUsers.map(u => u.userId);

    // ── Delete file metadata first (foreign key dependency) ──────────────────
    const filesDeleted = deleteSyntheticFiles();
    log.success(`Deleted ${filesDeleted} synthetic file metadata entries.`);

    // ── Delete synthetic users ───────────────────────────────────────────────
    const usersDeleted = deleteSyntheticUsers();
    log.success(`Deleted ${usersDeleted} synthetic users from SQLite.`);

    // ── Clean wallet identities ──────────────────────────────────────────────
    let walletsRemoved = 0;
    for (const userId of syntheticUserIds) {
        // Skip bootstrap identities — never delete these
        if (['hospitalAdmin', 'insuranceAdmin', 'Hospital01', 'insuranceCompany01'].includes(userId)) {
            log.skip(`Preserving bootstrap identity: ${userId}`);
            continue;
        }

        const walletDir = path.join(WALLET_PATH, userId + '.id');
        if (fs.existsSync(walletDir)) {
            fs.unlinkSync(walletDir);
            walletsRemoved++;
        }
    }
    log.success(`Removed ${walletsRemoved} wallet identities.`);

    // ── Clean _userMeta.json ─────────────────────────────────────────────────
    const metaPath = path.join(WALLET_PATH, '_userMeta.json');
    if (fs.existsSync(metaPath)) {
        try {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            let cleaned = 0;
            for (const userId of syntheticUserIds) {
                if (['hospitalAdmin', 'insuranceAdmin', 'Hospital01', 'insuranceCompany01'].includes(userId)) {
                    continue;
                }
                if (meta[userId]) {
                    delete meta[userId];
                    cleaned++;
                }
            }
            fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
            log.success(`Cleaned ${cleaned} entries from _userMeta.json.`);
        } catch (err) {
            log.error(`Failed to clean _userMeta.json: ${err.message}`);
        }
    }

    // ── Clean exported credentials file ──────────────────────────────────────
    const credPath = path.join(__dirname, '..', 'synthetic_users.json');
    if (fs.existsSync(credPath)) {
        fs.unlinkSync(credPath);
        log.success('Removed synthetic_users.json.');
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    log.header('CLEANUP COMPLETE');
    log.info(`Users removed:   ${usersDeleted}`);
    log.info(`Files removed:   ${filesDeleted}`);
    log.info(`Wallets removed: ${walletsRemoved}`);
    log.warn('Note: Blockchain ledger data is immutable and remains on-chain.');
    log.info('You can now re-run: node scripts/seed.js');
};

main().catch((err) => {
    console.error('\n[Cleanup] FATAL ERROR:', err);
    process.exit(1);
});
