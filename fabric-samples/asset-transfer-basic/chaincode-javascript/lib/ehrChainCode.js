/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

// Deterministic stringify()
const stringify  = require('json-stringify-deterministic');
const sortKeysRecursive  = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');

class ehrChainCode extends Contract {


    //   1. Goverment - network owner - admin access
    //     2. Hospital - Network orgination - Read/Write (doctor data)
    //     3. Practicing physician/Doctor - Read/Write (Patient data w.r.t to hospital)
    //     4. Diagnostics center - Read/Write (Patient records w.r.t to diagnostics center)
    //     5. Pharmacies - Read/Write (Patient prescriptions w.r.t to pharma center)
    //     6. Researchers / R&D - Read data of hospital conect, pateint based on consent. 
    //     7. Insurance companies - Read/Write (Patient claims)
    //     8. Patient - Read/Write (All generated patient data)

    // data structure if patient 

    // patient-001: [{
    //     "patientId": "P001",
    //     "name": "John Doe",
    //     "dob": "1990-01-01",
    //     "authorizedDoctors": ["D001", "D002"]
    //  }]

    // "record-001":[
    //         {
    //         "recordId": "R001",
    //         "doctorId": "D001",
    //         "diagnosis": "Flu",
    //         "prescription": "Rest and hydration",
    //         "timestamp": "2024-01-01T10:00:00Z"
    //         }
    //     ],

    // generate recordId.
    recordIdGenerator(ctx){  
        const txId = ctx.stub.getTxID();  // always unique per transaction
         return `record-${txId}`; 
    }

    // onboard doctor in ledger by hospital 
    async onboardDoctor(ctx, args) {
        
        const { doctorId, hospitalName, name, city } = JSON.parse(args);
        console.log("ARGS-RAW:",args)
        console.log("ARGS:",doctorId, hospitalName, name, city)
        const { role, uuid: callerId } = this.getCallerAttributes(ctx);
        const orgMSP = ctx.clientIdentity.getMSPID();

        if (orgMSP !== 'Org1MSP' || role !== 'hospital') {
            throw new Error('Only hospital can onboard doctor.');
        }

        const doctorJSON = await ctx.stub.getState(doctorId);
        if (doctorJSON && doctorJSON.length > 0) {
            throw new Error(`Doctor ${doctorId} already registerd by ${callerId}`);
        }

        const recordId = this.recordIdGenerator(ctx);
        console.log("Record ID", recordId);
        
        const record = {
            recordId,
            doctorId,
            hospitalId: callerId,
            name,
            hospitalName,
            city,
           timestamp: ctx.stub.getTxTimestamp().seconds.low.toString()
        };

        const result = await ctx.stub.putState(doctorId, Buffer.from(stringify(record)));
        console.log('ONBOARD DOCTOR RESULT:',stringify(result))
        return stringify(record);
    }

      // onboard insurance agent by insurance company  
    async onboardInsurance(ctx, args){
        const {agentId, insuranceCompany, name, city} = JSON.parse(args);
        console.log("ARGS-RAW:",args)
        console.log("ARGS-split 4:",agentId, insuranceCompany, name, city)
        const { role, uuid: callerId } = this.getCallerAttributes(ctx);
         const orgMSP = ctx.clientIdentity.getMSPID();

        if (orgMSP !== 'Org2MSP' || role !== 'insuranceAdmin') {
            throw new Error('Only insurance org admin can onbord insurance agent');
        }
        
        const insuranceJSON = await ctx.stub.getState(agentId);
        console.log("INSURANCE DATA",insuranceJSON)
        if (insuranceJSON && insuranceJSON.length > 0) {
            throw new Error(`insurance ${agentId} already registerd by ${callerId}`);
        }

        const recordId = this.recordIdGenerator(ctx);
        console.log("Record ID", recordId);
        
        const record = {
            recordId,
            agentId,
            insuranceId: callerId,
            name,
            insuranceCompany,
            city,
            timestamp: ctx.stub.getTxTimestamp().seconds.low.toString()
        };

        await ctx.stub.putState(agentId, Buffer.from(stringify(record)));
        return stringify(record);
    }

