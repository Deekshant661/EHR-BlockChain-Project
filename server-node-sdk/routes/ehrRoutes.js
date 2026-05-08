'use strict';

const express = require('express');
const router = express.Router();
const ehr = require('../controllers/ehrController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// ─── Medical Records ─────────────────────────────────────────────────────────
router.post('/addRecord',
    verifyToken, requireRole(['doctor']),
    ehr.addRecord);

router.post('/getAllRecordsByPatientId',
    verifyToken, requireRole(['doctor', 'hospital', 'patient']),
    ehr.getAllRecordsByPatientId);

router.post('/getRecordById',
    verifyToken, requireRole(['doctor', 'hospital', 'patient']),
    ehr.getRecordById);

router.post('/getRecordsByDoctor',
    verifyToken, requireRole(['doctor', 'hospital']),
    ehr.getRecordsByDoctor);

router.post('/queryHistoryOfAsset',
    verifyToken, requireRole(['doctor', 'hospital']),
    ehr.queryHistoryOfAsset);

// ─── Patient Management ──────────────────────────────────────────────────────
router.post('/getPatientById',
    verifyToken, requireRole(['doctor', 'hospital', 'patient']),
    ehr.getPatientById);

router.post('/getAllPatients',
    verifyToken, requireRole(['doctor', 'hospital']),
    ehr.getAllPatients);

// ─── Access Control ──────────────────────────────────────────────────────────
router.post('/grantAccess',
    verifyToken, requireRole(['patient']),
    ehr.grantAccess);

router.post('/revokeAccess',
    verifyToken, requireRole(['patient']),
    ehr.revokeAccess);

// ─── Insurance ───────────────────────────────────────────────────────────────
router.post('/issueInsurance',
    verifyToken, requireRole(['insuranceAgent', 'insuranceAdmin']),
    ehr.issueInsurance);

router.post('/getPoliciesByPatient',
    verifyToken, requireRole(['patient', 'insuranceAgent', 'insuranceAdmin']),
    ehr.getPoliciesByPatient);

// ─── Claims ──────────────────────────────────────────────────────────────────
router.post('/createClaim',
    verifyToken, requireRole(['patient']),
    ehr.createClaim);

router.post('/getClaimInfo',
    verifyToken, requireRole(['patient', 'insuranceAgent', 'insuranceAdmin']),
    ehr.getClaimInfo);

router.post('/getAllClaimsByPatient',
    verifyToken, requireRole(['patient', 'insuranceAgent', 'insuranceAdmin']),
    ehr.getAllClaimsByPatient);

router.post('/approveClaim',
    verifyToken, requireRole(['insuranceAgent']),
    ehr.approveClaim);

// ─── Ledger ──────────────────────────────────────────────────────────────────
router.post('/fetchLedger',
    verifyToken,
    ehr.fetchLedger);

module.exports = router;
