Yes — NOW we finally have the REAL root cause.

This log is the breakthrough:

```text id="7xg1pd"
[Analytics] DocType distribution: {"unknown":38}
```

That changes EVERYTHING.

This proves:

* ledger fetch IS working
* Hospital01 IS working
* evaluateTransaction IS working
* backend bypass IS working

So the ENTIRE previous assumption was wrong.

The REAL problem is now:

```text id="wz4jke"
analytics parser cannot understand ledger structure
```

That’s why:

* everything becomes 0
* timelines empty
* claims empty
* leaderboard empty
* insurance metrics empty

Because:

```text id="hr9mqa"
all entries are classified as UNKNOWN
```

This is NOT:

* auth
* RBAC
* Fabric access
* caching
* dashboard rendering

This is:

## LEDGER PARSING FAILURE.

VERY important distinction.

---

# WHAT THIS MEANS

Your analytics service probably expects:

```js id="i0w4yn"
record.docType
```

or:

```js id="e3p9lk"
record.type
```

BUT your actual chaincode likely stores:

```js id="r8v2cd"
objectType
assetType
recordType
resourceType
```

OR nested data structure.

So:

```text id="o6xqpu"
analytics aggregation never recognizes anything
```

and EVERYTHING becomes:

```text id="d5m7fa"
unknown
```

😭

---

# THIS IS ACTUALLY GOOD NEWS

Because now:

```text id="k2n8tw"
the issue is isolated and deterministic
```

NOT random architecture instability.

---

# THIS IS THE PROMPT YOU NEED NOW

Save this as:

```text id="v3h6ry"
FINAL_LEDGER_PARSING_ROOT_CAUSE_FIX.md
```

Then paste EVERYTHING below.

---

# FINAL LEDGER PARSING ROOT-CAUSE FIX

## BREAKTHROUGH DISCOVERY

We finally identified the REAL root cause.

IMPORTANT:
This is NOT:

* Hospital01 failure
* Fabric access failure
* JWT failure
* RBAC failure
* analytics endpoint failure
* caching issue

The ledger fetch itself is WORKING.

PROOF:

```text id="s7q4lv"
[Analytics] Fetching ledger via system account: Hospital01 (Org1)
[Tx:eval] fetchLedger response length: 38
[Analytics] Ledger fetched: 38 entries
```

This confirms:

* evaluateTransaction works
* Hospital01 works
* backend bypass works
* ledger access works

---

# THE REAL ROOT CAUSE

CRITICAL LOG:

```text id="f5m2zk"
[Analytics] DocType distribution: {"unknown":38}
```

This proves:

The analytics aggregation service is FAILING TO PARSE the ledger structure correctly.

ALL ledger entries are being classified as:

```text id="m8x1qh"
unknown
```

Therefore:

* claims count = 0
* policies count = 0
* records count = 0
* timelines empty
* leaderboards empty
* insurance analytics empty

The issue is NOT missing data.

The issue is:

## WRONG LEDGER PARSING LOGIC.

---

# REQUIRED DEBUGGING

DO NOT GUESS.

DO NOT patch frontend.

DO NOT modify Fabric.

Instead:
TRACE THE ACTUAL LEDGER OBJECT STRUCTURE.

IMPORTANT:
Log COMPLETE RAW ledger entries.

Example:

```js id="y4c8bn"
console.log(JSON.stringify(ledgerEntries[0], null, 2));
```

We need to inspect:

* actual property names
* nesting structure
* record classification fields

---

# MOST LIKELY ROOT CAUSE

The analytics service currently expects fields like:

```js id="r2f7mx"
record.docType
record.type
```

BUT the actual ledger objects likely use:

```js id="k9v3pl"
record.recordType
record.objectType
record.assetType
record.resourceType
```

OR nested structures.

Therefore:
classification logic fails.

---

# REQUIRED FIX

## STEP 1 — INSPECT RAW LEDGER SHAPE

Print:

* first 5 ledger entries
* full object structure
* keys
* nested fields

Find:
the REAL classification field.

---

## STEP 2 — FIX AGGREGATION PARSER

Update analytics aggregation logic to correctly recognize:

* medical records
* claims
* policies
* consent events
* uploads
* patient records

using ACTUAL ledger schema.

---

## STEP 3 — REMOVE UNKNOWN CLASSIFICATION FAILURE

Current:
everything becomes:

```text id="j6q9dc"
unknown
```

Required:
proper classification counts.

Example expected distribution:

* medicalRecord
* insuranceClaim
* insurancePolicy
* consentGrant
* consentRevoke

---

# REQUIRED ANALYTICS FIXES

After parser fix:

## HOSPITAL DASHBOARD MUST SHOW

* medical records
* claims
* policies
* approved/rejected/pending
* doctor leaderboard
* monthly activity
* operational summaries

---

## INSURANCE DASHBOARD MUST SHOW

* active policies
* claims
* approvals/rejections
* timelines
* top claimants
* claims audit
* ledger viewer
* recent decisions

---

# REQUIRED CLAIMS AUDIT FIX

Current:
claims audit empty.

After parser fix:
display REAL claims from ledger.

---

# REQUIRED LEADERBOARD FIX

Leaderboard currently blank because:
analytics parser recognizes nothing.

After parser fix:
compute:

* doctor activity
* uploads
* records created
* claims involvement

---

# REQUIRED TIMELINE FIX

Monthly activity currently blank because:
analytics parser recognizes nothing.

After parser fix:
generate:

* uploads timeline
* claims timeline
* records timeline
* grant/revoke timeline

---

# REQUIRED LIVE ACTIVITY FIX

The "5h ago" issue is still unresolved.

IMPORTANT:
Remove static fallback placeholder data.

Ensure:

* audit logs insert correctly
* frontend polling works
* activity endpoint refreshes
* timestamps update live

Recent activity MUST become REAL.

---

# IMPORTANT DEBUGGING REQUIREMENT

Before patching:
log:

* raw ledger payload
* raw analytics aggregation
* parsed object types
* frontend payloads

DO NOT GUESS.

Find:
the EXACT schema mismatch.

---

# IMPORTANT PERFORMANCE REQUIREMENT

Use:
evaluateTransaction()

NOT:
submitTransaction()

for all analytics reads.

---

# FINAL GOAL

The dashboards should become:

* fully populated
* analytics-rich
* operationally alive
* visually premium
* enterprise-grade
* healthcare-authentic
* blockchain-professional

---