    // this function 
   async grantAccess(ctx, args) {
    const {patientId, doctorIdToGrant} = JSON.parse(args);
    console.log("ARGS-RWA", args)
    console.log("ARGS", patientId, doctorIdToGrant)
        
     const { role, uuid: callerId } = this.getCallerAttributes(ctx);

        if (role !== 'patient') {
            throw new Error('Only patients can grant access');
        }

        if (callerId !== patientId) {
            throw new Error('Caller is not the owner of this patient record');
        }

        const patientJSON = await ctx.stub.getState(patientId);
        if (!patientJSON || patientJSON.length === 0) {
            throw new Error(`Patient ${patientId} not found`);
        }

        const patient = JSON.parse(patientJSON.toString());

        if (patient.authorizedDoctors.includes(doctorIdToGrant)) {
            throw new Error(`Doctor ${doctorIdToGrant} already authorized`);
        }

        patient.authorizedDoctors.push(doctorIdToGrant);
        await ctx.stub.putState(patientId, Buffer.from(stringify(patient)));

        return `Access granted to doctor ${doctorIdToGrant}`;
    }

    getCallerAttributes(ctx) {
      const role = ctx.clientIdentity.getAttributeValue('role');
      const uuid = ctx.clientIdentity.getAttributeValue('uuid');

      if (!role || !uuid) {
          throw new Error('Missing role or uuid in client certificate');
      }

      return { role, uuid };
    }

     // add record | only doctor can add record
     // 1. first patient need to grand access to doctor to add record.
    // async addRecord(ctx, patientId, recordId, diagnosis, prescription) {
    //     const { role, uuid: callerId } = this.getCallerAttributes(ctx);

    //     if (role !== 'doctor') {
    //         throw new Error('Only doctors can add records');
    //     }

    //     const patientJSON = await ctx.stub.getState(patientId);
    //     if (!patientJSON || patientJSON.length === 0) {
    //         throw new Error(`Patient ${patientId} not found`);
    //     }

    //     const patient = JSON.parse(patientJSON.toString());

    //     if (!patient.authorizedDoctors.includes(callerId)) {
    //         throw new Error(`Doctor ${callerId} is not authorized`);
    //     }

    //     const record = {
    //         recordId,
    //         doctorId: callerId,
    //         diagnosis,
    //         prescription,
    //        timestamp: ctx.stub.getTxTimestamp().seconds.low.toString()
    //     };

    //     patient.records.push(record);
    //     await ctx.stub.putState(patientId, Buffer.from(stringify(patient)));

    //     return `Record ${recordId} added by doctor ${callerId}`;
    // }

    async onboardPatient(ctx, args) {
        
        const {patientId, name, dob, city} = JSON.parse(args);

        console.log("ARGS-RWA", args)
        console.log("ARGS-split 4", patientId, name, dob, city)


        const key = `patient-${patientId}`;

        const existing = await ctx.stub.getState(key);
        if (existing && existing.length > 0) {
            throw new Error(`Patient ${patientId} already exists`);
        }

        const patient = {
            patientId,
            name,
            dob,
            city,
            authorizedDoctors: []
        };

        await ctx.stub.putState(key, Buffer.from(JSON.stringify(patient)));
        return `Patient ${patientId} registered`;
    }

    async addRecord(ctx, args) {

        const {patientId, diagnosis, prescription} = JSON.parse(args);
        console.log("ARGS_RAW",args)
        console.log("ARGS", patientId, diagnosis, prescription)
        const { role, uuid: callerId } = this.getCallerAttributes(ctx);

        if (role !== 'doctor') {
            throw new Error('Only doctors can add records');
        }

        const patientJSON = await ctx.stub.getState(`patient-${patientId}`);
        if (!patientJSON || patientJSON.length === 0) {
            throw new Error(`Patient ${patientId} not found`);
        }

        console.log("==patient record==",patientJSON);
        const patient = JSON.parse(patientJSON.toString());
        
        console.log("==patient record parsed==",patient);
        
        if (!patient.authorizedDoctors.includes(callerId)) {
            throw new Error(`Doctor ${callerId} is not authorized for patient ${patientId}`);
        }

        const txId = ctx.stub.getTxID();
        const recordId = `R-${txId}`;
        const timestamp = new Date(ctx.stub.getTxTimestamp().seconds.low * 1000).toISOString();

        const recordKey = ctx.stub.createCompositeKey('record', [patientId, recordId]);

        const record = {
            recordId,
            patientId,
            doctorId: callerId,
            diagnosis,
            prescription,
            timestamp
        };

        await ctx.stub.putState(recordKey, Buffer.from(JSON.stringify(record)));
        return JSON.stringify({message: `Record ${recordId} added for patient ${patientId}`});
    }

