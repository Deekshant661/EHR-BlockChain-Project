Paste this into a NEW markdown file.

Name it:

```text id="sv1rko"
FINAL_ANALYTICS_BYPASS_AND_LIVE_ACTIVITY_FIX.md
```

---

# FINAL ANALYTICS + LIVE ACTIVITY FIX (CRITICAL)

## CURRENT SITUATION

The backend, Fabric network, synthetic dataset, encryption pipeline, and dashboards are fundamentally operational.

The following are CONFIRMED WORKING:

* JWT auth
* OTP verification
* RBAC
* Hyperledger Fabric
* AES encryption
* IPFS upload/download
* Synthetic data seeding
* Insurance policies
* Insurance claims
* Replay decision processing
* Dashboard rendering
* Hospital Admin login
* Insurance Admin login

The current issue is now SPECIFICALLY:

# DASHBOARD ANALYTICS + LIVE ACTIVITY FETCH FAILURE

NOT:

* Fabric corruption
* broken seeding
* broken claims
* broken policies
* broken encryption

---

# CRITICAL ROOT CAUSE #1

# INSURANCE DASHBOARD IS USING A HOSPITAL-ONLY LEDGER ROUTE

# ERROR MESSAGE : 
[Analytics] Fetching ledger for userId: insuranceCompany01

[Analytics] Fetching ledger for userId: insuranceCompany01

[Tx:eval] fetchLedger by insuranceCompany01 → {}

[Analytics] Ledger fetch failed: Only hospital can fetch blockchain ledger

[Tx:eval] fetchLedger by insuranceCompany01 → {}

[Analytics] Ledger fetch failed: Only hospital can fetch blockchain ledger

[Tx:eval] fetchLedger by insuranceCompany01 → {}

[Error] POST /api/ehr/fetchLedger → Only hospital can fetch blockchain ledger

[Tx:eval] fetchLedger by insuranceCompany01 → {}

[Error] POST /api/ehr/fetchLedger → Only hospital can fetch blockchain ledger

[Tx:eval] fetchLedger by insuranceCompany01 → {}

[Error] POST /api/ehr/fetchLedger → Only hospital can fetch blockchain ledger

[Tx:eval] fetchLedger by insuranceCompany01 → {}

[Error] POST /api/ehr/fetchLedger → Only hospital can fetch blockchain ledger

[Tx:eval] fetchLedger by insuranceCompany01 → {}

[Error] POST /api/ehr/fetchLed


Current logs prove this:

```text id="smc4gc"
Only hospital can fetch blockchain ledger
```

The Insurance Admin dashboard currently calls:

```text id="gw2mtr"
/api/ehr/fetchLedger
```

using:

```text id="k77qzi"
insuranceCompany01
```

BUT:
the chaincode explicitly restricts:
fetchLedger()
to:
hospital-only identities.

Therefore:
Insurance Admin analytics ALWAYS FAIL.

---

I am not sure what is the issue that is causing ERROR.
I want you to analyze and also find out by yourself.
I am giving you some assumptions below.

# REQUIRED FIX

DO NOT:

* upgrade chaincode
* restart Fabric
* redeploy contracts
* change smart contract permissions

We need a SAFE BACKEND ANALYTICS BYPASS.

---

# REQUIRED IMPLEMENTATION

# SYSTEM ACCOUNT ANALYTICS BYPASS

Implement the SAME strategy already used successfully in:
replayClaimDecisions.js

Meaning:

The analytics service should:

* internally use the Hospital Admin system account
* perform read-only evaluateTransaction calls
* aggregate ledger data centrally
* return filtered insurance analytics safely

IMPORTANT:
This is ONLY for:
analytics aggregation.

NOT:

* patient access
* downloads
* claims modification
* uploads
* sensitive actions

The dashboard ONLY needs:
read-only analytics summaries.

---

# REQUIRED ANALYTICS ARCHITECTURE

## DO NOT let frontend directly fetch ledger

BAD:
Insurance dashboard
→ directly calls fetchLedger()

GOOD:
Insurance dashboard
→ calls backend analytics API

Backend analytics API
→ uses system account internally
→ fetches ledger safely
→ computes metrics
→ returns sanitized analytics payload

---

# REQUIRED NEW FLOW

Insurance Dashboard
→ /api/admin/analytics/insurance

Backend:
→ uses hospital system account
→ evaluateTransaction()
→ aggregate claims/policies
→ return metrics

Frontend:
→ render analytics

---

# CRITICAL ROOT CAUSE #2

# ACTIVITY FEED IS USING STATIC FALLBACK DATA

The "5 hours ago" text is NOT real activity.

It is:
frontend placeholder fallback content.

Proof:
It NEVER changes.

