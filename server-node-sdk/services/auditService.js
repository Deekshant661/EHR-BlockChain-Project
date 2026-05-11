'use strict';

// ─── Enterprise Audit Logging Service ────────────────────────────────────────
// Centralized audit logging with severity levels and humanized descriptions.
// Fire-and-forget — never blocks the request pipeline.

const { insertAuditLog, getRecentAuditLogs, countAuditLogs, findUserByUserId, findUserByUUID } = require('../db/database');

// ─── Action Type Constants ───────────────────────────────────────────────────
const ACTIONS = {
    LOGIN: 'LOGIN',
    LOGIN_FAILED: 'LOGIN_FAILED',
    LOGOUT: 'LOGOUT',
    FILE_UPLOAD: 'FILE_UPLOAD',
    FILE_DOWNLOAD: 'FILE_DOWNLOAD',
    GRANT_ACCESS: 'GRANT_ACCESS',
    REVOKE_ACCESS: 'REVOKE_ACCESS',
    CREATE_CLAIM: 'CREATE_CLAIM',
    APPROVE_CLAIM: 'APPROVE_CLAIM',
    ISSUE_POLICY: 'ISSUE_POLICY',
    ADD_RECORD: 'ADD_RECORD',
    DASHBOARD_ACCESS: 'DASHBOARD_ACCESS',
};

// ─── Severity Mapping ────────────────────────────────────────────────────────
const SEVERITY = {
    LOGIN: 'info',
    LOGIN_FAILED: 'critical',
    LOGOUT: 'info',
    FILE_UPLOAD: 'info',
    FILE_DOWNLOAD: 'info',
    GRANT_ACCESS: 'info',
    REVOKE_ACCESS: 'warning',
    CREATE_CLAIM: 'info',
    APPROVE_CLAIM: 'info',
    ISSUE_POLICY: 'info',
    ADD_RECORD: 'info',
    DASHBOARD_ACCESS: 'info',
};

// ─── Name Resolution Cache ──────────────────────────────────────────────────
// Lightweight cache to avoid repeated DB lookups during humanization
const nameCache = new Map();

const resolveName = (id) => {
    if (!id) return 'Unknown';
    if (nameCache.has(id)) return nameCache.get(id);

    try {
        let user = findUserByUserId(id);
        if (!user) user = findUserByUUID(id);
        if (user) {
            nameCache.set(id, user.name);
            return user.name;
        }
    } catch { /* non-critical */ }

    // Return a shortened ID if no name found
    const short = id.length > 12 ? id.slice(0, 12) + '...' : id;
    nameCache.set(id, short);
    return short;
};

// ─── Humanized Description Generator ─────────────────────────────────────────
const humanize = (log) => {
    const actor = resolveName(log.actorId);
    const target = log.targetId ? resolveName(log.targetId) : '';
    let meta = {};
    try { meta = log.metadata ? JSON.parse(log.metadata) : {}; } catch { meta = {}; }

    switch (log.actionType) {
        case ACTIONS.LOGIN:
            return `${actor} logged in`;
        case ACTIONS.LOGIN_FAILED:
            return `Failed login attempt for ${meta.email || 'unknown user'}`;
        case ACTIONS.LOGOUT:
            return `${actor} logged out`;
        case ACTIONS.FILE_UPLOAD:
            return `${actor} uploaded ${meta.fileName || 'a medical file'}`;
        case ACTIONS.FILE_DOWNLOAD:
            return `${actor} downloaded ${meta.fileName || 'a medical file'}`;
        case ACTIONS.GRANT_ACCESS:
            return `${actor} granted access to ${target || 'a doctor'}`;
        case ACTIONS.REVOKE_ACCESS:
            return `${actor} revoked access from ${target || 'a doctor'}`;
        case ACTIONS.CREATE_CLAIM:
            return `${actor} filed an insurance claim${meta.description ? ': ' + meta.description.slice(0, 50) : ''}`;
        case ACTIONS.APPROVE_CLAIM:
            return `${actor} ${(meta.decision || 'processed').toLowerCase()} a claim${meta.reason ? ' — ' + meta.reason.slice(0, 40) : ''}`;
        case ACTIONS.ISSUE_POLICY:
            return `${actor} issued a ${meta.policyType || ''} insurance policy`;
        case ACTIONS.ADD_RECORD:
            return `${actor} created a medical record${meta.diagnosis ? ': ' + meta.diagnosis.slice(0, 40) : ''}`;
        case ACTIONS.DASHBOARD_ACCESS:
            return `${actor} accessed the dashboard`;
        default:
            return `${actor} performed ${log.actionType}`;
    }
};

// ─── Severity Icon Mapping (for frontend) ────────────────────────────────────
const severityIcon = (severity) => {
    switch (severity) {
        case 'critical': return '🔴';
        case 'warning': return '🟡';
        default: return '🟢';
    }
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Log an audit event. Fire-and-forget — never throws.
 * @param {string} actionType – One of ACTIONS constants
 * @param {Object} opts – { actorId, actorRole, targetId, targetType, status, metadata }
 */
const logAudit = (actionType, opts = {}) => {
    const severity = SEVERITY[actionType] || 'info';
    insertAuditLog({
        actorId: opts.actorId || null,
        actorRole: opts.actorRole || null,
        actionType,
        severity,
        targetId: opts.targetId || null,
        targetType: opts.targetType || null,
        status: opts.status || 'success',
        metadata: opts.metadata || null,
    });
};

/**
 * Get recent audit logs with humanized descriptions.
 * @param {number} limit – Max entries (default 20)
 * @returns {Array} Enriched audit log entries
 */
const getRecentActivity = (limit = 20) => {
    const logs = getRecentAuditLogs(limit, 0);
    return logs.map((log) => ({
        id: log.id,
        timestamp: log.timestamp,
        actionType: log.actionType,
        severity: log.severity,
        severityIcon: severityIcon(log.severity),
        status: log.status,
        description: humanize(log),
        actorRole: log.actorRole,
    }));
};

/**
 * Get audit log statistics for dashboard cards.
 * @returns {Object}
 */
const getAuditStats = () => {
    const total = countAuditLogs();
    return { total };
};

module.exports = {
    ACTIONS,
    logAudit,
    getRecentActivity,
    getAuditStats,
};
