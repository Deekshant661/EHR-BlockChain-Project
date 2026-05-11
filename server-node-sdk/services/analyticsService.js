'use strict';

// ─── Backend Analytics Aggregation Service ───────────────────────────────────
// fetchLedger() only returns SIMPLE-KEY entries (patients, doctors, agents).
// Records, policies, claims use COMPOSITE KEYS and are INVISIBLE to fetchLedger.
// We must query them separately via per-patient chaincode functions.

const { connectGateway } = require('../fabric/networkConnection');
const { getAllUsers, countFiles, countAuditLogs } = require('../db/database');
const { getRecentActivity } = require('./auditService');

const SYSTEM_LEDGER_ACCOUNT = 'Hospital01';
const SYSTEM_LEDGER_ORG = 'Org1';

// ─── Cache ───────────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 60 * 1000; // 60s for composite data (expensive to fetch)
const cache = {};
const getCached = (key) => {
    const e = cache[key];
    return (e && (Date.now() - e.time) < CACHE_TTL_MS) ? e.data : null;
};
const setCache = (key, data) => { cache[key] = { data, time: Date.now() }; };
const invalidateCache = (key) => {
    if (key) delete cache[key];
    else Object.keys(cache).forEach(k => delete cache[k]);
};

// ─── Fetch ALL data (simple + composite keys) ────────────────────────────────
// Opens ONE gateway connection, then:
//   1. fetchLedger → patients, doctors, agents (simple keys)
//   2. For each patient: getAllRecordsByPatientId, getPoliciesByPatient, getAllClaimsByPatient
const fetchAllData = async () => {
    const cached = getCached('all_data');
    if (cached) return cached;

    const { gateway, contract } = await connectGateway(SYSTEM_LEDGER_ACCOUNT, SYSTEM_LEDGER_ORG);

    try {
        // Step 1: Simple keys
        console.log(`[Analytics] Fetching ledger via system account: ${SYSTEM_LEDGER_ACCOUNT}`);
        const rawLedger = await contract.evaluateTransaction('fetchLedger', JSON.stringify({}));
        const simpleLedger = JSON.parse(rawLedger.toString());
        console.log(`[Analytics] Simple-key entries: ${simpleLedger.length}`);

        // Classify simple entries
        const patients = [], doctors = [], agents = [];
        simpleLedger.forEach(e => {
            if (Array.isArray(e.authorizedDoctors)) patients.push(e);
            else if (e.hospitalId || e.hospitalName) doctors.push(e);
            else if (e.insuranceCompany || e.agentId) agents.push(e);
        });
        console.log(`[Analytics] Simple: ${patients.length} patients, ${doctors.length} doctors, ${agents.length} agents`);

        // Step 2: Composite keys — query per patient
        const patientIds = patients.map(p => p.patientId).filter(Boolean);
        console.log(`[Analytics] Fetching composite data for ${patientIds.length} patients...`);

        const allRecords = [], allPolicies = [], allClaims = [];
        const BATCH = 5;

        for (let i = 0; i < patientIds.length; i += BATCH) {
            const batch = patientIds.slice(i, i + BATCH);
            const promises = batch.flatMap(pid => [
                contract.evaluateTransaction('getAllRecordsByPatientId', JSON.stringify({ patientId: pid }))
                    .then(r => JSON.parse(r.toString())).catch(() => []),
                contract.evaluateTransaction('getPoliciesByPatient', JSON.stringify({ patientId: pid }))
                    .then(r => JSON.parse(r.toString())).catch(() => []),
                contract.evaluateTransaction('getAllClaimsByPatient', JSON.stringify({ patientId: pid }))
                    .then(r => JSON.parse(r.toString())).catch(() => []),
            ]);
            const results = await Promise.all(promises);
            for (let j = 0; j < batch.length; j++) {
                allRecords.push(...(results[j * 3] || []));
                allPolicies.push(...(results[j * 3 + 1] || []));
                allClaims.push(...(results[j * 3 + 2] || []));
            }
        }

        console.log(`[Analytics] Composite: ${allRecords.length} records, ${allPolicies.length} policies, ${allClaims.length} claims`);

        const result = { patients, doctors, agents, records: allRecords, policies: allPolicies, claims: allClaims };
        setCache('all_data', result);
        return result;
    } finally {
        gateway.disconnect();
    }
};

