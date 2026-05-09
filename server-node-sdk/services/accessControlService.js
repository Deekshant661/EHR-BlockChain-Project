'use strict';

const { evaluateTransaction } = require('./transactionService');

// ─── Constants ───────────────────────────────────────────────────────────────
const CONSENT_QUERY_TIMEOUT_MS = 5000; // 5 second timeout for Fabric queries

/**
 * Check whether a doctor has blockchain-backed consent to access a patient's data.
 *
 * Uses the existing chaincode function `getPatientById`, which internally
 * checks `authorizedDoctors.includes(callerId)` for doctor-role callers.
 * If the doctor is not authorized, the chaincode throws — we catch that
 * and return { allowed: false }.
 *
 * Security:
 *   - Uses evaluateTransaction() (READ-ONLY, no ordering/commit overhead)
 *   - Timeout protection via Promise.race (CONSENT_QUERY_TIMEOUT_MS)
 *   - FAIL CLOSED: any error/timeout → access denied
 *   - Never exposes raw Fabric errors to callers
 *
 * @param {string} doctorUserId – Doctor's Fabric wallet identity (from req.user.userId)
 * @param {string} patientUUID – Patient's blockchain UUID (from file metadata)
 * @returns {Promise<{ allowed: boolean, reason?: string }>}
 */
const checkDoctorConsent = async (doctorUserId, patientUUID) => {
    try {
        // Race the Fabric query against a timeout
        const queryPromise = evaluateTransaction(
            doctorUserId,
            'getPatientById',
            { patientId: patientUUID }
        );

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('CONSENT_TIMEOUT')), CONSENT_QUERY_TIMEOUT_MS)
        );

        const result = await Promise.race([queryPromise, timeoutPromise]);

        // If evaluateTransaction succeeds, the chaincode allowed the query
        // — meaning the doctor IS in authorizedDoctors[]
        console.log(`[AccessControl] Doctor ${doctorUserId} authorized for patient UUID ${patientUUID}`);
        return { allowed: true };

    } catch (err) {
        // ── Timeout ──────────────────────────────────────────────────────────
        if (err.message === 'CONSENT_TIMEOUT') {
            console.error(`[AccessControl] Consent query timed out for doctor ${doctorUserId}, patient ${patientUUID}`);
            return {
                allowed: false,
                reason: 'Authorization service unavailable. Please try again later.',
            };
        }

        // ── Chaincode authorization failure ──────────────────────────────────
        // The chaincode throws when doctor is not in authorizedDoctors[].
        // FAIL CLOSED: any Fabric error = access denied.
        // Never expose raw chaincode/Fabric SDK errors.
        console.log(`[AccessControl] Doctor ${doctorUserId} denied access to patient UUID ${patientUUID}`);
        return {
            allowed: false,
            reason: 'Access denied. Patient has not granted you authorization.',
        };
    }
};

module.exports = { checkDoctorConsent };
