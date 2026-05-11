'use strict';

// ─── File Metadata Seeder ────────────────────────────────────────────────────
// Seeds encrypted file metadata into SQLite + uploads ONE placeholder to IPFS.
// Reuses a single CID across all records to protect Pinata API quota.

const { insertFileWithTimestamp, countFiles } = require('../../db/database');
const { encryptFile } = require('../../services/encryptionService');
const { uploadToIPFS } = require('../../services/ipfsService');
const { generatePlaceholderPDF } = require('../generators/placeholderFile');
const { generateFileEntry, toISO } = require('../generators/dataGenerator');
const { createLogger } = require('../utils/logger');

const log = createLogger('Files');

/**
 * Seed encrypted file metadata for all patients.
 *
 * Pipeline:
 *   1. Generate a lightweight placeholder PDF
 *   2. Encrypt it with AES-256-GCM (real encryption)
 *   3. Upload encrypted buffer to IPFS/Pinata (ONE upload)
 *   4. Reuse the CID across all synthetic file metadata entries
 *   5. Insert varied metadata into SQLite with historical timestamps
 *
 * @param {Object} userMap
 * @param {Array} consentPairs – for determining uploadedBy (doctor or self)
 * @param {boolean} dryRun
 * @returns {Object} stats
 */
const seedFiles = async (userMap, consentPairs, dryRun = false) => {
    log.header('PHASE 5: ENCRYPTED FILE METADATA');

    const patients = [];
    const doctorsByPatient = {}; // patientUUID → [doctorUUID]

    for (const [email, info] of Object.entries(userMap)) {
        if (info.role === 'patient') patients.push({ email, ...info });
    }

    // Build doctor lookup per patient from consent pairs
    for (const pair of consentPairs) {
        if (!doctorsByPatient[pair.patientUUID]) {
            doctorsByPatient[pair.patientUUID] = [];
        }
        const doc = Object.values(userMap).find(u => u.uuid === pair.doctorUUID);
        if (doc) {
            doctorsByPatient[pair.patientUUID].push(doc);
        }
    }

    const stats = { files: 0, failed: 0 };

    if (dryRun) {
        log.warn('DRY RUN — skipping IPFS upload and SQLite writes.');
        patients.forEach((p, i) => {
            const numFiles = p.isShowcase ? 5 : (Math.floor(Math.random() * 4) + 2);
            log.progress(i + 1, patients.length, `[DRY] ${p.email}: ${numFiles} files`);
            stats.files += numFiles;
        });
        return stats;
    }

    // ── Step 1: Generate placeholder PDF ─────────────────────────────────────
    log.info('Generating placeholder medical PDF...');
    const pdfBuffer = generatePlaceholderPDF();
    log.success(`PDF generated: ${pdfBuffer.length} bytes`);

    // ── Step 2: Encrypt with AES-256-GCM ─────────────────────────────────────
    log.info('Encrypting placeholder with AES-256-GCM...');
    const { encryptedBuffer, iv: sharedIv, authTag: sharedAuthTag, algorithm } = encryptFile(pdfBuffer);
    log.success(`Encrypted: ${encryptedBuffer.length} bytes (IV: ${sharedIv.substring(0, 8)}...)`);

    // ── Step 3: Upload to IPFS (ONE upload) ──────────────────────────────────
    log.info('Uploading encrypted placeholder to IPFS via Pinata...');
    let reusableCID;
    try {
        const { cid } = await uploadToIPFS(encryptedBuffer, 'Synthetic_Medical_Report.pdf');
        reusableCID = cid;
        log.success(`IPFS upload complete. Reusable CID: ${reusableCID}`);
    } catch (err) {
        log.error(`IPFS upload failed: ${err.message}`);
        log.warn('Falling back to placeholder CID for metadata-only seeding.');
        reusableCID = 'bafybeifallback_placeholder_cid_for_offline_seeding';
    }

    // ── Step 4: Insert file metadata for each patient ────────────────────────
    log.info('Inserting file metadata into SQLite...');

    let totalFiles = 0;
    for (let pi = 0; pi < patients.length; pi++) {
        const patient = patients[pi];

        // Showcase patients get more files
        const numFiles = patient.isShowcase
            ? Math.floor(Math.random() * 3) + 4  // 4-6
            : Math.floor(Math.random() * 4) + 2; // 2-5

        const authorizedDoctors = doctorsByPatient[patient.uuid] || [];

        for (let fi = 0; fi < numFiles; fi++) {
            try {
                const fileEntry = generateFileEntry(totalFiles + fi);

                // Determine uploader: 60% self-upload, 40% doctor upload
                let uploadedBy = patient.uuid;
                let uploaderRole = 'patient';
                if (authorizedDoctors.length > 0 && Math.random() < 0.4) {
                    const doc = authorizedDoctors[fi % authorizedDoctors.length];
                    uploadedBy = doc.uuid;
                    uploaderRole = 'doctor';
                }

                insertFileWithTimestamp({
                    patientUUID: patient.uuid,
                    uploadedBy,
                    uploaderRole,
                    originalFileName: fileEntry.fileName,
                    mimeType: fileEntry.mimeType,
                    fileSize: fileEntry.fileSize,
                    ipfsCid: reusableCID,
                    encryptionIv: sharedIv,
                    encryptionAlgorithm: algorithm,
                    authTag: sharedAuthTag,
                    uploadTimestamp: toISO(fileEntry.timestamp),
                });

                stats.files++;
            } catch (err) {
                log.error(`File insert failed for ${patient.email}: ${err.message}`);
                stats.failed++;
            }
        }

        totalFiles += numFiles;

        if ((pi + 1) % 10 === 0 || pi === patients.length - 1) {
            log.progress(pi + 1, patients.length, `${patient.email}: ${numFiles} files`);
        }
    }

    log.success(`Files seeded: ${stats.files}. Total in DB: ${countFiles()}`);
    return stats;
};

module.exports = { seedFiles };
