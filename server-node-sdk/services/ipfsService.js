'use strict';

const axios = require('axios');
const FormData = require('form-data');

// ─── Pinata REST API ─────────────────────────────────────────────────────────
const PINATA_PIN_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

/**
 * Upload an encrypted file buffer to IPFS via Pinata.
 *
 * @param {Buffer} encryptedBuffer – Encrypted file data
 * @param {string} fileName – Original filename (for Pinata metadata)
 * @returns {{ cid: string, pinSize: number, timestamp: string }}
 */
const uploadToIPFS = async (encryptedBuffer, fileName) => {
    const apiKey = process.env.PINATA_API_KEY;
    const secretKey = process.env.PINATA_SECRET_API_KEY;

    if (!apiKey || !secretKey) {
        throw Object.assign(
            new Error('Pinata API credentials not configured. Set PINATA_API_KEY and PINATA_SECRET_API_KEY in .env'),
            { statusCode: 500 }
        );
    }

    // Build multipart form data with the encrypted buffer
    const form = new FormData();
    form.append('file', encryptedBuffer, {
        filename: `encrypted_${fileName}`,
        contentType: 'application/octet-stream',
    });

    // Optional Pinata metadata
    const pinataMetadata = JSON.stringify({
        name: `EHR_encrypted_${fileName}`,
        keyvalues: {
            source: 'ehr-blockchain',
            encrypted: 'true',
            algorithm: 'aes-256-gcm',
        },
    });
    form.append('pinataMetadata', pinataMetadata);

    // Pin with Pinata defaults
    const pinataOptions = JSON.stringify({
        cidVersion: 1,
    });
    form.append('pinataOptions', pinataOptions);

    try {
        const response = await axios.post(PINATA_PIN_URL, form, {
            maxBodyLength: Infinity,
            headers: {
                ...form.getHeaders(),
                pinata_api_key: apiKey,
                pinata_secret_api_key: secretKey,
            },
            timeout: 60000, // 60 second timeout for large files
        });

        const { IpfsHash, PinSize, Timestamp } = response.data;
        console.log(`[IPFS] File pinned successfully. CID: ${IpfsHash} (${PinSize} bytes)`);

        return {
            cid: IpfsHash,
            pinSize: PinSize,
            timestamp: Timestamp,
        };
    } catch (err) {
        const msg = err.response?.data?.error || err.message;
        console.error('[IPFS] Pinata upload failed:', msg);
        throw Object.assign(
            new Error(`IPFS upload failed: ${msg}`),
            { statusCode: 502 }
        );
    }
};

module.exports = { uploadToIPFS };