// ─── Hospital Admin Analytics ────────────────────────────────────────────────
const getHospitalAnalytics = async () => {
    const cached = getCached('hospital_analytics');
    if (cached) return cached;

    const { patients, doctors, agents, records, policies, claims } = await fetchAllData();
    const users = getAllUsers();
    const fileCount = countFiles();

    // Claims breakdown
    let approved = 0, rejected = 0, pending = 0;
    claims.forEach(c => {
        const s = (c.status || '').toUpperCase();
        if (s === 'APPROVED') approved++;
        else if (s === 'REJECTED') rejected++;
        else pending++;
    });

    // Doctor leaderboard
    const doctorRecordCounts = {};
    records.forEach(r => {
        const did = r.doctorId || 'Unknown';
        doctorRecordCounts[did] = (doctorRecordCounts[did] || 0) + 1;
    });
    const userMap = {};
    users.forEach(u => { userMap[u.uuid] = u.name; userMap[u.userId] = u.name; });

    const doctorLeaderboard = Object.entries(doctorRecordCounts)
        .map(([id, count]) => ({ id, name: userMap[id] || id.slice(0, 12), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

    // Monthly activity from records + claims
    const monthCounts = {};
    [...records, ...claims, ...policies].forEach(e => {
        const ts = e.timestamp || '';
        if (ts.length >= 7) {
            const m = ts.substring(0, 7);
            if (/^\d{4}-\d{2}$/.test(m)) monthCounts[m] = (monthCounts[m] || 0) + 1;
        }
    });
    const monthlyActivity = Object.entries(monthCounts)
        .sort((a, b) => a[0].localeCompare(b[0])).slice(-6)
        .map(([month, count]) => ({ month: month.substring(5), fullMonth: month, count }));

    // Consent count
    let totalConsents = 0;
    patients.forEach(p => { if (Array.isArray(p.authorizedDoctors)) totalConsents += p.authorizedDoctors.length; });

    const result = {
        metrics: {
            totalPatients: patients.length,
            totalDoctors: doctors.length,
            totalRecords: records.length,
            totalFiles: fileCount,
            totalPolicies: policies.length,
            totalClaims: claims.length,
            approvedClaims: approved,
            rejectedClaims: rejected,
            pendingClaims: pending,
            totalConsents,
            totalUsers: users.length,
            insuranceAgents: agents.length,
            ledgerEntries: patients.length + doctors.length + agents.length + records.length + policies.length + claims.length,
            auditLogCount: countAuditLogs(),
        },
        doctorLeaderboard,
        monthlyActivity,
        docTypeDistribution: [
            { type: 'patient', count: patients.length },
            { type: 'doctor', count: doctors.length },
            { type: 'medicalRecord', count: records.length },
            { type: 'policy', count: policies.length },
            { type: 'claim', count: claims.length },
            { type: 'insuranceAgent', count: agents.length },
        ].filter(d => d.count > 0).sort((a, b) => b.count - a.count),
        recentActivity: getRecentActivity(15),
    };

    setCache('hospital_analytics', result);
    return result;
};

// ─── Insurance Admin Analytics ───────────────────────────────────────────────
const getInsuranceAnalytics = async () => {
    const cached = getCached('insurance_analytics');
    if (cached) return cached;

    const { policies, claims } = await fetchAllData();
    const users = getAllUsers();
    const userMap = {};
    users.forEach(u => { userMap[u.uuid] = u.name; userMap[u.userId] = u.name; });

    let approved = 0, rejected = 0, pending = 0, totalCoverage = 0;
    const policyTypes = {}, claimantCounts = {}, monthClaims = {};
    const recentDecisions = [];

    policies.forEach(p => {
        const pt = p.policyType || 'Standard';
        policyTypes[pt] = (policyTypes[pt] || 0) + 1;
        totalCoverage += parseFloat(p.coverageAmount) || 0;
    });

    claims.forEach(c => {
        const s = (c.status || '').toUpperCase();
        if (s === 'APPROVED') approved++;
        else if (s === 'REJECTED') rejected++;
        else pending++;

        const pid = c.patientId || 'Unknown';
        claimantCounts[pid] = (claimantCounts[pid] || 0) + 1;

        const ts = c.timestamp || c.reviewedAt || '';
        if (ts.length >= 7) {
            const m = ts.substring(0, 7);
            if (/^\d{4}-\d{2}$/.test(m)) monthClaims[m] = (monthClaims[m] || 0) + 1;
        }

        if ((s === 'APPROVED' || s === 'REJECTED') && recentDecisions.length < 10) {
            recentDecisions.push({
                claimId: (c.claimId || '').slice(0, 20),
                status: c.status, amount: c.claimAmount,
                reason: c.statusReason || c.description || '',
                patientName: userMap[pid] || pid.slice(0, 12),
            });
        }
    });

    const result = {
        metrics: {
            totalPolicies: policies.length, totalClaims: claims.length,
            approved, rejected, pending,
            approvalRate: claims.length > 0 ? Math.round((approved / claims.length) * 100) : 0,
            totalCoverage, auditLogCount: countAuditLogs(),
        },
        policyTypeBreakdown: Object.entries(policyTypes).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
        topClaimants: Object.entries(claimantCounts).map(([id, count]) => ({ id, name: userMap[id] || id.slice(0, 12), count })).sort((a, b) => b.count - a.count).slice(0, 6),
        claimTimeline: Object.entries(monthClaims).sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([month, count]) => ({ month: month.substring(5), fullMonth: month, count })),
        recentDecisions,
        recentActivity: getRecentActivity(15),
    };

    setCache('insurance_analytics', result);
    return result;
};

// ─── Ledger Data for Dashboard Tabs ──────────────────────────────────────────
const getLedgerData = async () => {
    const { patients, doctors, agents, records, policies, claims } = await fetchAllData();
    return [
        ...patients.map(e => ({ _type: 'patient', ...e })),
        ...doctors.map(e => ({ _type: 'doctor', ...e })),
        ...agents.map(e => ({ _type: 'insuranceAgent', ...e })),
        ...records.map(e => ({ _type: 'medicalRecord', ...e })),
        ...policies.map(e => ({ _type: 'policy', ...e })),
        ...claims.map(e => ({ _type: 'claim', ...e })),
    ];
};

// ─── System Health ───────────────────────────────────────────────────────────
const getSystemHealth = async () => {
    const cached = getCached('system_health');
    if (cached) return cached;

    const health = {
        fabric: { status: 'unknown', label: 'Fabric Network' },
        ipfs: { status: 'unknown', label: 'IPFS Gateway' },
        encryption: { status: 'unknown', label: 'AES Encryption' },
        ledger: { status: 'unknown', label: 'Ledger Sync' },
        wallet: { status: 'unknown', label: 'Wallet Identities' },
        database: { status: 'unknown', label: 'SQLite Database' },
    };

    try { const u = getAllUsers(); health.database.status = u.length > 0 ? 'healthy' : 'degraded'; } catch { health.database.status = 'error'; }

    try {
        const k = process.env.AES_ENCRYPTION_KEY;
        health.encryption.status = (k && k.length === 64 && Buffer.from(k, 'hex').length === 32) ? 'healthy' : 'error';
    } catch { health.encryption.status = 'error'; }

    health.ipfs.status = (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_API_KEY) ? 'healthy' : 'degraded';

    try {
        const { identityExists } = require('../fabric/identityManager');
        health.wallet.status = (await identityExists(SYSTEM_LEDGER_ACCOUNT)) ? 'healthy' : 'degraded';
    } catch { health.wallet.status = 'error'; }

    try {
        const data = await fetchAllData();
        health.fabric.status = 'healthy';
        const total = data.patients.length + data.records.length + data.policies.length + data.claims.length;
        health.ledger.status = total > 0 ? 'healthy' : 'degraded';
    } catch { health.fabric.status = 'error'; health.ledger.status = 'error'; }

    setCache('system_health', health);
    return health;
};

module.exports = { getHospitalAnalytics, getInsuranceAnalytics, getSystemHealth, getLedgerData, invalidateCache };