    async getAllRecordsByPatientId(ctx, args) {
        const {patientId} = JSON.parse(args);
        const iterator = await ctx.stub.getStateByPartialCompositeKey('record', [patientId]);
        const results = [];

        for await (const res of iterator) {
            results.push(JSON.parse(res.value.toString('utf8')));
        }

        return JSON.stringify(results);
    }

    async getRecordById(ctx, args) {
        const {patientId, recordId} = JSON.parse(args);
        const recordKey = ctx.stub.createCompositeKey('record', [patientId, recordId]);
        const recordJSON = await ctx.stub.getState(recordKey);

        if (!recordJSON || recordJSON.length === 0) {
            throw new Error(`Record ${recordId} not found for patient ${patientId}`);
        }

        return recordJSON.toString();
    }

    async grantAccess(ctx, args) {
        const {patientId, doctorIdToGrant} = JSON.parse(args);
        console.log("ARGS-grand access", args);
        console.log("ARGS grand access", patientId, doctorIdToGrant);

        const { role, uuid: callerId } = this.getCallerAttributes(ctx);

        if (role !== 'patient') {
            throw new Error('Only patients can grant access');
        }

        if (callerId !== patientId) {
            throw new Error('Caller is not the owner of this patient record');
        }

        const key = `patient-${patientId}`;
        const patientJSON = await ctx.stub.getState(key);
        if (!patientJSON || patientJSON.length === 0) {
            throw new Error(`Patient ${patientId} not found`);
        }

        const patient = JSON.parse(patientJSON.toString());

        if (!patient.authorizedDoctors.includes(doctorIdToGrant)) {
            patient.authorizedDoctors.push(doctorIdToGrant);
            await ctx.stub.putState(key, Buffer.from(JSON.stringify(patient)));
        }

        return JSON.stringify({message:`Doctor ${doctorIdToGrant} authorized`});
    }

    // GetAllAssets returns all assets found in the world state.
    async fetchLedger(ctx) {
        // call by admin only 
        const { role, uuid: callerId } = this.getCallerAttributes(ctx);

        if (role !== 'hospital') {
            throw new Error('Only hospital can fetch blockchain ledger');
        }

        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return stringify(allResults);
    }

    async queryHistoryOfAsset(ctx, args) {
        const {assetId} = JSON.parse(args);
        const iterator = await ctx.stub.getHistoryForKey(assetId);
        const results = [];

        while (true) {
            const res = await iterator.next();

            if (res.value) {
                const tx = {
                    txId: res.value.txId,
                    timestamp: res.value.timestamp ? res.value.timestamp.toISOString() : null,
                    isDelete: res.value.isDelete,
                };

                try {
                    if (res.value.value && res.value.value.length > 0 && !res.value.isDelete) {
                        tx.asset = JSON.parse(res.value.value.toString('utf8'));
                    }
                } catch (err) {
                    tx.asset = null;
                }

                results.push(tx);
            }

            if (res.done) {
                await iterator.close();
                break;
            }
        }

        return results;
    }


    // get patient details by id

    // get all patient 

    // get patient record by doctor

    // issue insurance 

    // create claim 

    // get claim info

    // approve claim


// get patient details by id
    async getPatientById(ctx, args) {
        const {patientId} = JSON.parse(args);
        console.log("ARGS-RAW getPatientById:", args);
        console.log("ARGS getPatientById:", patientId);
 
        const { role, uuid: callerId } = this.getCallerAttributes(ctx);
 
        const key = `patient-${patientId}`;
        const patientJSON = await ctx.stub.getState(key);
 
        if (!patientJSON || patientJSON.length === 0) {
            throw new Error(`Patient ${patientId} not found`);
        }
 
        // patients can only view their own record
        if (role === 'patient' && callerId !== patientId) {
            throw new Error('Patients can only view their own record');
        }
 
        // doctors must be authorized for this patient
        if (role === 'doctor') {
            const patient = JSON.parse(patientJSON.toString());
            if (!patient.authorizedDoctors.includes(callerId)) {
                throw new Error(`Doctor ${callerId} is not authorized for patient ${patientId}`);
            }
        }
 
        console.log("getPatientById result:", patientJSON.toString());
        return patientJSON.toString();
    }
 
