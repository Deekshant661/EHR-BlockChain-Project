'use strict';

const fs = require('fs');
const { Wallets, Gateway } = require('fabric-network');
const { WALLET_PATH, ORG_CONFIG, CHANNEL_NAME, CHAINCODE_NAME } = require('./constants');

/**
 * Port-to-hostname mapping for Fabric test-network containers.
 * When running inside Docker (FABRIC_AS_LOCALHOST=false), the connection
 * profile's localhost:PORT URLs must be rewritten to HOSTNAME:PORT so the
 * SDK can reach the peers/orderers/CAs via Docker DNS.
 */
const FABRIC_PORT_MAP = {
    '7051': 'peer0.org1.example.com',
    '9051': 'peer0.org2.example.com',
    '7050': 'orderer.example.com',
    '7054': 'ca_org1',
    '8054': 'ca_org2',
    '9054': 'ca_orderer',
};

/**
 * Recursively rewrite localhost URLs in a connection profile object.
 * Replaces "localhost:PORT" with "DOCKER_HOSTNAME:PORT" for known ports.
 */
const rewriteLocalhostUrls = (obj) => {
    if (typeof obj === 'string') {
        return obj.replace(/localhost:(\d+)/g, (match, port) => {
            const host = FABRIC_PORT_MAP[port];
            return host ? `${host}:${port}` : match;
        });
    }
    if (Array.isArray(obj)) {
        return obj.map(rewriteLocalhostUrls);
    }
    if (obj && typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = rewriteLocalhostUrls(value);
        }
        return result;
    }
    return obj;
};

/**
 * Load and parse a Fabric connection profile JSON for the given org.
 * When FABRIC_AS_LOCALHOST=false, rewrites localhost URLs to Docker hostnames.
 */
const loadConnectionProfile = (orgName) => {
    const orgConfig = ORG_CONFIG[orgName];
    if (!orgConfig) {
        throw new Error(`Unknown organization: ${orgName}`);
    }
    const ccpPath = orgConfig.connectionProfilePath;
    if (!fs.existsSync(ccpPath)) {
        throw new Error(`Connection profile not found at: ${ccpPath}`);
    }
    let ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const asLocalhost = (process.env.FABRIC_AS_LOCALHOST || 'true') === 'true';
    if (!asLocalhost) {
        console.log(`[NetworkConnection] Docker mode: rewriting connection profile URLs for ${orgName}`);
        ccp = rewriteLocalhostUrls(ccp);
    }

    return ccp;
};

/**
 * Return a FileSystemWallet instance pointing to the wallet/ directory.
 */
const getWallet = async () => {
    return await Wallets.newFileSystemWallet(WALLET_PATH);
};

/**
 * Open a Gateway connection for a given user identity.
 * Returns { gateway, network, contract } — caller must call gateway.disconnect().
 */
const connectGateway = async (userId, orgName = 'Org1') => {
    const wallet = await getWallet();

    const identity = await wallet.get(userId);
    if (!identity) {
        throw new Error(`Identity for user "${userId}" not found in wallet`);
    }

    const ccp = loadConnectionProfile(orgName);
    const gateway = new Gateway();
    const asLocalhost = (process.env.FABRIC_AS_LOCALHOST || 'true') === 'true';
    await gateway.connect(ccp, {
        wallet,
        identity: userId,
        discovery: { enabled: true, asLocalhost },
        eventHandlerOptions: { commitTimeout: 30 },
        queryHandlerOptions: { timeout: 30 },
    });

    // Race against a timeout to prevent infinite hang during peer discovery
    const networkPromise = gateway.getNetwork(CHANNEL_NAME);
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(
            'Gateway network discovery timed out after 30s. Is the Fabric network running?'
        )), 30000)
    );
    const network = await Promise.race([networkPromise, timeoutPromise]);
    const contract = network.getContract(CHAINCODE_NAME);

    return { gateway, network, contract };
};

module.exports = {
    loadConnectionProfile,
    getWallet,
    connectGateway,
};
