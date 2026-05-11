Act as a Senior Full-Stack Healthcare Systems Engineer and Data Simulation Architect.

IMPORTANT CONTEXT ABOUT THIS PROJECT

This is an advanced EHR (Electronic Health Record) platform built using:

* Hyperledger Fabric
* React frontend (`client-ui/`)
* Express backend (`server-node-sdk/`)
* SQLite authentication/database layer
* JWT authentication
* OTP email verification
* AES-256-GCM encrypted medical file storage
* IPFS (Pinata) decentralized storage
* RBAC middleware
* blockchain-backed consent workflows
* secure encrypted downloads
* doctor/patient/admin dashboards

The system is already fully functional.

We have completed:

* production-style authentication
* Fabric onboarding APIs
* OTP verification
* encrypted uploads
* IPFS storage
* consent-aware encrypted retrieval
* blockchain authorization validation

NOW we want to add:

# LARGE-SCALE SYNTHETIC DATA GENERATION

IMPORTANT:
This is NOT mock frontend JSON.
This must generate REAL application data inside the actual system architecture.

The goal is to make:

* dashboards populated
* analytics meaningful
* demos realistic
* screenshots impressive
* research paper visuals strong
* admin panels look enterprise-scale

---

# PRIMARY GOAL

Create a complete synthetic healthcare dataset and inject it into the actual system.

Generate:

* users
* doctors
* patients
* insurance agents
* medical records
* insurance claims
* encrypted file metadata
* consent relationships
* audit-friendly activity patterns

IMPORTANT:
Use the REAL APIs/services wherever reasonable.

Do NOT generate fake frontend-only arrays.

---

# IMPORTANT CONSTRAINTS

Do NOT:

* require real Gmail verification
* require real OTP flow
* require manual frontend signup

Synthetic users should be:

* auto-generated
* auto-verified
* directly inserted safely into SQLite + Fabric enrollment flow

This is for internal seeding/demo purposes only.

---

# DATA SCALE TARGET

Generate approximately:

* 50 patients
* 10 doctors
* 5 insurance agents
* 1 hospitalAdmin
* 1 insuranceAdmin

For records:

* 5–15 medical records per patient
* 2–5 uploaded encrypted file entries per patient
* multiple claims/policies
* randomized doctor-patient relationships

The system should feel populated and realistic.

---

# USER GENERATION REQUIREMENTS

Generate realistic:

* names
* emails
* cities
* hospital affiliations
* insurance data
* diagnoses
* prescriptions
* timestamps

Use healthcare-style realism.

Examples:

* diabetes
* hypertension
* asthma
* flu
* migraine
* allergies

DO NOT generate nonsense/random garbage text.

---

# AUTH REQUIREMENTS

Synthetic users should:

* bypass OTP requirement
* be marked:
  isVerified = 1

Generate:

* bcrypt password hashes
* JWT-compatible users
* Fabric wallet identities

IMPORTANT:
Users must be able to actually log in from frontend using generated credentials.

---

# FABRIC REQUIREMENTS

IMPORTANT:
Synthetic data must remain compatible with:

* existing Hyperledger chaincode
* wallet identities
* consent workflows
* encrypted file architecture

Use:

* existing onboarding services
* existing enrollment APIs/helpers

Do NOT bypass Fabric identity architecture entirely.

---

# CONSENT RELATIONSHIPS

Generate realistic consent patterns.

Examples:

* each patient authorizes 1–3 doctors
* some doctors have many patients
* some doctors have few patients

Automatically:

* call existing grantAccess workflows
  OR
* use chaincode-compatible authorization setup

Consent relationships should work with:

* encrypted downloads
* Phase 3 validation logic

---

# MEDICAL RECORDS

Generate realistic records:

* diagnosis
* prescription
* doctor assignments
* timestamps
* visit history

Distribute records across:

* multiple doctors
* multiple time periods

The system should look historically active.

---

# FILE METADATA REQUIREMENTS

Generate:

* realistic encrypted file metadata entries