    // get all patients — hospital only
    async getAllPatients(ctx) {
        console.log("getAllPatients called");
        const { role, uuid: callerId } = this.getCallerAttributes(ctx);
        console.log("getAllPatients caller:", callerId, "role:", role);
 
        if (role !== 'hospital') {
            throw new Error('Only hospital staff can fetch all patients');
        }
 
        const allResults = [];
        // range query: 'patient-' prefix — 'patient.' is the exclusive upper bound
        // because '.' comes right after '-' in ASCII for all patient-<id> keys
        const iterator = await ctx.stub.getStateByRange('patient-', 'patient.');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
 
        console.log("getAllPatients total:", allResults.length);
        return JSON.stringify(allResults);
    }
 
    // get patient records by doctor — returns all records written by a specific doctor
    async getRecordsByDoctor(ctx, args) {
        const {doctorId} = JSON.parse(args);
        console.log("ARGS-RAW getRecordsByDoctor:", args);
        console.log("ARGS getRecordsByDoctor:", doctorId);
 
        const { role, uuid: callerId } = this.getCallerAttributes(ctx);
 
        // doctors can only see their own records; hospitals can see any doctor's records
        if (role === 'doctor' && callerId !== doctorId) {
            throw new Error('Doctors can only view records they have written');
        }
 
        if (role !== 'doctor' && role !== 'hospital') {
            throw new Error(`Role '${role}' is not permitted to use getRecordsByDoctor`);
        }
 
        // scan all composite-key records and filter by doctorId
        const iterator = await ctx.stub.getStateByPartialCompositeKey('record', []);
        const results = [];
 
        for await (const res of iterator) {
            try {
                const record = JSON.parse(res.value.toString('utf8'));
                if (record.doctorId === doctorId) {
                    results.push(record);
                }
            } catch (err) {
                console.log("getRecordsByDoctor parse error:", err);
            }
        }
 
        console.log("getRecordsByDoctor results for", doctorId, ":", results.length);
        return JSON.stringify(results);
    }
 
    // issue insurance — insurance agent issues a policy to a patient
    // stored under composite key: policy | [patientId, policyId]
    async issueInsurance(ctx, args) {
        const {patientId, coverageAmount, policyType, validFrom, validTo} = JSON.parse(args);
        console.log("ARGS-RAW issueInsurance:", args);
        console.log("ARGS issueInsurance:", patientId, coverageAmount, policyType, validFrom, validTo);
 
        const { role, uuid: callerId } = this.getCallerAttributes(ctx);
 
        if (role !== 'insuranceAgent' && role !== 'insuranceAdmin') {
            throw new Error('Only insurance agents can issue policies');
        }
 
        // verify patient exists
        const patientJSON = await ctx.stub.getState(`patient-${patientId}`);
        if (!patientJSON || patientJSON.length === 0) {
            throw new Error(`Patient ${patientId} not found`);
        }
 
        const txId = ctx.stub.getTxID();
        const policyId = `POL-${txId}`;
        const timestamp = new Date(ctx.stub.getTxTimestamp().seconds.low * 1000).toISOString();
        console.log("issueInsurance policyId:", policyId);
 
        const policy = {
            policyId,
            patientId,
            issuedBy: callerId,
            coverageAmount,
            policyType,
            validFrom,
            validTo,
            status: 'ACTIVE',
            timestamp
        };
 
        const policyKey = ctx.stub.createCompositeKey('policy', [patientId, policyId]);
        await ctx.stub.putState(policyKey, Buffer.from(JSON.stringify(policy)));
        console.log("issueInsurance policy stored:", JSON.stringify(policy));
 
        return JSON.stringify({message: `Policy ${policyId} issued for patient ${patientId}`, policyId});
    }
 
    // get all policies for a patient
    async getPoliciesByPatient(ctx, args) {
        const {patientId} = JSON.parse(args);
        console.log("ARGS-RAW getPoliciesByPatient:", args);
        console.log("ARGS getPoliciesByPatient:", patientId);
 
        const { role, uuid: callerId } = this.getCallerAttributes(ctx);
 
        if (role === 'patient' && callerId !== patientId) {
            throw new Error('Patients can only view their own policies');
        }
 
        const iterator = await ctx.stub.getStateByPartialCompositeKey('policy', [patientId]);
        const results = [];
 
        for await (const res of iterator) {
            try {
                results.push(JSON.parse(res.value.toString('utf8')));
            } catch (err) {
                console.log("getPoliciesByPatient parse error:", err);
            }
        }
 
        console.log("getPoliciesByPatient results:", results.length);
        return JSON.stringify(results);
    }
 
