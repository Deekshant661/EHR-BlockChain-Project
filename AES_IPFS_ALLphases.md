Act as a Senior Hyperledger Fabric + Cybersecurity + Distributed Storage Architect.

We already have a fully functional healthcare platform with:

* React frontend (`client-ui/`)
* Express backend (`server-node-sdk/`)
* Hyperledger Fabric integration
* JWT authentication
* OTP email verification
* SQLite auth system
* RBAC middleware
* patient consent workflows
* role-based dashboards
* blockchain-backed EHR APIs

We now want to implement:

# AES Encryption + IPFS Secure Medical File Storage

IMPORTANT:
This must EXTEND the existing architecture cleanly.

Do NOT redesign:

* authentication system
* JWT flow
* RBAC middleware
* existing EHR APIs
* frontend dashboard architecture

This feature is an enhancement layer for secure medical document handling.

---

# PRIMARY GOAL

Implement a secure medical file storage pipeline using:

* AES encryption
* IPFS distributed storage
* blockchain metadata references

The system must support:

* encrypted upload of medical documents
* decentralized storage via IPFS
* secure retrieval/decryption
* role-protected access
* blockchain-linked metadata

---

# IMPORTANT ARCHITECTURE

We are NOT storing files directly on blockchain.

Correct architecture:

Upload Flow:
User uploads file
↓
Backend receives file
↓
AES encrypt file
↓
Upload encrypted file to IPFS
↓
Receive CID/hash
↓
Store metadata + CID reference
↓
Return success response

Download Flow:
Authorized user requests file
↓
Backend validates JWT + RBAC
↓
Fetch encrypted file from IPFS
↓
AES decrypt file
↓
Return original file

---

# IMPLEMENTATION PHASES

IMPORTANT:
Build this incrementally.

PHASE 1:

* AES encryption
* IPFS upload
* CID storage
* upload UI

PHASE 2:

* retrieval + decryption
* secure downloads

PHASE 3:

* consent-aware access control integration
* role-aware file access

Do NOT attempt advanced cryptographic systems like:

* Attribute-Based Encryption
* Homomorphic Encryption
* Distributed key escrow
* Multi-party cryptography

Keep implementation practical and production-oriented.

---

# TECHNOLOGY REQUIREMENTS

## Backend

Use:

* Node.js crypto module
* multer for uploads
* Pinata IPFS API
* existing Express architecture

Do NOT:

* run a local IPFS node initially
* redesign backend architecture

---

# AES REQUIREMENTS

Use:

* AES-256 encryption
* crypto.createCipheriv()
* random IV generation

Store:

* encrypted binary/blob
* IV metadata
* encryption metadata

Do NOT:

* store plaintext files after upload
* expose encryption keys to frontend

---

# ENCRYPTION STRATEGY

IMPORTANT:
Encrypt ONLY uploaded medical files.

Examples:

* PDFs
* prescriptions
* scans
* reports
* images

Do NOT encrypt:

* JWT tokens
* SQLite DB
* chaincode payloads
* normal API requests

---

# IPFS REQUIREMENTS

Use Pinata API for IPFS storage.

Store:

* encrypted file only

Receive:

* CID/hash

Use:

* environment variables for Pinata credentials

Example:
PINATA_API_KEY=
PINATA_SECRET_API_KEY=

Do NOT hardcode API credentials.

---

# BLOCKCHAIN METADATA STRATEGY

Do NOT store entire files on blockchain.

Store ONLY:

* CID/hash
* file metadata
* uploader identity
* timestamps
* ownership references

Example metadata:
{
fileId,
patientUUID,
uploadedBy,
fileName,
fileType,
ipfsCid,
uploadTimestamp
}

Maintain compatibility with existing Hyperledger workflows.

---

# DATABASE REQUIREMENTS

Use SQLite for application-layer metadata if needed.

Possible table:
MedicalFiles

Fields:

* id
* patientUUID
* uploadedBy
* originalFileName
* encryptedFileName
* ipfsCid
* mimeType
* uploadTimestamp

Do NOT store plaintext file contents in SQLite.

---

# ACCESS CONTROL REQUIREMENTS

File retrieval must respect:

* JWT authentication
* RBAC middleware
* patient consent logic

Examples:

* patient can access own files
* authorized doctor can access patient files
* unauthorized doctor cannot decrypt/download files

Do NOT bypass existing consent architecture.

---

# BACKEND ENDPOINTS

Suggested APIs:

POST /api/files/upload
POST /api/files/getByPatient
GET  /api/files/download/:fileId

All protected with JWT middleware.

---

# FRONTEND REQUIREMENTS

Extend existing React frontend.

Add:

* secure file upload UI
* uploaded files table
* download buttons
* upload progress indicators
* role-aware file visibility

Integrate into:

* Patient Dashboard
* Doctor Dashboard

Maintain:

* existing purple healthcare cybersecurity theme
* existing dashboard architecture

---

# FILE HANDLING REQUIREMENTS

Supported uploads:

* PDF
* JPG
* PNG

Implement:

* file size limits
* MIME validation
* upload error handling

Reject unsupported file types.

---

# SECURITY REQUIREMENTS

* Never expose AES key to frontend
* Never store plaintext uploads permanently
* Use random IVs
* Use environment variables for secrets
* Validate file ownership before retrieval
* Protect all file APIs with JWT

---

# PROJECT STRUCTURE

Maintain clean architecture:

server-node-sdk/
/services
/controllers
/routes
/uploads
/utils

Possible new files:

* services/ipfsService.js
* services/encryptionService.js
* controllers/fileController.js
* routes/fileRoutes.js

Frontend:
client-ui/src/
/pages
/components
/services

---

# TESTING REQUIREMENTS

After implementation:

1. Test PDF upload
2. Verify AES encryption works
3. Verify encrypted upload to IPFS
4. Verify CID returned
5. Verify metadata storage
6. Verify secure file retrieval
7. Verify AES decryption
8. Verify unauthorized access blocked
9. Verify patient consent still enforced
10. Verify frontend upload/download UX

Provide:

* complete testing walkthrough
* Pinata setup instructions
* environment variable setup
* upload/download demo flow

---

# REVIEW-DRIVEN DEVELOPMENT

Before coding:

1. Show architecture diagram
2. Show AES lifecycle
3. Show IPFS integration strategy
4. Show metadata flow
5. Show access-control flow
6. Show affected files
7. Explain how consent integrates with downloads

Then begin implementation incrementally.

Do NOT immediately generate all code before review.
