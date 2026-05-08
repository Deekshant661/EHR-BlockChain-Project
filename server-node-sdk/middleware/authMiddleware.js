'use strict';

const jwt = require('jsonwebtoken');
const { sendError } = require('./responseFormatter');

/**
 * JWT verification middleware.
 *
 * Extracts the Bearer token from the Authorization header, verifies it,
 * and attaches the decoded payload to `req.user`.
 *
 * After this middleware runs, controllers MUST use `req.user.userId`
 * (not req.body.userId) for all Fabric transactions — this is the
 * verified, trusted identity.
 */
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return sendError(res, 'No token provided. Please include Authorization: Bearer <token>', 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return sendError(res, 'Malformed authorization header.', 401);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // decoded = { userId, email, role, uuid, orgName, iat, exp }
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return sendError(res, 'Token has expired. Please log in again.', 401);
        }
        if (err.name === 'JsonWebTokenError') {
            return sendError(res, 'Invalid token. Please log in again.', 401);
        }
        return sendError(res, 'Authentication failed.', 401);
    }
};

module.exports = { verifyToken };
