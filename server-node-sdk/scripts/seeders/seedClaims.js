'use strict';

// ─── Insurance Claims Seeder ─────────────────────────────────────────────────
// Seeds insurance policies, claims, and claim decisions via chaincode.
// Implements: realistic distribution (60% approved, 25% rejected, 15% pending).
//
// IMPORTANT: Claims reference real recordIds fetched from the ledger — NOT the
// parsed response from addRecord (which may have used fallback IDs).

const { connectGateway } = require('../../fabric/networkConnection');
const { throttledForEach } = require('../utils/throttle');
const { sleep } = require('../utils/throttle');
const { createLogger } = require('../utils/logger');
const { generatePolicy, generateClaim, generateClaimDecision, pickRandom } = require('../generators/dataGenerator');

const log = createLogger('Claims');

/**
 * Fetch real record keys from the ledger for a patient.
 * This is critical because seedRecords may have stored fallback IDs.
 * @param {string} userId – Patient's wallet identity
 * @param {string} patientUUID
 * @returns {Array<string>} Array of real record IDs/keys from chaincode
 */
const fetchRealRecordKeys = async (userId, patientUUID) => {
    try {
        const { gateway, contract } = await connectGateway(userId, 'Org1');
        try {
            const result = await contract.evaluateTransaction(
                'getAllRecordsByPatientId',
                JSON.stringify({ patientId: patientUUID })
            );
            const parsed = JSON.parse(result.toString());

            // The chaincode may return an array of records or an array of {Key, Record}
            if (Array.isArray(parsed)) {
                return parsed.map(r => {
                    // Handle {Key: '...', Record: {...}} format
                    if (r.Key) return r.Key;
                    if (r.key) return r.key;
                    // Handle direct record objects with recordId
                    if (r.recordId) return r.recordId;
                    // Handle composite key format
                    if (r.Record?.recordId) return r.Record.recordId;
                    return null;
                }).filter(Boolean);
            }
            return [];
        } finally {
            gateway.disconnect();
        }
    } catch (err) {
        log.error(`Failed to fetch records for patient ${patientUUID}: ${err.message}`);
        return [];
    }
};

/**
 * Seed insurance policies and claims.
 *
 * Pipeline:
 *   1. Issue policies for patients (1-2 per patient, some have 0)
 *   2. Fetch REAL record keys from ledger (not fallback IDs)
 *   3. Create claims against policies using real record references
 *   4. Process claim decisions (approve/reject/leave pending)
 *
 * @param {Object} userMap
 * @param {Object} recordsByPatient – { patientUUID: [{ recordId }] } (may contain fallback IDs)
 * @param {boolean} dryRun
 * @returns {Object} stats
 */
