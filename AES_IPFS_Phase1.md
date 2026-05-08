Act as a Senior Hyperledger Fabric + Cybersecurity + Backend Systems Engineer.

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

We are now implementing:

# PHASE 1 — AES Encryption + IPFS Upload Pipeline

IMPORTANT:
This phase ONLY focuses on:

* encrypted medical file uploads
* AES encryption
* IPFS upload
* metadata storage
* upload UI

DO NOT implement:

* file retrieval
* AES decryption
* advanced ACL logic
* download endpoints
* distributed key management

Those belong to later phases.

---

# PRIMARY GOAL

Build a secure upload pipeline:

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
Store metadata
↓
Return success response

This phase is ONLY about successful secure upload architecture.

---

# TECHNOLOGY REQUIREMENTS

Backend:

* Node.js
* Express
* multer
* crypto module
* Pinata IPFS API

Frontend:

* React
* Axios
* existing dashboard architecture

Do NOT redesign the current project structure.

---

# FILE TYPES

Allow uploads for:

* PDF
* PNG
* JPG
* JPEG

Reject unsupported file types.

Implement:

* MIME validation
* upload size limits
* proper error handling

---

# AES REQUIREMENTS

Use:

* AES-256 encryption
* crypto.createCipheriv()
* random IV generation

Requirements:

* encrypt uploaded file BEFORE IPFS upload
* do NOT upload plaintext file to IPFS
* do NOT expose AES keys to frontend
* do NOT permanently store plaintext uploads

Store:

* encrypted file buffer
* IV metadata
* encryption metadata if needed

---

# IPFS REQUIREMENTS

Use:

* Pinata API

Store:

* encrypted file only

Receive:

* CID/hash

Use environment variables:

PINATA_API_KEY=
PINATA_SECRET_API_KEY=

Do NOT hardcode credentials.

Do NOT run a local IPFS node.

---

# METADATA STORAGE

Store upload metadata in SQLite.

Create a new table:

MedicalFiles

Suggested fields:

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

# AUTHENTICATION REQUIREMENTS

Protect upload API using:

* existing JWT middleware
* existing RBAC middleware

Allowed upload roles:

* patient
* doctor

Uploads must use:
req.user

Do NOT trust uploader identity from frontend request body.

---

# BACKEND API

Create:

POST /api/files/upload

Protected route.

Use:
multipart/form-data

Request:

* file
* patientUUID

Behavior:

* validate JWT
* validate file type
* AES encrypt
* upload encrypted file to IPFS
* store metadata
* return CID + metadata

Successful response:
{
"success": true,
"data": {
"fileId": "",
"ipfsCid": "",
"fileName": ""
}
}

---

# FRONTEND REQUIREMENTS

Extend existing frontend.

Add upload section to:

* Patient Dashboard
* Doctor Dashboard

Features:

* file picker
* upload button
* upload loading state
* upload success toast
* upload error handling

Use existing purple healthcare cybersecurity UI theme.

Do NOT redesign dashboard architecture.

---

# PROJECT STRUCTURE

Maintain clean architecture.

Possible backend additions:

* services/ipfsService.js
* services/encryptionService.js
* controllers/fileController.js
* routes/fileRoutes.js

Possible frontend additions:

* components/FileUpload.jsx
* services/fileApi.js

---

# SECURITY REQUIREMENTS

* Never expose AES key to frontend
* Never upload plaintext file to IPFS
* Validate MIME types
* Validate upload size
* Use random IVs
* Protect upload route with JWT
* Use environment variables for secrets

---

# TESTING REQUIREMENTS

After implementation:

1. Upload PDF successfully
2. Verify encrypted upload to IPFS
3. Verify CID returned
4. Verify metadata stored in SQLite
5. Verify unsupported files rejected
6. Verify upload requires JWT
7. Verify upload works from frontend UI
8. Verify plaintext files are NOT uploaded

Provide:

* complete testing walkthrough
* Pinata setup instructions
* environment variable setup
* upload demo flow

---

# REVIEW-DRIVEN DEVELOPMENT

Before coding:

1. Show upload architecture
2. Show AES encryption lifecycle
3. Show Pinata integration strategy
4. Show metadata schema
5. Show affected files
6. Explain how encrypted file buffer flows through system

Then begin implementation incrementally.

Do NOT immediately implement later phases like download/decryption.
