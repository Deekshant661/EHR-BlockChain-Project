'use strict';

const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { upload, getByPatient } = require('../controllers/fileController');

// ─── Multer Configuration ────────────────────────────────────────────────────
// Memory storage — file stays in buffer, never written to disk as plaintext
const storage = multer.memoryStorage();
const uploadMiddleware = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ─── Upload Rate Limiter ─────────────────────────────────────────────────────
// 10 uploads per minute per user (keyed by JWT userId)
const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: (req) => req.user?.userId || req.ip,
    message: {
        success: false,
        message: 'Too many uploads. Please wait before uploading again (limit: 10/minute).',
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting if user is not authenticated (auth middleware will reject anyway)
    skip: (req) => !req.user,
});

// ─── Routes ──────────────────────────────────────────────────────────────────

// POST /api/files/upload — Encrypt & upload medical file to IPFS
// Protected: JWT + RBAC (patient, doctor) + rate limit
router.post(
    '/upload',
    verifyToken,
    requireRole(['patient', 'doctor']),
    uploadLimiter,
    uploadMiddleware.single('file'),
    upload
);

// POST /api/files/getByPatient — List uploaded file metadata
// Protected: JWT + RBAC (patient, doctor)
router.post(
    '/getByPatient',
    verifyToken,
    requireRole(['patient', 'doctor']),
    getByPatient
);

module.exports = router;
