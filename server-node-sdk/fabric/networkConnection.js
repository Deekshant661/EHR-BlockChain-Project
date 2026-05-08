'use strict';

const fs = require('fs');
const { Wallets, Gateway } = require('fabric-network');
const { WALLET_PATH, ORG_CONFIG, CHANNEL_NAME, CHAINCODE_NAME } = require('./constants');

/**
 * Load and parse a Fabric connection profile JSON for the given org.
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
    return JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
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
    await gateway.connect(ccp, {
        wallet,
        identity: userId,
        discovery: { enabled: true, asLocalhost: true },
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