IMPORTANT:
Do NOT necessarily generate huge real PDFs/images unless lightweight.

Possible approaches:

* small placeholder PDFs/images
* lightweight encrypted test files
* metadata-compatible uploads

Ensure:

* file tables populate correctly
* download system remains functional

---

# CLAIMS + INSURANCE DATA

Generate:

* active claims
* approved claims
* pending claims
* rejected claims
* insurance policies

Create realistic distribution patterns.

---

# ANALYTICS READINESS

The generated data should support future dashboards like:

* total patients
* total records
* doctor activity
* claims metrics
* upload counts
* consent relationships
* access activity

Generate enough variation for charts/graphs to look meaningful.

---

# IMPLEMENTATION REQUIREMENTS

Create:

* reusable seed scripts
* deterministic/randomized generators
* clean modular architecture

Possible files:

* scripts/seedUsers.js
* scripts/seedRecords.js
* scripts/seedClaims.js
* scripts/seedConsents.js
* scripts/seedFiles.js

OR:

* unified seeding service

Use:

* faker.js or equivalent realistic data library if appropriate

---

# IMPORTANT ENGINEERING REQUIREMENTS

Seed scripts should:

* avoid duplicate emails
* avoid duplicate UUIDs
* avoid wallet collisions
* avoid Fabric identity conflicts

Implement:

* idempotent behavior if possible
* clear logging
* error handling

---

# CRITICAL SYNTHETIC DATA ENGINEERING REFINEMENTS

## 1. Deterministic Demo Passwords (IMPORTANT)

For presentation/demo simplicity:

* all synthetic users should use a unified deterministic password:
  TestPassword123!

Examples:

* patients
* doctors
* insurance agents
* admin accounts

IMPORTANT:
Passwords must still be stored as proper bcrypt hashes.

Reason:
This dramatically simplifies:

* live demonstrations
* dashboard testing
* frontend login testing
* viva walkthroughs

Avoid randomly generated passwords for synthetic users.

---

## 2. Deterministic Named Demo Accounts (IMPORTANT)

In addition to large-scale randomized users, generate several memorable demo accounts.

Examples:

* [demo.patient@ehr.com](mailto:demo.patient@ehr.com)
* [demo.doctor@ehr.com](mailto:demo.doctor@ehr.com)
* [demo.insurance@ehr.com](mailto:demo.insurance@ehr.com)
* [demo.admin@ehr.com](mailto:demo.admin@ehr.com)

These accounts should:

* always exist after seeding
* use deterministic credentials
* be easy to remember during presentations

Use:
Password:
TestPassword123!

Reason:
This avoids searching through generated datasets during demos.

---

## 3. Fabric Enrollment Throttling (CRITICAL)

When enrolling synthetic users into the Hyperledger Fabric CA:

* implement a small delay between enrollments
* recommended:
  250ms–500ms delay per identity

Reason:
Bulk enrollment loops can cause:

* connection reset errors
* Fabric CA throttling
* timeout failures
* unstable enrollment behavior

The seeding pipeline must remain stable and predictable.

---

## 4. Synthetic User Flag

Add:
isSynthetic

field to SQLite Users table.

Suggested:

* BOOLEAN/TINYINT
* default 0

Synthetic generated users:

* should have isSynthetic = 1

Purpose:

* distinguish demo data from manually created users
* support analytics filtering
* support future admin filtering
* support research/demo transparency

IMPORTANT:
This is NOT primarily for deleting demo data.

Synthetic data should remain compatible with:

* dashboards
* analytics
* deployment demos
* screenshots
* presentation workflows

---

## 5. Lightweight IPFS Placeholder Optimization (IMPORTANT)

Do NOT upload hundreds of unique files to Pinata during synthetic seeding.

Instead:

1. Upload:

* one lightweight encrypted placeholder medical file
  (example: Sample_Medical_Report.pdf)

2. Obtain:

* a single reusable CID

3. Reuse that CID across many synthetic metadata records.

Result:

* dashboards appear populated
* file tables appear realistic
* download flows remain functional
* Pinata API quota remains protected

