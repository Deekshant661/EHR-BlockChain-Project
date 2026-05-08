'use strict';

const path = require('path');

// ─── Network Constants ───────────────────────────────────────────────────────
const CHANNEL_NAME = 'mychannel';
const CHAINCODE_NAME = 'ehrChainCode';
const WALLET_PATH = path.join(__dirname, '..', 'wallet');

// ─── Organization Configurations ─────────────────────────────────────────────
const ORG_CONFIG = {
    Org1: {
        mspId: 'Org1MSP',
        caName: 'ca.org1.example.com',
        adminIdentity: 'hospitalAdmin',
        adminEnrollId: 'admin',
        adminEnrollSecret: 'adminpw',
        affiliation: 'org1.department1',
        connectionProfilePath: path.resolve(
            __dirname, '..', '..', 'fabric-samples', 'test-network',
            'organizations', 'peerOrganizations', 'org1.example.com',
            'connection-org1.json'
        ),
    },
    Org2: {
        mspId: 'Org2MSP',
        caName: 'ca.org2.example.com',
        adminIdentity: 'insuranceAdmin',
        adminEnrollId: 'admin',
        adminEnrollSecret: 'adminpw',
        affiliation: 'org2.department1',
        connectionProfilePath: path.resolve(
            __dirname, '..', '..', 'fabric-samples', 'test-network',
            'organizations', 'peerOrganizations', 'org2.example.com',
            'connection-org2.json'
        ),
    },
};

// ─── Role → Org/Chaincode Mapping ────────────────────────────────────────────
// Each role maps to its Fabric org, the chaincode role attribute value,
// the chaincode onboarding function (if any), and which identity submits it.
const ROLE_CONFIG = {
    patient: {
        org: 'Org1',
        chaincodeRole: 'patient',
        chaincodeOnboard: 'onboardPatient',
        onboardIdentity: 'hospitalAdmin',
    },
    doctor: {
        org: 'Org1',
        chaincodeRole: 'doctor',
        chaincodeOnboard: 'onboardDoctor',
        onboardIdentity: 'Hospital01', // must be a 'hospital' role identity
    },
    hospital: {
        org: 'Org1',
        chaincodeRole: 'hospital',
        chaincodeOnboard: null,
        onboardIdentity: null,
    },
    insuranceAgent: {
        org: 'Org2',
        chaincodeRole: 'insuranceAgent',
        chaincodeOnboard: 'onboardInsurance',
        onboardIdentity: 'insuranceCompany01', // must be an 'insuranceAdmin' role identity
    },
    insuranceAdmin: {
        org: 'Org2',
        chaincodeRole: 'insuranceAdmin',
        chaincodeOnboard: null,
        onboardIdentity: null,
    },
};

const VALID_ROLES = Object.keys(ROLE_CONFIG);

// Roles available for public signup (excludes operational identities)
const SIGNUP_ROLES = ['patient', 'doctor', 'insuranceAgent'];

// Prefix map for auto-generated userIds: role → prefix
const ROLE_PREFIX = {
    patient: 'pat',
    doctor: 'doc',
    insuranceAgent: 'ins',
    hospital: 'hosp',
    insuranceAdmin: 'iadm',
};

module.exports = {
    CHANNEL_NAME,
    CHAINCODE_NAME,
    WALLET_PATH,
    ORG_CONFIG,
    ROLE_CONFIG,
    VALID_ROLES,
    SIGNUP_ROLES,
    ROLE_PREFIX,
};
