'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const FabricCAServices = require('fabric-ca-client');
const { WALLET_PATH, ORG_CONFIG } = require('./constants');
const { loadConnectionProfile, getWallet } = require('./networkConnection');

// ─── User Metadata Store ────────────────────────────────────────────────────
// A simple JSON file that maps userId → { role, uuid, orgName, registeredAt }.
// Written during enrollment, read during login for role verification.
const USER_META_PATH = path.join(WALLET_PATH, '_userMeta.json');

const readUserMeta = () => {
    try {
        if (fs.existsSync(USER_META_PATH)) {
            return JSON.parse(fs.readFileSync(USER_META_PATH, 'utf8'));
        }
    } catch (err) {
        console.warn('[IdentityManager] Failed to read user meta:', err.message);
    }
    return {};
};

const writeUserMeta = (meta) => {
    if (!fs.existsSync(WALLET_PATH)) {
        fs.mkdirSync(WALLET_PATH, { recursive: true });
    }
    fs.writeFileSync(USER_META_PATH, JSON.stringify(meta, null, 2));
};

const saveUserMeta = (userId, role, uuid, orgName) => {
    const meta = readUserMeta();
    meta[userId] = { role, uuid, orgName, registeredAt: new Date().toISOString() };
    writeUserMeta(meta);
};

const getUserMeta = (userId) => {
    const meta = readUserMeta();
    return meta[userId] || null;
};

// ─── UUID Generator ──────────────────────────────────────────────────────────
const generateUUID = () => {
    const bytes = crypto.randomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
    const hex = bytes.toString('hex');
    return [
        hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16),
        hex.slice(16, 20), hex.slice(20),
    ].join('-');
};

// ─── Identity Checks ─────────────────────────────────────────────────────────
const identityExists = async (userId) => {
    const wallet = await getWallet();
    const identity = await wallet.get(userId);
    return !!identity;
};

// ─── Admin Enrollment ────────────────────────────────────────────────────────
/**
 * Enroll the bootstrap CA admin for an org (e.g. hospitalAdmin, insuranceAdmin).
 * Uses the CA's default admin/adminpw credentials and TLS CA certs.
 */
const enrollAdmin = async (orgName) => {
    const orgConfig = ORG_CONFIG[orgName];
    if (!orgConfig) throw new Error(`Unknown organization: ${orgName}`);

    const wallet = await getWallet();
    const adminLabel = orgConfig.adminIdentity;

    // Skip if already enrolled
    const existing = await wallet.get(adminLabel);
    if (existing) {
        console.log(`[Bootstrap] Admin "${adminLabel}" already in wallet — skipped.`);
        return { alreadyExists: true, adminLabel };
    }

    const ccp = loadConnectionProfile(orgName);
    const caInfo = ccp.certificateAuthorities[orgConfig.caName];
    const caTLSCACerts = caInfo.tlsCACerts.pem;
    const ca = new FabricCAServices(
        caInfo.url,
        { trustedRoots: caTLSCACerts, verify: false },
        caInfo.caName
    );

    const enrollment = await ca.enroll({
        enrollmentID: orgConfig.adminEnrollId,
        enrollmentSecret: orgConfig.adminEnrollSecret,
    });

    const x509Identity = {
        credentials: {
            certificate: enrollment.certificate,
            privateKey: enrollment.key.toBytes(),
        },
        mspId: orgConfig.mspId,
        type: 'X.509',
    };

    await wallet.put(adminLabel, x509Identity);
    console.log(`[Bootstrap] Enrolled admin "${adminLabel}" for ${orgName}`);
    return { alreadyExists: false, adminLabel };
};

// ─── User Registration & Enrollment ──────────────────────────────────────────
/**
 * Register a new user with the Fabric CA, enroll them, and store the
 * X.509 identity in the file-system wallet.
 *
 * @param {Object}  opts
 * @param {string}  opts.userId       – Human-readable login identifier (wallet key).
 * @param {string}  opts.role         – Application role (patient, doctor, …).
 * @param {string}  opts.orgName      – Fabric org name (Org1 | Org2).
 * @param {string}  opts.adminLabel   – Wallet label of the CA admin who registers.
 * @returns {{ userId, uuid, mspId }}
 */
const registerAndEnrollUser = async ({ userId, role, orgName, adminLabel }) => {
    const orgConfig = ORG_CONFIG[orgName];
    if (!orgConfig) throw new Error(`Unknown organization: ${orgName}`);

    const wallet = await getWallet();

    // Prevent duplicates
    const existing = await wallet.get(userId);
    if (existing) {
        throw new Error(`Identity "${userId}" already exists in wallet`);
    }

    // Verify admin is available
    const adminIdentity = await wallet.get(adminLabel);
    if (!adminIdentity) {
        throw new Error(`Admin "${adminLabel}" not found in wallet. Run bootstrap first.`);
    }

    // Build admin user context
    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, adminLabel);

    // Create CA client
    const ccp = loadConnectionProfile(orgName);
    const caURL = ccp.certificateAuthorities[orgConfig.caName].url;
    const ca = new FabricCAServices(caURL);

    // Generate internal UUID for the certificate
    const uuid = generateUUID();

    // Register with the CA
    const secret = await ca.register({
        affiliation: orgConfig.affiliation,
        enrollmentID: userId,
        role: 'client',
        attrs: [
            { name: 'role', value: role, ecert: true },
            { name: 'uuid', value: uuid, ecert: true },
        ],
    }, adminUser);

    // Enroll and retrieve certs
    const enrollment = await ca.enroll({
        enrollmentID: userId,
        enrollmentSecret: secret,
        attr_reqs: [
            { name: 'role', optional: false },
            { name: 'uuid', optional: false },
        ],
    });

    const x509Identity = {
        credentials: {
            certificate: enrollment.certificate,
            privateKey: enrollment.key.toBytes(),
        },
        mspId: orgConfig.mspId,
        type: 'X.509',
    };

    await wallet.put(userId, x509Identity);

    // Persist metadata for login verification
    saveUserMeta(userId, role, uuid, orgName);

    console.log(`[IdentityManager] Registered & enrolled "${userId}" (role=${role}, uuid=${uuid})`);
    return { userId, uuid, mspId: orgConfig.mspId };
};

module.exports = {
    identityExists,
    enrollAdmin,
    registerAndEnrollUser,
    getUserMeta,
    saveUserMeta,
    generateUUID,
};
