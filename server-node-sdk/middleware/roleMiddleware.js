'use strict';

const { sendError } = require('./responseFormatter');

/**
 * Role-based access control middleware factory.
 *
 * Returns an Express middleware that checks whether `req.user.role`
 * (set by verifyToken) is in the list of allowed roles.
 *
 * Usage in routes:
 *   router.post('/addRecord', verifyToken, requireRole(['doctor']), handler);
 *   router.post('/fetchLedger', verifyToken, handler);  // any authenticated user
 *
 * @param {string[]} allowedRoles – Array of roles permitted to access the route.
 * @returns {Function} Express middleware.
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return sendError(res, 'Authentication required before role check.', 401);
        }

        if (!allowedRoles.includes(req.user.role)) {
            return sendError(
                res,
                `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}.`,
                403
            );
        }

        next();
    };
};

module.exports = { requireRole };
