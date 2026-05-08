'use strict';

const crypto = require('crypto');

// ─── Constants ───────────────────────────────────────────────────────────────
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;       // 16 bytes for GCM
const AUTH_TAG_LENGTH = 16; // 16 bytes (128-bit) auth tag

/**
 * Validate that the AES key is configured and correct length.
 * @returns {Buffer} 32-byte key buffer
 */
const getKey = () => {
    const hexKey = process.env.AES_ENCRYPTION_KEY;
    if (!hexKey || hexKey.length !== 64) {
        throw Object.assign(
            new Error('AES_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'),
            { statusCode: 500 }
        );
    }
    return Buffer.from(hexKey, 'hex');
};

/**
 * Encrypt a file buffer using AES-256-GCM with a random IV.
 *
 * Returns:
 *   - encryptedBuffer: the ciphertext
 *   - iv: hex string of the random IV (needed for decryption)
 *   - authTag: hex string of the GCM authentication tag (tamper detection)
 *   - algorithm: 'aes-256-gcm' (stored for future compatibility)
 *
 * @param {Buffer} fileBuffer – Plaintext file data
 * @returns {{ encryptedBuffer: Buffer, iv: string, authTag: string, algorithm: string }}
 */
const encryptFile = (fileBuffer) => {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([
        cipher.update(fileBuffer),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return {
        encryptedBuffer: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: ALGORITHM,
    };
};

module.exports = { encryptFile, ALGORITHM };
