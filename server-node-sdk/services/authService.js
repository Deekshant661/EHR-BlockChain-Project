'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { signupUser: fabricSignup } = require('./enrollmentService');
const { identityExists } = require('../fabric/identityManager');
const { sendVerificationEmail } = require('./emailService');
const {
    createUser, findUserByEmail,
    updateVerification, setVerified, clearExpiredOtp,
} = require('../db/database');
const { SIGNUP_ROLES, ROLE_PREFIX, ROLE_CONFIG } = require('../fabric/constants');
const { logAudit, ACTIONS } = require('./auditService');

// ─── Constants ───────────────────────────────────────────────────────────────
const BCRYPT_SALT_ROUNDS = 12;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const OTP_EXPIRY_MINUTES = 10;

// ─── Token Generation ────────────────────────────────────────────────────────
const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    });
};

// ─── UserId Generation ───────────────────────────────────────────────────────
const generateUserId = (role) => {
    const prefix = ROLE_PREFIX[role] || 'usr';
    const hex = crypto.randomBytes(4).toString('hex');
    return `${prefix}_${hex}`;
};

// ─── OTP Generation ──────────────────────────────────────────────────────────
const generateOtp = () => {
    return crypto.randomInt(100000, 999999).toString();
};

// ─── Signup ──────────────────────────────────────────────────────────────────
/**
 * Full signup orchestration with email/password:
 *   1. Validate inputs
 *   2. Check email uniqueness
 *   3. Hash password
 *   4. Auto-generate userId
 *   5. Fabric CA enroll + chaincode onboarding
 *   6. Store user in SQLite (isVerified = 0)
 *   7. Generate OTP + send verification email
 *   8. Return requiresVerification (NO JWT)
 */
