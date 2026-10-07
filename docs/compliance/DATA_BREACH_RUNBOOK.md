# Trinetra AI / Vaakriti - Personal Data Breach Incident Response Runbook

> **CRITICAL LEGAL NOTICE**  
> All procedures in this runbook are marked **`IMPLEMENTED, pending legal review`** and must be reviewed by legal counsel.  
> Statutory notification triggers and reporting windows are flagged **`CONFIRM WITH A LAWYER`**.  
> **Status Taxonomy**: Strictly uses `IMPLEMENTED, pending legal review` and `VERIFIED`. NEVER claims `COMPLIANT`.

---

## 1. Purpose & Incident Response Philosophy

This Runbook defines the step-by-step procedures for detecting, triaging, containing, investigating, and reporting any security incident or suspected breach involving Customer Personal Data processed by Trinetra AI (Vaakriti).

### Statutory Reporting Clock:
- **T0**: Time of initial confirmed detection.
- **T + 6 Hours**: Statutory incident report to **CERT-In** (Indian Computer Emergency Response Team) for cyber security incidents per CERT-In Directions 2022.
- **T + 24 Hours**: Executive briefing & customer risk assessment completed.
- **T + 72 Hours**: Formal statutory notification to affected Customers and supervisory authorities (DPDP Data Protection Board / EU DPAs under GDPR Art 33) (`CONFIRM WITH A LAWYER`).

---

## 2. Severity Classification Matrix

| Severity Level | Definition & Triggers | Response SLA | Response Lead |
| :--- | :--- | :--- | :--- |
| **P1 - CRITICAL** | Confirmed unauthorized exfiltration or exposure of unmasked customer personal data, encrypted KYC documents, carrier credentials, or active database volumes affecting multiple tenants. | **Immediate (< 15 mins)** | Incident Commander + Chief Security Officer + Legal Lead |
| **P2 - HIGH** | Compromised administrative credentials, unauthorized single-tenant data access, brute force breach of admin portal, or failure of tenant isolation controls. | **< 30 mins** | Lead Security Engineer + Platform Architect |
| **P3 - MEDIUM** | Suspicious API activity, single-user credential stuffing attempt, abnormal billing spikes, or transient leakage of masked PII in debug logs. | **< 2 hours** | Operations Lead |
| **P4 - LOW** | Minor misconfiguration, automated vulnerability scan probe, failed phishing attempt with zero compromise, or non-sensitive log anomaly. | **< 8 hours** | Security Analyst |

---

## 3. Five-Phase Response Workflow

```
[ Phase 1: Detect & Triage ] ──► [ Phase 2: Contain & Quarantine ] ──► [ Phase 3: Forensic Audit ]
                                                                                   │
[ Phase 5: Post-Mortem & Remediation ] ◄── [ Phase 4: Regulatory & Customer Notice ] ◄──┘
```

### Phase 1: Detection, Triage & Clock Activation (0 - 15 Mins)
1. **Report Ingestion**: Alerts triggered by Sentry exception spikes, BetterStack telemetry, automated database tamper alarms, or support ticket reports.
2. **Declaration of Incident**: Incident Commander declares P1 or P2 incident and logs **T0 timestamp** in the Incident Log.
3. **Assemble Incident Team**:
   - Incident Commander (Coordinates technical response).
   - Technical Forensic Lead (Investigates infrastructure and database logs).
   - Legal & Compliance Lead (Evaluates statutory notification duties).
   - Communications Lead (Drafts customer and regulatory communications).

### Phase 2: Immediate Containment & Eradication (15 - 60 Mins)
1. **Privileged Session Invalidation**:
   - Invalidate all active administrative sessions and step-up auth tokens.
   - Force session termination in Supabase Auth for suspect accounts.
2. **Credential Rotation**:
   - Rotate Supabase Service Role Keys, carrier credentials (Twilio, Exotel), and webhook HMAC signing secrets.
   - Revoke compromised API keys via `/api/admin/operations` and re-key encryption salt seeds.
3. **Network Isolation**:
   - Restrict database ingress to private internal VPC; enable Cloudflare under-attack mode on public endpoints.

### Phase 3: Forensic Investigation & Scope Assessment (1 - 6 Hours)
1. **Audit Trail Inspection**:
   - Query `public.admin_audit_trail` to identify actor ID, IP addresses, and actions executed during the attack window.
   - Query `public.kyc_access_audit_logs` to verify whether any encrypted KYC documents were accessed.
   - Query `public.voice_calls` and `public.byon_carrier_credentials` to verify telephony exposure.
2. **Data Identification**:
   - Catalog exact categories of personal data exposed: names, phone numbers, call audio, transcripts, payment tokens, or KYC documents.
   - Determine specific organizations (`organization_id`) affected.

### Phase 4: Statutory & Customer Notification (Within Mandatory Timelines)
1. **CERT-In Reporting (Within 6 Hours)**:
   - For severe cyber security incidents (unauthorized access to database, system compromise), submit statutory report to `incident@cert-in.org.in` per CERT-In Directions 2022 Format (`CONFIRM WITH A LAWYER`).
2. **Customer Notification (Within 72 Hours)**:
   - Dispatch formal incident notice to the administrative contact of each affected organization.

---

## 4. Pre-Drafted Customer Breach Notification Template

```markdown
Subject: [URGENT] Security Notification Regarding Your Trinetra AI Account

Dear [Customer Administrator Name / Organization],

We are writing to inform you of a security incident that may have affected personal data associated with your Trinetra AI (Vaakriti) organization.

1. Description of the Incident:
On [Date] at approximately [Time UTC], our automated security monitoring detected [brief description of unauthorized access / security event]. 

2. Nature of Data Involved:
Our forensic investigation indicates that the following categories of data may have been accessed:
- [e.g., Contact phone numbers, call metadata, agent prompt configurations]
- Note: Financial payment details (PCI-DSS credit cards) and passwords were NOT exposed as they are processed exclusively by Razorpay and cryptographically salted in Supabase Auth.

3. Immediate Actions Taken:
Upon detection, our security team took the following immediate containment steps:
- Terminated all active privileged sessions and invalidated authorization tokens.
- Rotated all relevant upstream API credentials and database access keys.
- Implemented additional ingress filters to block unauthorized access patterns.

4. Recommended Customer Actions:
As a precautionary measure, we recommend:
- Rotating passwords and enabling Multi-Factor Authentication (MFA) on your administrator accounts.
- Reviewing your organization's recent call logs and agent configurations.

5. Inquiries & Dedicated Support:
Our incident response team is available to assist you 24/7. Please direct any questions or requests for forensic information to security@trinetraedu-ai.com.

Sincerely,
Security & Compliance Team
Trinetra AI / Vaakriti
```

---

## 5. Phase 5: Post-Mortem & Remediation (Within 14 Days)
1. **Root-Cause Analysis (RCA)**: Document root technical or operational cause and submit to leadership.
2. **Architectural Hardening**: Implement code-level tests, RLS policy adjustments, and firewall rule refinements to eliminate recurrence.
3. **Preservation of Records**: Maintain all forensic audit logs and response documentation for a minimum of five (5) years for regulatory defense (`CONFIRM WITH A LAWYER`).
