'use strict';

/**
 * Standardized API response helpers.
 * Every response follows: { success: boolean, data|message: ... }
 */

const sendSuccess = (res, data, statusCode = 200) => {
    return res.status(statusCode).json({ success: true, data });
};

const sendError = (res, message, statusCode = 400) => {
    return res.status(statusCode).json({ success: false, message });
};

module.exports = { sendSuccess, sendError };