This means:
the frontend is FAILING to fetch live activity.

---

# REQUIRED FIX

# REAL LIVE ACTIVITY SYSTEM

The activity feed MUST become:
REAL.

It should:

* fetch audit logs
* refresh automatically
* update on new actions
* display recent timestamps correctly

---



# REQUIRED IMPLEMENTATION

## Backend

Verify:

* audit logs are actually inserted
* login events are logged
* dashboard access events are logged
* uploads/downloads are logged

Verify:
timestamps are stored correctly.

---

## Frontend

Replace:
hardcoded placeholder fallback.

Implement:
REAL activity fetching.

Recommended:

* polling every 10–15 seconds
  OR
* refresh on tab focus

IMPORTANT:
Recent activity should update LIVE.

Example:
If user logs in:
within seconds the dashboard should show:

```text id="u0cc3d"
Hospital Administrator logged in — just now
```

NOT:

```text id="j3gqww"
5h ago
```

---

# REQUIRED FIXES

# 1. FIX INSURANCE ANALYTICS

Populate:

* policies
* claims
* approved/rejected/pending
* coverage totals
* policy breakdown
* claim timeline
* top claimants
* recent decisions

using REAL ledger data.

---

# 2. FIX CLAIMS AUDIT PAGE

Currently:
empty.

Required:
fetch REAL claims.

Display:

* claim ID
* patient
* amount
* decision
* timestamp

---

# 3. FIX LEDGER PAGE

Currently:
Load Ledger button does nothing.

Required:

* backend analytics route
* proper loading state
* proper error handling
* successful payload rendering

---

# 4. FIX HOSPITAL ADMIN METRICS

Currently:

* medical records = 0
* policies = 0
* claims = 0

even though seeded data exists.

Trace:

* analytics aggregation
* ledger parsing
* DB aggregation
* caching
* response payloads

Find EXACTLY where values become zero.

---

# 5. FIX DOCTOR LEADERBOARD

Currently blank.

Populate using:

* records created
* uploads handled
* patient relationships

Use REAL seeded data.

---

# 6. FIX MONTHLY ACTIVITY

Currently blank.

Generate:

* records timeline
* uploads timeline
* claims timeline
* grants/revokes timeline

Use lightweight CSS visuals.

NO heavy chart libraries.

---

# 7. FIX AES HEALTH CHECK

AES is working.

Proof:
encrypted downloads work.

Current:
dashboard falsely shows:
AES Encryption → Error

Fix validation logic.

---

# 8. FIX LEDGER SYNC STATUS

Current:
Ledger Sync → Degraded

Replace fake status logic with:
REAL connectivity validation.

Use:

* evaluateTransaction test
* gateway connectivity check

---

# 9. REMOVE STATIC PLACEHOLDER FALLBACKS

Do NOT render fake analytics:

* "5h ago"
* empty skeleton metrics forever

If APIs fail:
show REAL error state.

Do NOT silently fake operational data.

---

# 10. IMPROVE VISUAL QUALITY

Dashboards still feel:
too empty.

Enhance:

* gradients
* animations
* glow effects
* metric transitions
* trend arrows
* hover interactions
* loading animations
* operational density

Goal:
enterprise healthcare analytics platform.

---

# IMPORTANT PERFORMANCE REQUIREMENTS

Use:
evaluateTransaction()

NOT:
submitTransaction()

for:

* analytics reads
* dashboard reads
* ledger reads

VERY important.

---

# IMPORTANT DEBUGGING REQUIREMENT

Before patching:
trace ENTIRE flow:

Fabric Ledger
→ analytics service
→ backend aggregation
→ API responses
→ frontend fetch
→ React state
→ dashboard render

DO NOT randomly patch UI.

Find:
the EXACT failure point.

---

# EXPECTED FINAL RESULT

After fixes:

## HOSPITAL ADMIN DASHBOARD

Should show:

* real medical records
* policies
* claims
* approved/rejected/pending
* populated leaderboard
* populated monthly activity
* live recent activity
* healthy system health

---

## INSURANCE ADMIN DASHBOARD

Should show:

* active policies
* claims
* approvals/rejections
* coverage totals
* policy breakdown
* timelines
* claim audit
* ledger viewer
* recent decisions
* top claimants
* live activity

---

# FINAL GOAL

The dashboards should feel:

* enterprise-grade
* operationally alive
* analytics-rich
* visually premium
* healthcare-authentic
* blockchain-professional
* presentation-ready

---

# ATTACHED SCREENSHOTS

Analyze the attached screenshots carefully.

They show:

* empty analytics
* stale activity feed
* broken insurance analytics
* non-functional ledger
* blank timelines
* blank leaderboards
* false health statuses

Use them for debugging reference.

---

