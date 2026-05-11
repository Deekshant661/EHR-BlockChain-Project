'use strict';

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { sendSuccess, sendError } = require('../middleware/responseFormatter');
const {
    getHospitalAnalytics,
    getInsuranceAnalytics,
    getSystemHealth,
    getLedgerData,
    invalidateCache,
} = require('../services/analyticsService');
const { logAudit, ACTIONS, getRecentActivity } = require('../services/auditService');

// ─── Hospital Admin Analytics ────────────────────────────────────────────────
router.get('/analytics/hospital',
    verifyToken, requireRole(['hospital']),
    async (req, res, next) => {
        try {
            logAudit(ACTIONS.DASHBOARD_ACCESS, {
                actorId: req.user.userId, actorRole: req.user.role,
                metadata: { dashboard: 'hospital' },
            });
            const analytics = await getHospitalAnalytics(req.user.userId);
            return sendSuccess(res, analytics);
        } catch (error) { next(error); }
    }
);

// ─── Insurance Admin Analytics ───────────────────────────────────────────────
router.get('/analytics/insurance',
    verifyToken, requireRole(['insuranceAdmin']),
    async (req, res, next) => {
        try {
            logAudit(ACTIONS.DASHBOARD_ACCESS, {
                actorId: req.user.userId, actorRole: req.user.role,
                metadata: { dashboard: 'insurance' },
            });
            const analytics = await getInsuranceAnalytics(req.user.userId);
            return sendSuccess(res, analytics);
        } catch (error) { next(error); }
    }
);

// ─── System Health ───────────────────────────────────────────────────────────
router.get('/health',
    verifyToken, requireRole(['hospital', 'insuranceAdmin']),
    async (req, res, next) => {
        try {
            const health = await getSystemHealth(req.user.userId);
            return sendSuccess(res, health);
        } catch (error) { next(error); }
    }
);

// ─── Ledger Data (System Account Bypass) ─────────────────────────────────────
// Returns raw ledger via Hospital Admin system account.
// Frontend ledger tabs should use THIS instead of ehrAPI.fetchLedger().
router.get('/ledger',
    verifyToken, requireRole(['hospital', 'insuranceAdmin']),
    async (req, res, next) => {
        try {
            logAudit(ACTIONS.DASHBOARD_ACCESS, {
                actorId: req.user.userId, actorRole: req.user.role,
                metadata: { action: 'ledger_view' },
            });
            const ledger = await getLedgerData();
            return sendSuccess(res, ledger);
        } catch (error) { next(error); }
    }
);

// ─── Cache Invalidation ─────────────────────────────────────────────────────
router.post('/invalidate-cache',
    verifyToken, requireRole(['hospital', 'insuranceAdmin']),
    (req, res) => {
        invalidateCache();
        return sendSuccess(res, { message: 'Analytics cache cleared' });
    }
);

// ─── Live Activity Feed ──────────────────────────────────────────────────────
router.get('/activity/live',
    verifyToken, requireRole(['hospital', 'insuranceAdmin']),
    (req, res) => {
        const limit = Math.min(parseInt(req.query.limit) || 15, 50);
        const activity = getRecentActivity(limit);
        return sendSuccess(res, activity);
    }
);

module.exports = router;
