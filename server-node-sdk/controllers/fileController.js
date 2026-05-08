'use strict';

const { encryptFile } = require('../services/encryptionService');
const { uploadToIPFS } = require('../services/ipfsService');
const { insertFile, getFilesByPatient } = require('../db/database');
const { sendSuccess, sendError } = require('../middleware/responseFormatter');

// ─── Allowed MIME Types ──────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * POST /api/files/upload
 *
 * Receives a medical file via multipart/form-data, encrypts it with
 * AES-256-GCM, uploads the ciphertext to IPFS via Pinata, and stores
 * metadata in SQLite.
 *
 * Body (multipart/form-data):
 *   - file: the medical document (PDF, PNG, JPG/JPEG)
 *   - patientUUID: which patient this file belongs to
 *
 * Identity from JWT (req.user):
 *   - uuid: uploader's blockchain UUID
 *   - role: uploader's role (patient or doctor)
 *
 * Ownership enforcement:
 *   - If role=patient, patientUUID MUST match req.user.uuid
 *   - If role=doctor, any patientUUID is accepted (doctor uploads for patient)
 */
const upload = async (req, res, next) => {
    try {
        // ── Validate File ────────────────────────────────────────────────────
        if (!req.file) {
            return sendError(res, 'No file uploaded. Please select a file.', 400);
        }

        const { patientUUID } = req.body;
        if (!patientUUID) {
            return sendError(res, 'patientUUID is required.', 400);
        }

        // ── Validate MIME Type ───────────────────────────────────────────────
        if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
            return sendError(
                res,
                `Unsupported file type: ${req.file.mimetype}. Allowed: PDF, PNG, JPG/JPEG.`,
                400
            );
        }

        // ── Validate File Size ───────────────────────────────────────────────
        if (req.file.size > MAX_FILE_SIZE) {
            return sendError(res, `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB.`, 400);
        }

        // ── Patient Ownership Enforcement ────────────────────────────────────
        // If uploader is a patient, they can ONLY upload files for themselves
        if (req.user.role === 'patient' && patientUUID !== req.user.uuid) {
            return sendError(
                res,
                'Patients can only upload files for their own account.',
                403
            );
        }

        // ── AES-256-GCM Encryption ───────────────────────────────────────────
        console.log(`[File] Encrypting "${req.file.originalname}" (${req.file.size} bytes)...`);
        const { encryptedBuffer, iv, authTag, algorithm } = encryptFile(req.file.buffer);
        // Plaintext buffer (req.file.buffer) is no longer needed — GC will reclaim

        // ── Upload Encrypted File to IPFS ────────────────────────────────────
        console.log(`[File] Uploading encrypted file to IPFS via Pinata...`);
        const { cid } = await uploadToIPFS(encryptedBuffer, req.file.originalname);

        // ── Store Metadata in SQLite ─────────────────────────────────────────
        const result = insertFile({
            patientUUID,
            uploadedBy: req.user.uuid,
            uploaderRole: req.user.role,
            originalFileName: req.file.originalname,
            mimeType: req.file.mimetype,
            fileSize: req.file.size,
            ipfsCid: cid,
            encryptionIv: iv,
            encryptionAlgorithm: algorithm,
            authTag,
        });

        console.log(`[File] Upload complete. fileId=${result.lastInsertRowid}, CID=${cid}`);

        return sendSuccess(res, {
            fileId: result.lastInsertRowid,
            ipfsCid: cid,
            fileName: req.file.originalname,
            encryptionAlgorithm: algorithm,
        }, 201);

    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/files/getByPatient
 *
 * Returns all medical file metadata for a given patient.
 * Body: { patientUUID }
 *
 * Ownership:
 *   - Patients can only view their own files
 *   - Doctors can view any patient's files (consent check in Phase 3)
 */
const getByPatient = async (req, res, next) => {
    try {
        const { patientUUID } = req.body;
        if (!patientUUID) {
            return sendError(res, 'patientUUID is required.', 400);
        }

        // Patient ownership enforcement
        if (req.user.role === 'patient' && patientUUID !== req.user.uuid) {
            return sendError(res, 'Patients can only view their own files.', 403);
        }

        const files = getFilesByPatient(patientUUID);

        // Return metadata without encryption keys
        const sanitized = files.map((f) => ({
            id: f.id,
            originalFileName: f.originalFileName,
            mimeType: f.mimeType,
            fileSize: f.fileSize,
            ipfsCid: f.ipfsCid,
            uploadedBy: f.uploadedBy,
            uploaderRole: f.uploaderRole,
            uploadTimestamp: f.uploadTimestamp,
        }));

        return sendSuccess(res, sanitized, 200);
    } catch (error) {
        next(error);
    }
};

module.exports = { upload, getByPatient };
