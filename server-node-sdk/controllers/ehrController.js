'use strict';

const { submitTransaction, evaluateTransaction } = require('../services/transactionService');
const { sendSuccess } = require('../middleware/responseFormatter');

// ─── Medical Records ─────────────────────────────────────────────────────────

/** POST /api/ehr/addRecord */
const addRecord = async (req, res, next) => {
    try {
        const { userId } = req.user;
        const { patientId, diagnosis, prescription } = req.body;
        const result = await submitTransaction(userId, 'addRecord', { patientId, diagnosis, prescription });
        return sendSuccess(res, result);
    } catch (error) { next(error); }
};

/** POST /api/ehr/getAllRecordsByPatientId */
const getAllRecordsByPatientId = async (req, res, next) => {
    try {
        const { userId } = req.user;
        const { patientId } = req.body;
        const result = await evaluateTransaction(userId, 'getAllRecordsByPatientId', { patientId });
        return sendSuccess(res, result);
    } catch (error) { next(error); }
};

/** POST /api/ehr/getRecordById */
const getRecordById = async (req, res, next) => {
    try {
        const { userId } = req.user;
        const { patientId, recordId } = req.body;
        const result = await evaluateTransaction(userId, 'getRecordById', { patientId, recordId });
        return sendSuccess(res, result);
    } catch (error) { next(error); }
};

/** POST /api/ehr/getRecordsByDoctor */
const getRecordsByDoctor = async (req, res, next) => {
    try {
        const { userId } = req.user;
        const { doctorId } = req.body;
        const result = await evaluateTransaction(userId, 'getRecordsByDoctor', { doctorId });
        return sendSuccess(res, result);
    } catch (error) { next(error); }
};

/** POST /api/ehr/queryHistoryOfAsset */
const queryHistoryOfAsset = async (req, res, next) => {
    try {
        const { userId } = req.user;
        const { recordId } = req.body;
        const result = await evaluateTransaction(userId, 'queryHistoryOfAsset', { recordId });
        return sendSuccess(res, result);
    } catch (error) { next(error); }
};

// ─── Patient Management ──────────────────────────────────────────────────────

/** POST /api/ehr/getPatientById */
const getPatientById = async (req, res, next) => {
    try {
        const { userId } = req.user;
        const { patientId } = req.body;
        const result = await evaluateTransaction(userId, 'getPatientById', { patientId });
        return sendSuccess(res, result);
    } catch (error) { next(error); }
};

/** POST /api/ehr/getAllPatients */
const getAllPatients = async (req, res, next) => {
    try {
        const { userId } = req.user;
        const result = await evaluateTransaction(userId, 'getAllPatients', {});
        return sendSuccess(res, result);
    } catch (error) { next(error); }
};

// ─── Access Control ──────────────────────────────────────────────────────────

/** POST /api/ehr/grantAccess */
const grantAccess = async (req, res, next) => {
    try {
        const { userId } = req.user;
        const { patientId, doctorIdToGrant } = req.body;
        const result = await submitTransaction(userId, 'grantAccess', { patientId, doctorIdToGrant });
        return sendSuccess(res, result);
    } catch (error) { next(error); }
};

/** POST /api/ehr/revokeAccess */
const revokeAccess = async (req, res, next) => {
    try {
        const { userId } = req.user;
        const { patientId, doctorIdToRevoke } = req.body;
        const result = await submitTransaction(userId, 'revokeAccess', { patientId, doctorIdToRevoke });
        return sendSuccess(res, result);
    } catch (error) { next(error); }
};

// ─── Insurance ───────────────────────────────────────────────────────────────

/** POST /api/ehr/issueInsurance */
const issueInsurance = async (req, res, next) => {
    try {
        const { userId } = req.user;
        const { patientId, coverageAmount, policyType, validFrom, validTo } = req.body;
        const result = await submitTransaction(userId, 'issueInsurance', {
            patientId, coverageAmount, policyType, validFrom, validTo,
        });
        return sendSuccess(res, result);
    } catch (error) { next(error); }
};

/** POST /api/ehr/getPoliciesByPatient */
const getPoliciesByPatient = async (req, res, next) => {
    try {
        const { userId } = req.user;
        const { patientId } = req.body;
        const result = await evaluateTransaction(userId, 'getPoliciesByPatient', { patientId });
        return sendSuccess(res, result);
    } catch (error) { next(error); }
};

// ─── Claims ──────────────────────────────────────────────────────────────────

/** POST /api/ehr/createClaim */
const createClaim = async (req, res, next) => {
    try {
        const { userId } = req.user;
        const { patientId, policyId, recordId, claimAmount, description } = req.body;
        const result = await submitTransaction(userId, 'createClaim', {
            patientId, policyId, recordId, claimAmount, description,
        });
        return sendSuccess(res, result);
    } catch (error) { next(error); }
};

/** POST /api/ehr/getClaimInfo */
const getClaimInfo = async (req, res, next) => {
    try {
        const { userId } = req.user;
        const { patientId, claimId } = req.body;
        const result = await evaluateTransaction(userId, 'getClaimInfo', { patientId, claimId });
        return sendSuccess(res, result);
    } catch (error) { next(error); }
};

/** POST /api/ehr/getAllClaimsByPatient */
const getAllClaimsByPatient = async (req, res, next) => {
    try {
        const { userId } = req.user;
        const { patientId } = req.body;
        const result = await evaluateTransaction(userId, 'getAllClaimsByPatient', { patientId });
        return sendSuccess(res, result);
    } catch (error) { next(error); }
};

/** POST /api/ehr/approveClaim */
const approveClaim = async (req, res, next) => {
    try {
        const { userId } = req.user;
        const { patientId, claimId, decision, reason } = req.body;
        const result = await submitTransaction(userId, 'approveClaim', {
            patientId, claimId, decision, reason,
        });
        return sendSuccess(res, result);
    } catch (error) { next(error); }
};

// ─── Ledger ──────────────────────────────────────────────────────────────────

/** POST /api/ehr/fetchLedger */
const fetchLedger = async (req, res, next) => {
    try {
        const { userId } = req.user;
        const result = await evaluateTransaction(userId, 'fetchLedger', {});
        return sendSuccess(res, result);
    } catch (error) { next(error); }
};

module.exports = {
    addRecord,
    getAllRecordsByPatientId,
    getRecordById,
    getRecordsByDoctor,
    queryHistoryOfAsset,
    getPatientById,
    getAllPatients,
    grantAccess,
    revokeAccess,
    issueInsurance,
    getPoliciesByPatient,
    createClaim,
    getClaimInfo,
    getAllClaimsByPatient,
    approveClaim,
    fetchLedger,
};
