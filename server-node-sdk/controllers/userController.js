'use strict';

const { signupUser } = require('../services/enrollmentService');
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

module.exports = { enroll };
