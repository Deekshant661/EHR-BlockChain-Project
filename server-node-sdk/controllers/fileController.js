'use strict';

const { encryptFile } = require('../services/encryptionService');
const { decryptFile } = require('../services/encryptionService');
const { uploadToIPFS, fetchFromIPFS } = require('../services/ipfsService');
const { insertFile, getFilesByPatient, getFileById } = require('../db/database');
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

// ─── Trusted MIME Types ──────────────────────────────────────────────────────
const TRUSTED_MIME_TYPES = new Set([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
]);

/**
 * Validate file access ownership.
 *
 * Isolated into its own function so Phase 3 consent logic can be
 * injected here without refactoring encryption or IPFS code.
 *
 * Phase 2 rules:
 *   - patient: can only access own files
 *   - doctor: can access any patient file
 *
 * @param {Object} file – File metadata row from SQLite
 * @param {Object} user – Decoded JWT payload (req.user)
 * @returns {{ allowed: boolean, reason?: string }}
 */
const validateFileAccess = (file, user) => {
    // Patient ownership enforcement
    if (user.role === 'patient' && file.patientUUID !== user.uuid) {
        return { allowed: false, reason: 'You can only download your own files.' };
    }
    // Doctor: allowed in Phase 2 (consent check deferred to Phase 3)
    return { allowed: true };
};

/**
 * GET /api/files/download/:fileId
 *
 * Secure file download pipeline.
 *
 * Validation order (STRICT):
 *   1. JWT verified         (verifyToken middleware)
 *   2. RBAC validated       (requireRole middleware)
 *   3. Fetch SQLite metadata
 *   4. Ownership validation
 *   5. Fetch encrypted content from IPFS
 *   6. AES-256-GCM decrypt in memory
 *   7. Stream decrypted file with secure headers
 *
 * Security:
 *   - X-Content-Type-Options: nosniff
 *   - Content-Disposition: attachment
 *   - Content-Type from stored mimeType (not inferred)
 *   - No plaintext written to disk
 */
const download = async (req, res, next) => {
    try {
        const fileId = parseInt(req.params.fileId, 10);
        if (isNaN(fileId)) {
            return sendError(res, 'Invalid file ID.', 400);
        }

        // ── Step 3: Fetch metadata from SQLite ───────────────────────────────
        const file = getFileById(fileId);
        if (!file) {
            return sendError(res, 'File not found.', 404);
        }

        // ── Step 4: Ownership / access validation ────────────────────────────
        const access = validateFileAccess(file, req.user);
        if (!access.allowed) {
            return sendError(res, access.reason, 403);
        }

        // ── Step 5: Fetch encrypted content from IPFS ────────────────────────
        console.log(`[File] Fetching encrypted file from IPFS. CID: ${file.ipfsCid}`);
        const encryptedBuffer = await fetchFromIPFS(file.ipfsCid);

        // ── Step 6: AES-256-GCM decrypt in memory ────────────────────────────
        console.log(`[File] Decrypting "${file.originalFileName}" (${encryptedBuffer.length} bytes)...`);
        const decryptedBuffer = decryptFile(encryptedBuffer, file.encryptionIv, file.authTag);

        // ── Step 7: Stream decrypted file with secure headers ────────────────
        // Use stored mimeType — do NOT infer from content
        const contentType = TRUSTED_MIME_TYPES.has(file.mimeType)
            ? file.mimeType
            : 'application/octet-stream';

        res.set({
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${file.originalFileName}"`,
            'Content-Length': decryptedBuffer.length,
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'no-store',
        });

        console.log(`[File] Download complete. fileId=${fileId}, ${decryptedBuffer.length} bytes sent.`);
        return res.send(decryptedBuffer);

    } catch (error) {
        next(error);
    }
};

module.exports = { upload, getByPatient, download };