const signupUser = async ({ name, email, password, role, profileData = {} }) => {
    // ── Validate ─────────────────────────────────────────────────────────────
    if (!name || !email || !password || !role) {
        throw Object.assign(
            new Error('Missing required fields: name, email, password, and role are required.'),
            { statusCode: 400 }
        );
    }

    if (!EMAIL_REGEX.test(email)) {
        throw Object.assign(new Error('Invalid email format.'), { statusCode: 400 });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
        throw Object.assign(
            new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`),
            { statusCode: 400 }
        );
    }

    if (!SIGNUP_ROLES.includes(role)) {
        throw Object.assign(
            new Error(`Invalid role "${role}". Allowed signup roles: ${SIGNUP_ROLES.join(', ')}.`),
            { statusCode: 400 }
        );
    }

    // ── Check Email Uniqueness ───────────────────────────────────────────────
    const existing = findUserByEmail(email);
    if (existing) {
        throw Object.assign(
            new Error('An account with this email already exists.'),
            { statusCode: 409 }
        );
    }

    // ── Hash Password ────────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // ── Generate UserId ──────────────────────────────────────────────────────
    const userId = generateUserId(role);

    // ── Fabric Enrollment ────────────────────────────────────────────────────
    const fabricResult = await fabricSignup({
        userId,
        role,
        profileData: { ...profileData, name },
    });

    const { uuid } = fabricResult;
    const orgName = ROLE_CONFIG[role].org;

    // ── Store in SQLite (isVerified = 0) ─────────────────────────────────────
    createUser({ name, email, passwordHash, userId, uuid, role, orgName });
    console.log(`[Auth] User "${email}" registered as ${role} (userId=${userId}, uuid=${uuid}) — awaiting verification`);

    // ── Generate OTP & Send Email ────────────────────────────────────────────
    const otp = generateOtp();
    const expires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
    updateVerification(email, otp, expires);

    await sendVerificationEmail(email, otp, name);

    // ── Return (NO JWT — verification required first) ────────────────────────
    return {
        requiresVerification: true,
        email,
        message: 'Account created. Please verify your email with the OTP sent to your inbox.',
    };
};

// ─── Login ───────────────────────────────────────────────────────────────────
/**
 * Authenticate with email + password:
 *   - Blocks unverified users with requiresVerification flag
 *   - Only issues JWT for verified users
 */
const loginUser = async ({ email, password }) => {
    if (!email || !password) {
        throw Object.assign(
            new Error('Missing required fields: email and password are required.'),
            { statusCode: 400 }
        );
    }

    const user = findUserByEmail(email);
    if (!user) {
        throw Object.assign(new Error('Invalid email or password.'), { statusCode: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
        logAudit(ACTIONS.LOGIN_FAILED, {
            actorId: user.userId, actorRole: user.role,
            status: 'failure', metadata: { email, reason: 'invalid_password' },
        });
        throw Object.assign(new Error('Invalid email or password.'), { statusCode: 401 });
    }

    // ── Block Unverified Users ───────────────────────────────────────────────
    if (!user.isVerified) {
        return {
            requiresVerification: true,
            email: user.email,
            message: 'Email verification required. Please check your inbox for the OTP.',
        };
    }

    // ── Verify Fabric Wallet ─────────────────────────────────────────────────
    const walletExists = await identityExists(user.userId);
    if (!walletExists) {
        throw Object.assign(
            new Error('Blockchain identity not found. Account may be corrupted. Contact admin.'),
            { statusCode: 500 }
        );
    }

    // ── Generate JWT ─────────────────────────────────────────────────────────
    const token = generateToken({
        userId: user.userId, email: user.email, role: user.role,
        uuid: user.uuid, orgName: user.orgName,
    });

    console.log(`[Auth] Login successful for "${email}" (role=${user.role})`);

    logAudit(ACTIONS.LOGIN, {
        actorId: user.userId, actorRole: user.role,
        metadata: { email },
    });

    return {
        token,
        user: {
            name: user.name, email: user.email, role: user.role,
            userId: user.userId, uuid: user.uuid,
        },
    };
};

// ─── Verify Email ────────────────────────────────────────────────────────────
/**
 * Validate OTP, mark user verified, issue JWT.
 * Uses generic error message to avoid leaking OTP validity info.
 */
const verifyEmail = async ({ email, otp }) => {
    if (!email || !otp) {
        throw Object.assign(
            new Error('Email and verification code are required.'),
            { statusCode: 400 }
        );
    }

    const user = findUserByEmail(email);
    if (!user) {
        throw Object.assign(new Error('Invalid or expired verification code.'), { statusCode: 400 });
    }

    // Already verified
    if (user.isVerified) {
        throw Object.assign(new Error('Email is already verified. Please log in.'), { statusCode: 400 });
    }

    // Check OTP expiration first — auto-clean if expired
    if (!user.verificationCode || !user.verificationExpires) {
        throw Object.assign(new Error('Invalid or expired verification code.'), { statusCode: 400 });
    }

    const isExpired = new Date(user.verificationExpires) < new Date();
    if (isExpired) {
        // Auto-clean expired OTP fields
        clearExpiredOtp(email);
        throw Object.assign(new Error('Invalid or expired verification code.'), { statusCode: 400 });
    }

    // Check OTP match — generic error (don't reveal if it was wrong vs expired)
    if (user.verificationCode !== otp) {
        throw Object.assign(new Error('Invalid or expired verification code.'), { statusCode: 400 });
    }

    // ── Mark Verified & Clear OTP ────────────────────────────────────────────
    setVerified(email);

    // ── Verify Fabric Wallet ─────────────────────────────────────────────────
    const walletExists = await identityExists(user.userId);
    if (!walletExists) {
        throw Object.assign(
            new Error('Blockchain identity not found. Account may be corrupted. Contact admin.'),
            { statusCode: 500 }
        );
    }

    // ── Generate JWT ─────────────────────────────────────────────────────────
    const token = generateToken({
        userId: user.userId, email: user.email, role: user.role,
        uuid: user.uuid, orgName: user.orgName,
    });

    console.log(`[Auth] Email verified for "${email}" — JWT issued`);

    return {
        token,
        user: {
            name: user.name, email: user.email, role: user.role,
            userId: user.userId, uuid: user.uuid,
        },
    };
};

// ─── Resend OTP ──────────────────────────────────────────────────────────────
/**
 * Generate new OTP, overwrite old, send new email.
 */
const resendOtp = async ({ email }) => {
    if (!email) {
        throw Object.assign(new Error('Email is required.'), { statusCode: 400 });
    }

    const user = findUserByEmail(email);
    if (!user) {
        // Don't reveal if email exists — generic success
        return { message: 'If the email exists, a new verification code has been sent.' };
    }

    if (user.isVerified) {
        throw Object.assign(new Error('Email is already verified. Please log in.'), { statusCode: 400 });
    }

    // Generate new OTP & overwrite old
    const otp = generateOtp();
    const expires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
    updateVerification(email, otp, expires);

    await sendVerificationEmail(email, otp, user.name);

    return { message: 'A new verification code has been sent to your email.' };
};

module.exports = { signupUser, loginUser, verifyEmail, resendOtp };
