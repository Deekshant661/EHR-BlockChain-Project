'use strict';

const { registerAndEnrollUser, getUserMeta } = require('../fabric/identityManager');
const { connectGateway } = require('../fabric/networkConnection');
const { ROLE_CONFIG, VALID_ROLES, ORG_CONFIG } = require('../fabric/constants');

/**
 * Full signup orchestration:
 *   1. Validate inputs
 *   2. Register & enroll the user with the Fabric CA
 *   3. Submit the role-specific chaincode onboarding transaction (if applicable)
 *
 * @param {Object} opts
 * @param {string} opts.userId      – Human-readable login ID.
 * @param {string} opts.role        – One of VALID_ROLES.
 * @param {Object} opts.profileData – Role-specific profile fields (name, city, etc.)
 * @returns {Object} Signup result including userId, uuid, and chaincode response.
 */
const signupUser = async ({ userId, role, profileData = {} }) => {
    // ── Validate ─────────────────────────────────────────────────────────────
    if (!userId || !role) {
        throw new Error('Missing required fields: userId and role are required.');
    }

    if (!VALID_ROLES.includes(role)) {
        throw new Error(`Invalid role "${role}". Must be one of: ${VALID_ROLES.join(', ')}`);
    }

    const roleConfig = ROLE_CONFIG[role];
    const orgName = roleConfig.org;
    const adminLabel = ORG_CONFIG[orgName].adminIdentity;

    // ── Register & Enroll ────────────────────────────────────────────────────
    const { uuid, mspId } = await registerAndEnrollUser({
        userId,
        role: roleConfig.chaincodeRole,
        orgName,
        adminLabel,
    });

    // ── Chaincode Onboarding ─────────────────────────────────────────────────
    let chaincodeResult = null;

    if (roleConfig.chaincodeOnboard) {
        const onboardIdentity = roleConfig.onboardIdentity;

        let onboardArgs = {};

        if (role === 'patient') {
            onboardArgs = {
                patientId: uuid,
                name: profileData.name || userId,
                dob: profileData.dob || '',
                city: profileData.city || '',
            };
        } else if (role === 'doctor') {
            onboardArgs = {
                doctorId: uuid,
                hospitalName: profileData.hospitalName || 'Default Hospital',
                name: profileData.name || userId,
                city: profileData.city || '',
            };
        } else if (role === 'insuranceAgent') {
            onboardArgs = {
                agentId: uuid,
                insuranceCompany: profileData.insuranceCompany || 'Default Insurance Co',
                name: profileData.name || userId,
                city: profileData.city || '',
            };
        }

        // Connect using the designated onboard identity
        const { gateway, contract } = await connectGateway(onboardIdentity, roleConfig.org);

        try {
            console.log(`[Enrollment] Calling ${roleConfig.chaincodeOnboard} with:`, onboardArgs);
            const buffer = await contract.submitTransaction(
                roleConfig.chaincodeOnboard,
                JSON.stringify(onboardArgs)
            );
            chaincodeResult = buffer.toString();
            console.log(`[Enrollment] Chaincode onboard result:`, chaincodeResult);
        } finally {
            gateway.disconnect();
        }
    }

    return {
        userId,
        uuid,
        role,
        mspId,
        chaincodeResult,
        message: `User "${userId}" enrolled successfully as ${role}.`,
    };
};

module.exports = { signupUser };
