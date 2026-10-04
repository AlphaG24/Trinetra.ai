# Trinetra AI - Frozen Files Emergency Fix Runbook

> **Scope**: Master Plan Section 18.5 (Authoritative Overrides).  
> **Authority**: Repository Owner (`@AlphaG24`) only.

---

## 🚨 Purpose of This Runbook
To guarantee statutory compliance and system safety, four critical files are architecturally frozen via deterministic SHA-256 hashes:
1. `backend/app/services/disclosure_service.py`
2. `backend/app/services/outbound_safety_guardrails.py`
3. `backend/app/services/ai/prompt_guard.py`
4. `frontend/src/lib/safety/promptGuard.ts`

Any unauthorized modification of these files triggers an immediate build failure in CI (`scripts/verify_frozen_files.py`).

In the rare event of an active production incident, legal notice, or critical security flaw requiring an emergency patch to a frozen file, follow this documented protocol.

---

## 🛠️ Emergency Protocol (Step-by-Step)

### Step 1: Branch Isolation
Create an emergency fix branch from `dev`:
```bash
git checkout dev
git checkout -b hotfix/compliance-emergency-[issue]
```

### Step 2: Implement the Fix
Make the minimal, targeted modification necessary to remediate the outage or compliance defect.  
**DO NOT** remove AI disclosure, call recording notice, or calling hour curfew rules.

### Step 3: Local CI Verification with Emergency Flag
To test locally before recalculating the manifest:
```powershell
python scripts/verify_frozen_files.py --emergency-fix-reason "INCIDENT-2026-10: Critical patch for telephony provider payload change approved by owner"
```
Or set the environment variable:
```powershell
$env:ALLOW_FROZEN_FILE_MODIFICATION = "true"
$env:EMERGENCY_FIX_REASON = "Owner approved hotfix for incident remediation"
python scripts/verify_frozen_files.py
```

### Step 4: Recalculate Manifest Hashes
Once tests pass and the fix is verified:
```powershell
python scripts/verify_frozen_files.py --update
```
This updates `docs/compliance/FROZEN_FILES_MANIFEST.json` with the new canonical SHA-256 hashes.

### Step 5: Document the Change in Audit Trail
Add an entry to `docs/compliance/COMPLIANCE_REGISTER.md` and `docs/VALIDATION_LOG.md` detailing:
- The exact diff applied.
- The emergency reason.
- Real test execution output.
- Status marked `IMPLEMENTED, pending legal review` or `VERIFIED`.

### Step 6: PR Review & Owner Approval
Open a PR to `dev`.  
Per `.github/CODEOWNERS`, merge requires explicit approval from `@AlphaG24`.
