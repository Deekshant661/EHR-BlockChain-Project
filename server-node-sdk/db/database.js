'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// ─── Database Path ───────────────────────────────────────────────────────────
const DB_DIR = path.join(__dirname);
const DB_PATH = path.join(DB_DIR, 'auth.db');

let db;

// ─── Initialize Database ────────────────────────────────────────────────────
/**
 * Open (or create) the SQLite database and ensure the users table exists.
 * Called once from app.js during server startup.
 */
const initDatabase = () => {
    // Ensure the db/ directory exists
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
    }

    db = new Database(DB_PATH);

    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');

    // Create users table if it doesn't exist
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            email       TEXT    UNIQUE NOT NULL,
            passwordHash TEXT   NOT NULL,
            userId      TEXT    UNIQUE NOT NULL,
            uuid        TEXT    UNIQUE NOT NULL,
            role        TEXT    NOT NULL,
            orgName     TEXT    NOT NULL,
            createdAt   DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // ── OTP Verification Migration ───────────────────────────────────────────
    // Safe ALTER TABLE — wrapped in try/catch so server doesn't crash if
    // columns already exist. This preserves all existing data.
    const migrations = [
        'ALTER TABLE users ADD COLUMN isVerified BOOLEAN DEFAULT 0',
        'ALTER TABLE users ADD COLUMN verificationCode TEXT',
        'ALTER TABLE users ADD COLUMN verificationExpires DATETIME',
        'ALTER TABLE users ADD COLUMN isSynthetic BOOLEAN DEFAULT 0',
    ];
    migrations.forEach((sql) => {
        try { db.exec(sql); } catch { /* column already exists — safe to ignore */ }
    });

    // ── Existing User Safety ─────────────────────────────────────────────────
    // Mark all pre-existing users as verified so they don't get locked out.
    // This only affects users where isVerified is NULL (before migration).
    db.exec(`UPDATE users SET isVerified = 1 WHERE isVerified IS NULL`);

    // ── Medical Files Table ─────────────────────────────────────────────────
    db.exec(`
        CREATE TABLE IF NOT EXISTS medical_files (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            patientUUID         TEXT    NOT NULL,
            uploadedBy          TEXT    NOT NULL,
            uploaderRole        TEXT    NOT NULL,
            originalFileName    TEXT    NOT NULL,
            mimeType            TEXT    NOT NULL,
            fileSize            INTEGER NOT NULL,
            ipfsCid             TEXT    NOT NULL,
            encryptionIv        TEXT    NOT NULL,
            encryptionAlgorithm TEXT    NOT NULL DEFAULT 'aes-256-gcm',
            authTag             TEXT,
            uploadTimestamp     DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // ── Seed Metadata Table ──────────────────────────────────────────────────
    db.exec(`
        CREATE TABLE IF NOT EXISTS seed_metadata (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    `);

    // ── Audit Logs Table ─────────────────────────────────────────────────────
    db.exec(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP,
            actorId     TEXT,
            actorRole   TEXT,
            actionType  TEXT NOT NULL,
            severity    TEXT DEFAULT 'info',
            targetId    TEXT,
            targetType  TEXT,
            status      TEXT DEFAULT 'success',
            metadata    TEXT
        );
    `);

    console.log('[Database] SQLite initialized at', DB_PATH);
    return db;
};

// ─── Prepared Statement Helpers ──────────────────────────────────────────────

/**
 * Insert a new user row into the users table.
 * New users are created with isVerified=0 (unverified).
 * @param {Object} user
 * @returns {Object} The inserted row info (lastInsertRowid, changes)
 */
const createUser = ({ name, email, passwordHash, userId, uuid, role, orgName }) => {
    const stmt = db.prepare(`
        INSERT INTO users (name, email, passwordHash, userId, uuid, role, orgName, isVerified)
        VALUES (@name, @email, @passwordHash, @userId, @uuid, @role, @orgName, 0)
    `);
    return stmt.run({ name, email, passwordHash, userId, uuid, role, orgName });
};

/**
 * Insert a synthetic (auto-verified) user. Bypasses OTP — used by seed scripts.
 * @param {Object} user
 * @returns {Object} The inserted row info
 */
const createSyntheticUser = ({ name, email, passwordHash, userId, uuid, role, orgName }) => {
    const stmt = db.prepare(`
        INSERT INTO users (name, email, passwordHash, userId, uuid, role, orgName, isVerified, isSynthetic)
        VALUES (@name, @email, @passwordHash, @userId, @uuid, @role, @orgName, 1, 1)
    `);
    return stmt.run({ name, email, passwordHash, userId, uuid, role, orgName });
};