    // create claim — patient or authorized doctor files a claim against an active policy
    // stored under composite key: claim | [patientId, claimId]
    async createClaim(ctx, args) {
        const {patientId, policyId, recordId, claimAmount, description} = JSON.parse(args);
        console.log("ARGS-RAW createClaim:", args);
        console.log("ARGS createClaim:", patientId, policyId, recordId, claimAmount, description);
 
        const { role, uuid: callerId } = this.getCallerAttributes(ctx);
 
        if (role !== 'patient' && role !== 'doctor') {
            throw new Error('Only patients or doctors can create claims');
        }
 
        if (role === 'patient' && callerId !== patientId) {
            throw new Error('Patients can only create claims for themselves');
        }
 
        // if doctor, verify they are authorized for this patient
        if (role === 'doctor') {
            const patientJSON = await ctx.stub.getState(`patient-${patientId}`);
            if (!patientJSON || patientJSON.length === 0) {
                throw new Error(`Patient ${patientId} not found`);
            }
            const patient = JSON.parse(patientJSON.toString());
            if (!patient.authorizedDoctors.includes(callerId)) {
                throw new Error(`Doctor ${callerId} is not authorized for patient ${patientId}`);
            }
        }
 
        // verify the policy exists and is ACTIVE
        const policyKey = ctx.stub.createCompositeKey('policy', [patientId, policyId]);
        const policyJSON = await ctx.stub.getState(policyKey);
        if (!policyJSON || policyJSON.length === 0) {
            throw new Error(`Policy ${policyId} not found for patient ${patientId}`);
        }
        const policy = JSON.parse(policyJSON.toString());
        console.log("createClaim policy:", JSON.stringify(policy));
 
        if (policy.status !== 'ACTIVE') {
            throw new Error(`Policy ${policyId} is not active (status: ${policy.status})`);
        }
 
        // optionally verify the linked medical record exists
        if (recordId) {
            const recordKey = ctx.stub.createCompositeKey('record', [patientId, recordId]);
            const recordJSON = await ctx.stub.getState(recordKey);
            if (!recordJSON || recordJSON.length === 0) {
                throw new Error(`Record ${recordId} not found for patient ${patientId}`);
            }
        }
 
        const txId = ctx.stub.getTxID();
        const claimId = `CLM-${txId}`;
        const timestamp = new Date(ctx.stub.getTxTimestamp().seconds.low * 1000).toISOString();
        console.log("createClaim claimId:", claimId);
 
        const claim = {
            claimId,
            patientId,
            policyId,
            recordId: recordId || null,
            claimAmount,
            description,
            filedBy: callerId,
            status: 'PENDING',
            statusReason: null,
            reviewedBy: null,
            timestamp
        };
 
        const claimKey = ctx.stub.createCompositeKey('claim', [patientId, claimId]);
        await ctx.stub.putState(claimKey, Buffer.from(JSON.stringify(claim)));
        console.log("createClaim stored:", JSON.stringify(claim));
 
        return JSON.stringify({message: `Claim ${claimId} filed for patient ${patientId}`, claimId});
    }
 
    // get claim info — fetch a single claim by patientId + claimId
    async getClaimInfo(ctx, args) {
        const {patientId, claimId} = JSON.parse(args);
        console.log("ARGS-RAW getClaimInfo:", args);
        console.log("ARGS getClaimInfo:", patientId, claimId);
 
        const { role, uuid: callerId } = this.getCallerAttributes(ctx);
 
        if (role === 'patient' && callerId !== patientId) {
            throw new Error('Patients can only view their own claims');
        }
 
        // doctors must be authorized for this patient
        if (role === 'doctor') {
            const patientJSON = await ctx.stub.getState(`patient-${patientId}`);
            if (!patientJSON || patientJSON.length === 0) {
                throw new Error(`Patient ${patientId} not found`);
            }
            const patient = JSON.parse(patientJSON.toString());
            if (!patient.authorizedDoctors.includes(callerId)) {
                throw new Error(`Doctor ${callerId} is not authorized for patient ${patientId}`);
            }
        }
 
        const claimKey = ctx.stub.createCompositeKey('claim', [patientId, claimId]);
        const claimJSON = await ctx.stub.getState(claimKey);
 
        if (!claimJSON || claimJSON.length === 0) {
            throw new Error(`Claim ${claimId} not found for patient ${patientId}`);
        }
 
        console.log("getClaimInfo result:", claimJSON.toString());
        return claimJSON.toString();
    }
 
