# EHR-BlockChain-Project: Context & Architecture Guide

## 1. Project Overview
This is a **Blockchain-Based Electronic Health Record (EHR) System** built on **Hyperledger Fabric**. It aims to provide a secure, decentralized, and interoperable platform for managing medical records, granting access to healthcare providers, and processing insurance claims.

The project uses a private permissioned blockchain to ensure data privacy and auditability, with a Node.js middleware layer serving as the SDK bridge.

---

## 2. Technical Stack
- **Blockchain Framework:** Hyperledger Fabric (v2.x)
- **State Database:** CouchDB (used for rich queries)
- **Backend/SDK:** Node.js (Fabric Gateway API)
- **Smart Contracts (Chaincode):** JavaScript (deployed as `ehrChainCode`)
- **Frontend:** HTML, CSS (integrated via REST APIs)
- **Identity Management:** Fabric Certificate Authority (CA) & Wallet-based file system (.id files)

---

## 3. System Architecture
The network consists of multiple organizations (Org1, Org2) representing different healthcare entities.
1. **Network Layer:** Peers, Orderers, and CAs running in Docker containers.
2. **Middleware Layer (`server-node-sdk`):**
   - Handles identity enrollment and registration.
   - Submits transactions to the ledger.
   - Provides REST endpoints for the frontend.
3. **Application Layer:** - **Frontend:** User interface for Patients, Doctors, and Insurance Agents.
   - **Postman Collection:** Used for testing and manual API triggers.

---

## 4. Key Roles & Functionalities 
(You can check these all from "fabric-samples\asset-transfer-basic\chaincode-javascript\lib\ehrChainCode.js" file and the "server-node-sdk\app.js" file)

### Patient
- Register/Initialize record.
- Grant/Revoke access to specific Doctors (`grantAccess`).
- View own medical history.

### Doctor
- View authorized patient records.
- Add medical entries/records to a patient's history.
- Request access to records.

### Insurance Agent (New Feature)
- **Create Claim:** Initiate a claim based on patient medical data.
- **Approve/Reject Claim:** Logic to verify medical necessity and process payouts.
- **View Claims:** Tracking the status of insurance requests.

### Hospital Admin
- Onboard new medical staff and manage organizational certificates.

---

## 5. Current Implementation Details
- **Chaincode Logic:** Located in `fabric-samples/asset-transfer-basic/chaincode-javascript/lib/ehrChainCode.js`.
- **API Routes:** Defined in `server-node-sdk/app.js`.
- **Security:** Identities are managed in `server-node-sdk/wallet/`. (Note: This folder is ignored by Git but essential for local runtime).
- **Environment:** Configured for WSL (Ubuntu 24.04).

---

## 6. Antigravity Agent: Operational Rules
When making changes to this codebase, the agent must adhere to the following constraints:

1. **Chaincode Integrity:** When updating `ehrChainCode.js`, ensure that the `ctx` (context) is handled correctly for both `getState` and `putState`.
2. **Error Handling:** Every API endpoint in `app.js` must return a structured JSON response: `{ success: boolean, data/message: string }`.
3. **No IoT/Smartwatch Data:** The system does not currently process live IoT/sensor data. We will discuss about this later I guess.
4. **Production Readiness:** Aim for robust input validation, secure credential handling, and comprehensive logging.

---


## 7. Immediate Development Goals
1. **API Production Readiness (Dynamic Onboarding)**
Goal: Remove dependency on manual terminal scripts (e.g., onboardDoctor.js).

Action: Refactor server-node-sdk to handle Admin enrollment and user registration dynamically via API calls.

Restructure: Move to an MVC-style architecture (/routes, /controllers, /services, /fabric).

2. **Unified Login & Signup System**
Goal: Create a secure gateway for all roles (Patient, Doctor, Agent, Hospital, Company).

Action: Implement a login endpoint that verifies cryptographic identity existence in the wallet/ and a signup endpoint that interacts with the Fabric CA.

IDs: Transition from hardcoded names to a dynamic, UUID-based system for internal identifiers.

3. **Frontend Sync & Standardization**
Goal: Ensure backend changes do not break the existing UI.

Action: Standardize all API responses to { "success": true, "data": { ... } } and implement proper HTTP status codes (200, 401, 404, 500).

Validation: Match existing frontend JSON parsing keys to maintain connectivity.