/**
 * Find a user by their email address.
 * @param {string} email
 * @returns {Object|undefined} The user row, or undefined if not found.
 */
const findUserByEmail = (email) => {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
};

/**
 * Find a user by their auto-generated userId (wallet key).
 * @param {string} userId
 * @returns {Object|undefined} The user row, or undefined if not found.
 */
const findUserByUserId = (userId) => {
    const stmt = db.prepare('SELECT * FROM users WHERE userId = ?');
    return stmt.get(userId);
};

/**
 * Find a user by their blockchain UUID.
 * @param {string} uuid
 * @returns {Object|undefined}
 */
const findUserByUUID = (uuid) => {
    const stmt = db.prepare('SELECT * FROM users WHERE uuid = ?');
    return stmt.get(uuid);
};

/**
 * Count how many synthetic users exist (for idempotency checks).
 * @returns {number}
 */
const countSyntheticUsers = () => {
    const row = db.prepare('SELECT COUNT(*) AS cnt FROM users WHERE isSynthetic = 1').get();
    return row.cnt;
};

/**
 * Get all users (optionally filtered by role).
 * @param {string} [role]
 * @returns {Array}
 */
const getAllUsers = (role) => {
    if (role) {
        return db.prepare('SELECT * FROM users WHERE role = ?').all(role);
    }
    return db.prepare('SELECT * FROM users').all();
};

/**
 * Store a verification OTP code and its expiration for a user.
 * @param {string} email
 * @param {string} code – 6-digit OTP
 * @param {string} expires – ISO datetime string
 */
const updateVerification = (email, code, expires) => {
    const stmt = db.prepare(`
        UPDATE users SET verificationCode = ?, verificationExpires = ? WHERE email = ?
    `);
    return stmt.run(code, expires, email);
};

/**
 * Mark a user as verified and clear the OTP fields.
 * @param {string} email
 */
const setVerified = (email) => {
    const stmt = db.prepare(`
        UPDATE users SET isVerified = 1, verificationCode = NULL, verificationExpires = NULL WHERE email = ?
    `);
    return stmt.run(email);
};

/**
 * Clear expired OTP fields for a user (auto-cleanup on failed verification).
 * @param {string} email
 */
const clearExpiredOtp = (email) => {
    const stmt = db.prepare(`
        UPDATE users SET verificationCode = NULL, verificationExpires = NULL WHERE email = ?
    `);
    return stmt.run(email);
};

// ─── Medical File Helpers ────────────────────────────────────────────────────

/**
 * Insert a medical file metadata record.
 * @param {Object} file
 * @returns {Object} { lastInsertRowid }
 */
const insertFile = ({ patientUUID, uploadedBy, uploaderRole, originalFileName, mimeType, fileSize, ipfsCid, encryptionIv, encryptionAlgorithm, authTag }) => {
    const stmt = db.prepare(`
        INSERT INTO medical_files (patientUUID, uploadedBy, uploaderRole, originalFileName, mimeType, fileSize, ipfsCid, encryptionIv, encryptionAlgorithm, authTag)
        VALUES (@patientUUID, @uploadedBy, @uploaderRole, @originalFileName, @mimeType, @fileSize, @ipfsCid, @encryptionIv, @encryptionAlgorithm, @authTag)
    `);
    return stmt.run({ patientUUID, uploadedBy, uploaderRole, originalFileName, mimeType, fileSize, ipfsCid, encryptionIv, encryptionAlgorithm, authTag });
};

/**
 * Insert a medical file metadata record with a custom upload timestamp.
 * Used by seed scripts for historical data realism.
 * @param {Object} file
 * @returns {Object} { lastInsertRowid }
 */
const insertFileWithTimestamp = ({ patientUUID, uploadedBy, uploaderRole, originalFileName, mimeType, fileSize, ipfsCid, encryptionIv, encryptionAlgorithm, authTag, uploadTimestamp }) => {
    const stmt = db.prepare(`
        INSERT INTO medical_files (patientUUID, uploadedBy, uploaderRole, originalFileName, mimeType, fileSize, ipfsCid, encryptionIv, encryptionAlgorithm, authTag, uploadTimestamp)
        VALUES (@patientUUID, @uploadedBy, @uploaderRole, @originalFileName, @mimeType, @fileSize, @ipfsCid, @encryptionIv, @encryptionAlgorithm, @authTag, @uploadTimestamp)
    `);
    return stmt.run({ patientUUID, uploadedBy, uploaderRole, originalFileName, mimeType, fileSize, ipfsCid, encryptionIv, encryptionAlgorithm, authTag, uploadTimestamp });
};

