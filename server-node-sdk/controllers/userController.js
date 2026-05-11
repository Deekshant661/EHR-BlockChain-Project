'use strict';

const { signupUser } = require('../services/enrollmentService');
const { getAllUsers } = require('../db/database');
const { sendSuccess, sendError } = require('../middleware/responseFormatter');

/**
 * POST /api/users/enroll
 * Body: { userId, role, profileData: { name, city, dob, hospitalName, insuranceCompany } }
 */
const enroll = async (req, res, next) => {
    try {
        const { userId, role, profileData } = req.body;

        if (!userId || !role) {
            return sendError(res, 'Missing required fields: userId and role.', 400);
        }

        const result = await signupUser({ userId, role, profileData });
        return sendSuccess(res, result, 201);
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/users/directory
 * Admin-only: Returns user list with isSynthetic flag for Demo User badges.
 * Excludes sensitive fields (passwordHash, verificationCode, etc.)
 */
const getUserDirectory = async (req, res, next) => {
    try {
        const users = getAllUsers();
        const sanitized = users.map((u) => ({
            name: u.name,
            email: u.email,
            role: u.role,
            userId: u.userId,
            uuid: u.uuid,
            orgName: u.orgName,
            isSynthetic: u.isSynthetic === 1,
            createdAt: u.createdAt,
        }));
        return sendSuccess(res, sanitized);
    } catch (error) {
        next(error);
    }
};

module.exports = { enroll, getUserDirectory };
