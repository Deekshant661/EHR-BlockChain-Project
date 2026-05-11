'use strict';

const { connectGateway } = require('../fabric/networkConnection');
const { ROLE_CONFIG } = require('../fabric/constants');
const { findUserByUserId } = require('../db/database');

/**
 * Submit a transaction (read-write) to the chaincode.
 * Replaces the old invoke.js module.
 *
 * @param {string} userId        – Wallet identity to connect as.
 * @param {string} functionName  – Chaincode function name.
 * @param {Object} args          – Arguments object (will be JSON-stringified).
 * @param {string} [orgName]     – Org name for CCP lookup (auto-resolved if omitted).
 * @returns {*} Parsed chaincode response.
 */
const submitTransaction = async (userId, functionName, args, orgName) => {
    // Auto-resolve org from role config if not provided
    if (!orgName) {
        orgName = resolveOrg(userId);
    }

    const { gateway, contract } = await connectGateway(userId, orgName);

    try {
        console.log(`[Tx:submit] ${functionName} by ${userId} →`, JSON.stringify(args));
        let result = await contract.submitTransaction(functionName, JSON.stringify(args));
        result = JSON.parse(result);
        console.log(`[Tx:submit] ${functionName} response:`, result);
        return result;
    } finally {
        gateway.disconnect();
    }
};

/**
 * Evaluate a transaction (read-only query) against the chaincode.
 * Replaces the old query.js module.
 */
const evaluateTransaction = async (userId, functionName, args, orgName) => {
    if (!orgName) {
        orgName = resolveOrg(userId);
    }

    const { gateway, contract } = await connectGateway(userId, orgName);

    try {
        console.log(`[Tx:eval] ${functionName} by ${userId} →`, JSON.stringify(args));
        let result = await contract.evaluateTransaction(functionName, JSON.stringify(args));
        result = JSON.parse(result);
        console.log(`[Tx:eval] ${functionName} response length:`, Array.isArray(result) ? result.length : typeof result);
        return result;
    } finally {
        gateway.disconnect();
    }
};

/**
 * Resolve the correct Fabric org for a userId by checking:
 * 1. The database user record for role → ROLE_CONFIG mapping
 * 2. The wallet userMeta for stored orgName
 * 3. Default to Org1 as fallback
 */
const resolveOrg = (userId) => {
    // Try to resolve from SQLite user record
    try {
        const user = findUserByUserId(userId);
        if (user && user.orgName) {
            return user.orgName;
        }
        if (user && user.role && ROLE_CONFIG[user.role]) {
            return ROLE_CONFIG[user.role].org;
        }
    } catch (err) {
        console.warn(`[Tx] Could not resolve org from DB for ${userId}:`, err.message);
    }

    // Try wallet metadata
    try {
        const { getUserMeta } = require('../fabric/identityManager');
        const meta = getUserMeta(userId);
        if (meta && meta.orgName) {
            return meta.orgName;
        }
    } catch (err) {
        console.warn(`[Tx] Could not resolve org from wallet meta for ${userId}:`, err.message);
    }

    // Default to Org1 — the gateway discovery will handle cross-org peers
    return 'Org1';
};

module.exports = { submitTransaction, evaluateTransaction };