/**
 * Get all medical files for a patient.
 * @param {string} patientUUID
 * @returns {Array} File metadata rows
 */
const getFilesByPatient = (patientUUID) => {
    const stmt = db.prepare('SELECT * FROM medical_files WHERE patientUUID = ? ORDER BY uploadTimestamp DESC');
    return stmt.all(patientUUID);
};

/**
 * Get a single file by ID.
 * @param {number} fileId
 * @returns {Object|undefined}
 */
const getFileById = (fileId) => {
    const stmt = db.prepare('SELECT * FROM medical_files WHERE id = ?');
    return stmt.get(fileId);
};

// ─── Synthetic Data Cleanup Helpers ──────────────────────────────────────────

/**
 * Delete all synthetic users from the users table.
 * @returns {number} Number of rows deleted.
 */
const deleteSyntheticUsers = () => {
    const result = db.prepare('DELETE FROM users WHERE isSynthetic = 1').run();
    return result.changes;
};

/**
 * Delete all medical file entries uploaded by synthetic users.
 * Uses a subquery to match on synthetic user UUIDs.
 * @returns {number} Number of rows deleted.
 */
const deleteSyntheticFiles = () => {
    const result = db.prepare(`
        DELETE FROM medical_files WHERE uploadedBy IN (
            SELECT uuid FROM users WHERE isSynthetic = 1
        ) OR patientUUID IN (
            SELECT uuid FROM users WHERE isSynthetic = 1
        )
    `).run();
    return result.changes;
};

/**
 * Count total medical files in database.
 * @returns {number}
 */
const countFiles = () => {
    const row = db.prepare('SELECT COUNT(*) AS cnt FROM medical_files').get();
    return row.cnt;
};

// ─── Seed Metadata Helpers ───────────────────────────────────────────────────

const getSeedMeta = (key) => {
    const row = db.prepare('SELECT value FROM seed_metadata WHERE key = ?').get(key);
    return row ? row.value : null;
};

const setSeedMeta = (key, value) => {
    db.prepare('INSERT OR REPLACE INTO seed_metadata (key, value) VALUES (?, ?)').run(key, value);
};

// ─── Audit Log Helpers ───────────────────────────────────────────────────────

/**
 * Insert an audit log entry. Fire-and-forget — errors are swallowed.
 * @param {Object} entry
 */
const insertAuditLog = ({ actorId, actorRole, actionType, severity, targetId, targetType, status, metadata }) => {
    try {
        db.prepare(`
            INSERT INTO audit_logs (actorId, actorRole, actionType, severity, targetId, targetType, status, metadata)
            VALUES (@actorId, @actorRole, @actionType, @severity, @targetId, @targetType, @status, @metadata)
        `).run({
            actorId: actorId || null,
            actorRole: actorRole || null,
            actionType,
            severity: severity || 'info',
            targetId: targetId || null,
            targetType: targetType || null,
            status: status || 'success',
            metadata: metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null,
        });
    } catch (err) {
        console.error('[Audit] Failed to insert audit log:', err.message);
    }
};

/**
 * Get recent audit log entries (paginated).
 * @param {number} limit – Max entries to return
 * @param {number} offset – Offset for pagination
 * @returns {Array}
 */
const getRecentAuditLogs = (limit = 20, offset = 0) => {
    return db.prepare(
        'SELECT * FROM audit_logs ORDER BY id DESC LIMIT ? OFFSET ?'
    ).all(limit, offset);
};

/**
 * Count total audit log entries.
 * @returns {number}
 */
const countAuditLogs = () => {
    const row = db.prepare('SELECT COUNT(*) AS cnt FROM audit_logs').get();
    return row.cnt;
};

// ─── Exports ─────────────────────────────────────────────────────────────────
module.exports = {
    initDatabase,
    createUser,
    createSyntheticUser,
    findUserByEmail,
    findUserByUserId,
    findUserByUUID,
    countSyntheticUsers,
    getAllUsers,
    updateVerification,
    setVerified,
    clearExpiredOtp,
    insertFile,
    insertFileWithTimestamp,
    getFilesByPatient,
    getFileById,
    deleteSyntheticUsers,
    deleteSyntheticFiles,
    countFiles,
    getSeedMeta,
    setSeedMeta,
    insertAuditLog,
    getRecentAuditLogs,
    countAuditLogs,
};