IMPORTANT:
The frontend should still display:

* varied filenames
* varied metadata
* varied timestamps

even if many records internally reference the same reusable CID.

---

## 6. Historical Timestamp Randomization (IMPORTANT)

Do NOT generate all records/files/claims with current timestamps only.

Randomize timestamps realistically across:

* last 6–12 months

Apply to:

* medical records
* uploads
* claims
* access grants
* insurance activity

Reason:
This improves:

* analytics realism
* dashboard charts
* historical activity views
* presentation quality
* enterprise realism

Avoid systems where all activity appears generated on the same day.

---

## 7. Seeding Pipeline Architecture

Maintain a layered synthetic-data pipeline:

Generation Layer

* faker.js or equivalent realistic healthcare data generation

Auth Layer

* bcrypt password hashing
* auto-verified accounts
* OTP bypass for seeded users

Blockchain Layer

* Fabric wallet identity enrollment
* CA registration/enrollment
* UUID-safe identity generation

Relational Layer

* doctor-patient pairing
* consent generation
* claims/policies
* healthcare activity relationships

IMPORTANT:
Synthetic data must remain fully compatible with:

* JWT login
* RBAC
* blockchain consent validation
* AES/IPFS file architecture
* encrypted download workflows

---

# FRONTEND REQUIREMENTS

After seeding:

* dashboards should visibly populate
* file tables should populate
* doctor searches should work
* admin metrics should look real
* analytics-ready data should exist

---

# TESTING REQUIREMENTS

After generation:

1. Login with generated users
2. Doctor dashboards populated
3. Patient dashboards populated
4. File tables populated
5. Claims visible
6. Consent workflows functional
7. Download authorization functional
8. Analytics-ready metrics verified

Provide:

* generated test credentials
* seeding walkthrough
* cleanup/reset instructions
* sample user list
* expected dashboard behavior

---

# IMPORTANT

Do NOT redesign existing architecture.

This is a DATA POPULATION + SYSTEM REALISM phase.

Preserve:

* JWT auth
* OTP architecture
* RBAC
* AES/IPFS system
* Fabric consent architecture
* frontend dashboards

---

# SYNTHETIC DATA GENERATION WALKTHROUGH (IMPORTANT)

In addition to generating the synthetic data system, provide a COMPLETE walkthrough explaining:

1. How synthetic healthcare data was generated
2. What libraries/tools were used
3. How realistic patient/doctor data was created
4. How blockchain-compatible identities were generated
5. How OTP verification was bypassed safely for seeded users
6. How Fabric wallet identities were enrolled
7. How consent relationships were generated
8. How medical records/claims/files were distributed
9. How encrypted file metadata was created
10. How the generated data was injected into the actual system

IMPORTANT:
This walkthrough should be presentation-friendly and understandable for:

* project demonstrations
* viva questions
* faculty evaluation
* research paper discussion

Explain:

* WHY synthetic data was needed
* WHY real healthcare data was avoided
* HOW realistic healthcare simulation was achieved
* HOW data consistency was maintained across:

  * SQLite
  * Hyperledger Fabric
  * IPFS metadata
  * JWT authentication
  * RBAC workflows

Also provide:

* architecture explanation
* seeding pipeline explanation
* generated data lifecycle
* sample generated entities
* system realism strategy

IMPORTANT:
The explanation should make the project feel:

* scalable
* enterprise-like
* realistic
* cybersecurity-aware
* healthcare-oriented

After implementation, generate:

* a detailed walkthrough document
* demo explanation notes
* sample presentation explanation for synthetic data generation
* faculty-question preparation notes

The walkthrough should clearly explain:
"How the synthetic data moves through the complete architecture."

---

# REVIEW-DRIVEN DEVELOPMENT

Before coding:

1. Show seeding architecture
2. Show synthetic data strategy
3. Show Fabric enrollment approach
4. Show consent generation strategy
5. Show affected files
6. Explain how seeded users bypass OTP safely

Then begin implementation incrementally.
