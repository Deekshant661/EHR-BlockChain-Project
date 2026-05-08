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

// ─── Exports ─────────────────────────────────────────────────────────────────
module.exports = {
    initDatabase,
    createUser,
    findUserByEmail,
    findUserByUserId,
    updateVerification,
    setVerified,
    clearExpiredOtp,
    insertFile,
    getFilesByPatient,
    getFileById,
};
