'use strict';

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { sendSuccess } = require('../middleware/responseFormatter');
const { getRecentActivity, getAuditStats } = require('../services/auditService');

// ─── Recent Audit Logs (paginated) ──────────────────────────────────────────
// GET /api/audit/recent?limit=20
router.get('/recent',
    verifyToken, requireRole(['hospital', 'insuranceAdmin']),
    (req, res) => {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const activity = getRecentActivity(limit);
        const stats = getAuditStats();
        return sendSuccess(res, { activity, stats });
    }
);

module.exports = router;