    // get all claims for a patient
    async getAllClaimsByPatient(ctx, args) {
        const {patientId} = JSON.parse(args);
        console.log("ARGS-RAW getAllClaimsByPatient:", args);
        console.log("ARGS getAllClaimsByPatient:", patientId);
 
        const { role, uuid: callerId } = this.getCallerAttributes(ctx);
 
        if (role === 'patient' && callerId !== patientId) {
            throw new Error('Patients can only view their own claims');
        }
 
        const iterator = await ctx.stub.getStateByPartialCompositeKey('claim', [patientId]);
        const results = [];
 
        for await (const res of iterator) {
            try {
                results.push(JSON.parse(res.value.toString('utf8')));
            } catch (err) {
                console.log("getAllClaimsByPatient parse error:", err);
            }
        }
 
        console.log("getAllClaimsByPatient results:", results.length);
        return JSON.stringify(results);
    }
 
    // approve claim — insurance agent approves or rejects a PENDING claim
    async approveClaim(ctx, args) {
        const {patientId, claimId, decision, reason} = JSON.parse(args);
        console.log("ARGS-RAW approveClaim:", args);
        console.log("ARGS approveClaim:", patientId, claimId, decision, reason);
 
        const { role, uuid: callerId } = this.getCallerAttributes(ctx);
 
        if (role !== 'insuranceAgent' && role !== 'insuranceAdmin') {
            throw new Error('Only insurance agents can approve or reject claims');
        }
 
        const validDecisions = ['APPROVED', 'REJECTED'];
        if (!validDecisions.includes(decision)) {
            throw new Error(`Invalid decision '${decision}'. Must be APPROVED or REJECTED`);
        }
 
        const claimKey = ctx.stub.createCompositeKey('claim', [patientId, claimId]);
        const claimJSON = await ctx.stub.getState(claimKey);
 
        if (!claimJSON || claimJSON.length === 0) {
            throw new Error(`Claim ${claimId} not found for patient ${patientId}`);
        }
 
        const claim = JSON.parse(claimJSON.toString());
        console.log("approveClaim current claim:", JSON.stringify(claim));
 
        if (claim.status !== 'PENDING') {
            throw new Error(`Claim ${claimId} is already ${claim.status} and cannot be modified`);
        }
 
        claim.status = decision;
        claim.statusReason = reason || null;
        claim.reviewedBy = callerId;
        claim.reviewedAt = new Date(ctx.stub.getTxTimestamp().seconds.low * 1000).toISOString();
 
        await ctx.stub.putState(claimKey, Buffer.from(JSON.stringify(claim)));
        console.log("approveClaim updated claim:", JSON.stringify(claim));
 
        return JSON.stringify({
            message: `Claim ${claimId} has been ${decision}`,
            claimId,
            status: decision
        });
    }
 
    // revoke access — patient revokes a doctor's access to their records
    async revokeAccess(ctx, args) {
        const {patientId, doctorIdToRevoke} = JSON.parse(args);
        console.log("ARGS-RAW revokeAccess:", args);
        console.log("ARGS revokeAccess:", patientId, doctorIdToRevoke);
 
        const { role, uuid: callerId } = this.getCallerAttributes(ctx);
 
        if (role !== 'patient') {
            throw new Error('Only patients can revoke access');
        }
 
        if (callerId !== patientId) {
            throw new Error('Caller is not the owner of this patient record');
        }
 
        const key = `patient-${patientId}`;
        const patientJSON = await ctx.stub.getState(key);
        if (!patientJSON || patientJSON.length === 0) {
            throw new Error(`Patient ${patientId} not found`);
        }
 
        const patient = JSON.parse(patientJSON.toString());
        console.log("revokeAccess before:", patient.authorizedDoctors);
 
        patient.authorizedDoctors = patient.authorizedDoctors.filter(id => id !== doctorIdToRevoke);
        await ctx.stub.putState(key, Buffer.from(JSON.stringify(patient)));
        console.log("revokeAccess after:", patient.authorizedDoctors);
 
        return JSON.stringify({message: `Access revoked for doctor ${doctorIdToRevoke}`});
    }
 
}
 
module.exports = ehrChainCode;