const seedClaims = async (userMap, recordsByPatient, dryRun = false) => {
    log.header('PHASE 4: INSURANCE POLICIES & CLAIMS');

    // ── Collect agents and patients ──────────────────────────────────────────
    const agents = [];
    const patients = [];

    for (const [email, info] of Object.entries(userMap)) {
        if (info.role === 'insuranceAgent') agents.push({ email, ...info });
        if (info.role === 'patient') patients.push({ email, ...info });
    }

    if (agents.length === 0) {
        log.error('No insurance agents found. Skipping claims.');
        return { policies: 0, claims: 0, decisions: 0 };
    }

    log.info(`Agents: ${agents.length}, Patients: ${patients.length}`);

    const stats = { policies: 0, claims: 0, decisions: 0, failed: 0 };

    if (dryRun) {
        log.warn('DRY RUN — skipping all writes.');
        return stats;
    }

    // ── Phase 4a: Issue Policies ─────────────────────────────────────────────
    log.info('Issuing insurance policies...');

    const policyMap = {}; // patientUUID → [{ policyId, coverageAmount }]

    // ~70% of patients get policies
    const patientsWithPolicies = patients.filter(() => Math.random() < 0.70);

    await throttledForEach(patientsWithPolicies, async (patient, index) => {
        const numPolicies = patient.isShowcase ? 2 : (Math.random() < 0.3 ? 2 : 1);
        const agent = agents[index % agents.length];

        for (let p = 0; p < numPolicies; p++) {
            try {
                const policy = generatePolicy();

                const { gateway, contract } = await connectGateway(
                    agent.userId, 'Org2'
                );

                try {
                    const result = await contract.submitTransaction('issueInsurance', JSON.stringify({
                        patientId: patient.uuid,
                        coverageAmount: policy.coverageAmount,
                        policyType: policy.policyType,
                        validFrom: policy.validFrom,
                        validTo: policy.validTo,
                    }));

                    let parsed;
                    try { parsed = JSON.parse(result.toString()); } catch { parsed = {}; }

                    const policyId = parsed.policyId || parsed.key || parsed.Key || `policy_${index}_${p}`;

                    if (!policyMap[patient.uuid]) policyMap[patient.uuid] = [];
                    policyMap[patient.uuid].push({
                        policyId,
                        coverageAmount: policy.coverageAmount,
                        agentUserId: agent.userId,
                    });

                    stats.policies++;
                } finally {
                    gateway.disconnect();
                }
            } catch (err) {
                log.error(`Policy failed for ${patient.email}: ${err.message}`);
                stats.failed++;
            }
        }

        if ((index + 1) % 10 === 0 || index === patientsWithPolicies.length - 1) {
            log.progress(index + 1, patientsWithPolicies.length,
                `Policies issued for ${patient.email}`);
        }
    }, 250);

    log.success(`Policies issued: ${stats.policies}`);

    // ── Phase 4b: Fetch REAL Record Keys ─────────────────────────────────────
    // The recordsByPatient from seedRecords may contain fallback IDs like "rec_0"
    // that don't exist on the ledger. We MUST fetch real keys from the chaincode.
    log.info('Fetching real record keys from ledger for claim references...');

    const realRecordsByPatient = {}; // patientUUID → [realRecordKey]

    for (const [patientUUID, policies] of Object.entries(policyMap)) {
        const patient = patients.find(p => p.uuid === patientUUID);
        if (!patient) continue;

        const realKeys = await fetchRealRecordKeys(patient.userId, patientUUID);
        if (realKeys.length > 0) {
            realRecordsByPatient[patientUUID] = realKeys;
        }
        await sleep(200); // Throttle ledger queries
    }

    const patientsWithRecords = Object.keys(realRecordsByPatient).length;
    log.success(`Fetched real record keys for ${patientsWithRecords} patients.`);

    // ── Phase 4c: Create Claims ──────────────────────────────────────────────
    log.info('Creating insurance claims...');

    const claimsList = []; // { patientUUID, claimId, agentUserId }

    for (const [patientUUID, policies] of Object.entries(policyMap)) {
        const realRecords = realRecordsByPatient[patientUUID] || [];
        if (realRecords.length === 0 || policies.length === 0) continue;

        const patient = patients.find(p => p.uuid === patientUUID);
        if (!patient) continue;

        // Determine claim count based on probability
        let numClaims;
        if (patient.claimProbability === 'high' || patient.isShowcase) {
            numClaims = Math.floor(Math.random() * 3) + 2; // 2-4
        } else if (patient.claimProbability === 'medium') {
            numClaims = Math.floor(Math.random() * 2) + 1; // 1-2
        } else {
            numClaims = Math.random() < 0.3 ? 1 : 0; // 30% chance of 1
        }

        numClaims = Math.min(numClaims, realRecords.length);

        for (let c = 0; c < numClaims; c++) {
            try {
                const policy = policies[c % policies.length];
                const recordId = realRecords[c % realRecords.length];
                const claim = generateClaim(policy.coverageAmount);

                const { gateway, contract } = await connectGateway(
                    patient.userId, 'Org1'
                );

                try {
                    const result = await contract.submitTransaction('createClaim', JSON.stringify({
                        patientId: patient.uuid,
                        policyId: policy.policyId,
                        recordId: recordId,
                        claimAmount: claim.claimAmount,
                        description: claim.description,
                    }));

                    let parsed;
                    try { parsed = JSON.parse(result.toString()); } catch { parsed = {}; }

                    const claimId = parsed.claimId || parsed.key || parsed.Key || `claim_${stats.claims}`;

                    claimsList.push({
                        patientUUID: patient.uuid,
                        claimId,
                        agentUserId: policy.agentUserId,
                        patientEmail: patient.email,
                    });

                    stats.claims++;
                } finally {
                    gateway.disconnect();
                }
            } catch (err) {
                log.error(`Claim failed for ${patient.email}: ${err.message}`);
                stats.failed++;
            }
        }
    }

    log.success(`Claims created: ${stats.claims}`);

    // ── Phase 4d: Process Claim Decisions ────────────────────────────────────
    log.info('Processing claim decisions...');

    await throttledForEach(claimsList, async (claimItem, index) => {
        const decision = generateClaimDecision();
        if (!decision) {
            // Leave pending (~15%)
            return;
        }

        try {
            const { gateway, contract } = await connectGateway(
                claimItem.agentUserId, 'Org2'
            );

            try {
                await contract.submitTransaction('approveClaim', JSON.stringify({
                    patientId: claimItem.patientUUID,
                    claimId: claimItem.claimId,
                    decision: decision.decision,
                    reason: decision.reason,
                }));

                stats.decisions++;
                if ((index + 1) % 10 === 0 || index === claimsList.length - 1) {
                    log.progress(index + 1, claimsList.length,
                        `${decision.decision}: ${claimItem.patientEmail}`);
                }
            } finally {
                gateway.disconnect();
            }
        } catch (err) {
            log.error(`Decision failed for claim ${claimItem.claimId}: ${err.message}`);
            stats.failed++;
        }
    }, 200);

    log.success(`Decisions processed: ${stats.decisions}. Failed: ${stats.failed}`);
    return stats;
};

module.exports = { seedClaims };
