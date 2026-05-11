'use strict';

const { signupUser, loginUser, verifyEmail, resendOtp } = require('../services/authService');
const { sendSuccess, sendError } = require('../middleware/responseFormatter');
const { logAudit, ACTIONS } = require('../services/auditService');

/**
 * POST /api/auth/signup
 * Body: { name, email, password, role, profileData }
 */
const signup = async (req, res, next) => {
    try {
        const { name, email, password, role, profileData } = req.body;

        if (!name || !email || !password || !role) {
            return sendError(res, 'Missing required fields: name, email, password, and role.', 400);
        }

        const result = await signupUser({ name, email, password, role, profileData });

        // Signup now returns requiresVerification instead of a JWT
        if (result.requiresVerification) {
            return res.status(201).json({
                success: true,
                requiresVerification: true,
                email: result.email,
                message: result.message,
            });
        }

        return sendSuccess(res, result, 201);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return sendError(res, 'Missing required fields: email and password.', 400);
        }

        const result = await loginUser({ email, password });

        // If user is unverified, return verification-required response
        if (result.requiresVerification) {
            return res.status(403).json({
                success: false,
                requiresVerification: true,
                email: result.email,
                message: result.message,
            });
        }

        // Audit log: successful login
        if (result.user) {
            logAudit(ACTIONS.LOGIN, {
                actorId: result.user.userId,
                actorRole: result.user.role,
                metadata: { email },
            });
        }

        return sendSuccess(res, result, 200);
    } catch (error) {
        // Audit log: failed login
        logAudit(ACTIONS.LOGIN_FAILED, {
            metadata: { email, reason: error.message },
        });
        next(error);
    }
};

/**
 * POST /api/auth/verify-email
 * Body: { email, otp }
 */
const verifyEmailHandler = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return sendError(res, 'Email and verification code are required.', 400);
        }

        const result = await verifyEmail({ email, otp });
        return sendSuccess(res, result, 200);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/resend-otp
 * Body: { email }
 */
const resendOtpHandler = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return sendError(res, 'Email is required.', 400);
        }

        const result = await resendOtp({ email });
        return sendSuccess(res, result, 200);
    } catch (error) {
        next(error);
    }
};

module.exports = { signup, login, verifyEmail: verifyEmailHandler, resendOtp: resendOtpHandler };
