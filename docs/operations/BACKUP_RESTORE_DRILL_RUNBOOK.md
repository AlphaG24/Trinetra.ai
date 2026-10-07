# Trinetra AI — Automated Backup & Restore Drill Runbook

> **Document Status**: `IMPLEMENTED, pending legal review`  
> **Source of Truth**: [MASTER_PLAN.md](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/docs/MASTER_PLAN.md) (Section 18.15 Item 17)  
> **Last Verified**: October 2026  
> **Drill Frequency**: Monthly Synthetic Validation Drill  

---

## 1. Executive Summary & Recovery Objectives

| Metric | Target Standard | Operational Mechanism | Verification Schedule |
| :--- | :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | **<= 1 Hour** | Continuous Write-Ahead Log (WAL) archiving + Daily snapshots | Verified every backup cycle |
| **Recovery Time Objective (RTO)** | **<= 4 Hours** | Automated Point-in-Time Recovery (PITR) + Parallelized container warm-up | Simulated monthly |
| **Integrity Assurance** | **SHA-256 Cryptographic Checksum** | Pre-export and post-restore checksum manifest match | Automated per drill |
| **Encryption Standard** | **AES-256-GCM** | Data-at-rest encryption + Encrypted export archives | Continuous |
| **Target Isolation** | **Synthetic Isolated Schema** | Zero write access to live production database during drill | Non-negotiable (Sec 18.2) |

---

## 2. Infrastructure Architecture & Storage Tiers

Trinetra AI operates on managed Supabase PostgreSQL with automated WAL archiving and encrypted blob storage replication:

```
[ Primary Production DB ] 
          │
          ├─ Continuous Streaming WAL ──> [ Supabase S3-Compatible PITR Storage (Encrypted) ]
          │
          └─ Daily Physical Snapshots ──> [ Cold Disaster Recovery Vault (AES-256-GCM) ]
                                                        │
                                        (SHA-256 Hash Manifest Generated)
                                                        │
                                                        ▼
                                     [ Monthly Synthetic Restore Target ]
                                          - Schema verification
                                          - Foreign key integrity
                                          - Row count invariant checks
```

### Monitored Core Multi-Tenant Tables:
1. `auth.users` / `user_profiles` (Tenant identities & RBAC)
2. `agents` (Voice bot configurations & prompt trees)
3. `voice_calls` (Call session records & duration)
4. `phone_numbers` (Virtual CLI assignments & grace statuses)
5. `wallets` / `wallet_transactions` (Prepaid ledger & billing records)
6. `invoices` (GST-compliant invoice records)
7. `byon_credentials` (Encrypted carrier credentials)
8. `support_tickets` (CFU call-forwarding & SLA tracking)
9. `kyc_records` (Encrypted customer KYC documents)
10. `compliance_audit_logs` (Immutable append-only audit trail)

---

## 3. Step-by-Step Synthetic Restore Drill Procedure

### Phase 1: Snapshot Generation & Checksum Generation
1. Extract schema definition and synthetic data snapshot using pg_dump:
   ```bash
   pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME --clean --if-exists --no-owner --no-privileges -F p -f trinetra_backup_snapshot.sql
   ```
2. Generate SHA-256 hash manifest:
   ```bash
   sha256sum trinetra_backup_snapshot.sql > trinetra_backup_snapshot.sql.sha256
   ```
3. Encrypt snapshot for off-site cold storage:
   ```bash
   openssl enc -aes-256-gcm -salt -in trinetra_backup_snapshot.sql -out trinetra_backup_snapshot.sql.enc -k $BACKUP_ENCRYPTION_KEY
   ```

### Phase 2: Decryption & Integrity Verification
1. Decrypt archive:
   ```bash
   openssl enc -d -aes-256-gcm -in trinetra_backup_snapshot.sql.enc -out restored_snapshot.sql -k $BACKUP_ENCRYPTION_KEY
   ```
2. Verify SHA-256 checksum:
   ```bash
   sha256sum -c trinetra_backup_snapshot.sql.sha256
   # Must return: trinetra_backup_snapshot.sql: OK
   ```

### Phase 3: Restoration into Isolated Drill Target
> **CRITICAL RULE (Section 18.2)**: Never restore into the live production database. The restore target must be an isolated sandbox database, staging schema, or containerized PostgreSQL instance.

```bash
psql -h $SANDBOX_HOST -U $DB_USER -d trinetra_restore_sandbox -f restored_snapshot.sql
```

### Phase 4: Schema & Data Validation Audit
Execute automated validation queries:
1. **Table Existence**: Verify all 10 core tables exist in the restored target.
2. **Foreign Key Invariants**: Assert zero orphaned rows in child tables (`voice_calls`, `wallet_transactions`, `invoices`, `agents`).
3. **RLS Policy Verification**: Assert `ENABLE ROW LEVEL SECURITY` is active on every multi-tenant table.
4. **Row Count Parity**: Compare row counts between primary manifest and restored sandbox.

---

## 4. Disaster Recovery Point-in-Time Recovery (PITR) Execution

In the event of a critical primary outage or catastrophic data corruption:
1. **Declare Disaster State**: Incident Commander declares P1 Sev incident in accordance with `DATA_BREACH_RUNBOOK.md`.
2. **Determine Target Timestamp ($TARGET_TIME)**:
   - Identify timestamp immediately prior to corruption event (e.g. `2026-10-04T12:00:00Z`).
3. **Initiate PITR in Supabase Console / CLI**:
   ```bash
   supabase projects restore --timestamp "$TARGET_TIME" --project-ref $TARGET_PROJECT_REF
   ```
4. **DNS / Backend Redirection**:
   - Update `DATABASE_URL` environment variables across backend pods.
   - Run health probe: `GET /health` and `GET /ready`.
5. **Post-Recovery Forensic Log**:
   - Log recovery timestamp, duration, data discrepancy (if any), and sign-off in `docs/VALIDATION_LOG.md`.

---

## 5. Automated Verification Script Usage

Trinetra AI provides an automated drill script and REST endpoint:
- **CLI Command**:
  ```powershell
  python backend/scripts/backup_restore_drill.py --mode synthetic
  ```
- **REST API Endpoint**:
  ```http
  POST /api/backup/run-synthetic-drill
  Header: X-Admin-Role: admin
  Header: X-Step-Up-Token: <step_up_token>
  ```
- **Status Endpoint**:
  ```http
  GET /api/backup/drill-status
  ```

---

## 6. Audit Logging & Compliance Sign-Off

Every drill execution produces an immutable audit event:
```json
{
  "event": "BACKUP_RESTORE_DRILL_COMPLETED",
  "mode": "synthetic",
  "rpo_achieved_minutes": 0.0,
  "rto_achieved_seconds": 1.45,
  "rpo_compliant": true,
  "rto_compliant": true,
  "checksum_verified": true,
  "schema_integrity": "VALID",
  "tables_verified": 10
}
```
All drill records must be retained for statutory audit purposes (`CONFIRM WITH CA`).
