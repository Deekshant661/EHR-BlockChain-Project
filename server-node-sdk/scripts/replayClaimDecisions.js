'use strict';

// ─── Replay Claim Decisions ──────────────────────────────────────────────────
// Standalone script to process pending insurance claims WITHOUT full reseeding.
// Reads existing claims from the ledger, generates uppercase decisions, and
// submits them via approveClaim chaincode function.
//
// Usage: node scripts/replayClaimDecisions.js

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const { initDatabase } = require('../db/database');
const { connectGateway } = require('../fabric/networkConnection');
const { sleep } = require('./utils/throttle');
const { createLogger } = require('./utils/logger');
const { pickRandom } = require('./generators/dataGenerator');

const log = createLogger('Replay');

// ─── Decision Constants (MUST be uppercase for chaincode) ────────────────────
const DECISIONS = {
    APPROVED: {
        decision: 'APPROVED',
        reasons: [
            'All documentation verified and claim amount within policy coverage.',
            'Valid medical records submitted. Claim approved per policy terms.',
            'Hospital expenses verified. Approved for reimbursement.',
        ],
    },
    REJECTED: {
        decision: 'REJECTED',
        reasons: [
            'Pre-existing condition exclusion applies.',
            'Claim amount exceeds policy sub-limits.',
            'Insufficient supporting documentation provided.',
            'Waiting period not yet completed for this condition.',
        ],
    },
};

/**
 * Retry a function with delay between attempts.
 * @param {Function} fn – async function to retry
 * @param {number} maxRetries
 * @param {number} delayMs
 * @returns {*} Result of fn
 */
const retryWithDelay = async (fn, maxRetries = 3, delayMs = 500) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            if (attempt === maxRetries) throw err;
            log.warn(`Attempt ${attempt}/${maxRetries} failed. Retrying in ${delayMs}ms...`);
            await sleep(delayMs);
        }
    }
};

const main = async () => {
    const startTime = Date.now();
    log.header('REPLAY CLAIM DECISIONS');

    // ── Init ─────────────────────────────────────────────────────────────────
    initDatabase();

    // ── Load synthetic users ─────────────────────────────────────────────────
    const usersPath = path.join(__dirname, '..', 'synthetic_users.json');
    if (!fs.existsSync(usersPath)) {
        log.error('synthetic_users.json not found. Run full seed first.');
        process.exit(1);
    }

    const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    const agents = users.filter(u => u.role === 'insuranceAgent');
    if (agents.length === 0) {
        log.error('No insurance agents found in synthetic_users.json.');
        process.exit(1);
    }

    log.info(`Insurance agents available: ${agents.length}`);

    // ── Fetch ledger to find pending claims ──────────────────────────────────
    log.info('Fetching ledger to find pending claims...');

    // FIX: Use Hospital Admin (Org1) to query the ledger, as Insurance (Org2) is restricted
    // Wallet key is 'Hospital01', NOT the email address 'demo.admin@ehr.com'
    const hospitalAdminId = 'Hospital01';
    const { gateway, contract } = await connectGateway(hospitalAdminId, 'Org1');

    let ledger;
    try {
        const result = await contract.evaluateTransaction('fetchLedger', JSON.stringify({}));
        ledger = JSON.parse(result.toString());
    } catch (err) {
        log.error(`Ledger fetch failed: ${err.message}`);
        process.exit(1);
    } finally {
        gateway.disconnect();
    }

    if (!Array.isArray(ledger)) {
        log.error('Ledger fetch returned non-array. Check Fabric network.');
        process.exit(1);
    }

    // ── Find pending claims ──────────────────────────────────────────────────
    const pendingClaims = ledger.filter(entry => {
        const record = entry.Record || entry.record || {};
        return record.docType === 'claim' && (!record.status || record.status === 'pending' || record.status === 'PENDING');
    });

    log.info(`Total ledger entries: ${ledger.length}`);
    log.info(`Pending claims found: ${pendingClaims.length}`);

    if (pendingClaims.length === 0) {
        log.success('No pending claims to process. All claims already decided.');
        process.exit(0);
    }

    // ── Process decisions ────────────────────────────────────────────────────
    const stats = { approved: 0, rejected: 0, failed: 0, skipped: 0 };

    for (let i = 0; i < pendingClaims.length; i++) {
        const entry = pendingClaims[i];
        const record = entry.Record || entry.record || {};
        const claimKey = entry.Key || entry.key || '';
        const patientId = record.patientId || '';

        if (!patientId || !claimKey) {
            log.warn(`Skipping claim with missing patientId or key: ${claimKey}`);
            stats.skipped++;
            continue;
        }

        // Extract claimId from key (format: CLM-...)
        const claimId = claimKey;

        // 60/25/15 distribution: ~70% approved, ~30% rejected (15% were pending, now decided)
        const roll = Math.random();
        const decisionType = roll < 0.70 ? DECISIONS.APPROVED : DECISIONS.REJECTED;
        const reason = pickRandom(decisionType.reasons);

        const agentForClaim = agents[i % agents.length];

        try {
            await retryWithDelay(async () => {
                const { gateway: gw, contract: ct } = await connectGateway(
                    agentForClaim.userId, 'Org2'
                );
                try {
                    await ct.submitTransaction('approveClaim', JSON.stringify({
                        patientId,
                        claimId,
                        decision: decisionType.decision,
                        reason,
                    }));
                } finally {
                    gw.disconnect();
                }
            }, 3, 500);

            if (decisionType.decision === 'APPROVED') stats.approved++;
            else stats.rejected++;

            log.progress(i + 1, pendingClaims.length,
                `${decisionType.decision}: ${claimKey.slice(0, 20)}...`);

        } catch (err) {
            log.error(`Failed: ${claimKey.slice(0, 20)}... — ${err.message}`);
            stats.failed++;
        }

        // Throttle between decisions
        await sleep(250);
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    log.header('REPLAY COMPLETE');
    log.success(`Approved: ${stats.approved}`);
    log.success(`Rejected: ${stats.rejected}`);
    if (stats.failed > 0) log.error(`Failed: ${stats.failed}`);
    if (stats.skipped > 0) log.warn(`Skipped: ${stats.skipped}`);
    log.info(`Elapsed: ${elapsed}s`);
};

main().catch((err) => {
    console.error('\n[Replay] FATAL ERROR:', err);
    process.exit(1);
});
