# Trinetra AI / Vaakriti - Customer Data Processing Addendum (DPA)

> **CRITICAL LEGAL NOTICE**  
> All terms in this Addendum are marked **`IMPLEMENTED, pending legal review`** and must be reviewed and executed by legal counsel prior to formal execution with enterprise customers.  
> Any legal question or threshold is explicitly flagged **`CONFIRM WITH A LAWYER`**.  
> Third-party subprocessor terms are marked **`UNVERIFIED, check provider terms`**.  
> **Status Taxonomy**: Strictly uses `IMPLEMENTED, pending legal review` and `VERIFIED`. NEVER claims `COMPLIANT`.

---

This Data Processing Addendum ("**DPA**") supplements the Master Services Agreement or Terms of Service ("**Agreement**") entered into by and between the customer agreeing to these terms ("**Customer**" or "**Data Fiduciary / Controller**") and **Trinetra AI** (transitioning brand: **Vaakriti**, "**Company**" or "**Data Processor**").

---

## 1. Scope, Roles & Subject Matter

### 1.1 Scope
This DPA applies to Company's Processing of Customer Personal Data in connection with the provision of voice agent orchestration, telephony routing, automatic speech recognition (STT), text-to-speech synthesis (TTS), large language model inference (LLM), and appointment management services.

### 1.2 Roles of the Parties
- **Customer**: Acts as the **Data Fiduciary** under the Digital Personal Data Protection Act 2023 (India) and the **Controller** under EU GDPR Article 4(7) and CCPA/CPRA (`CONFIRM WITH A LAWYER`).
- **Company**: Acts as the **Data Processor** processing Customer Personal Data solely on behalf of, and in accordance with the documented statutory instructions of, Customer.
- **Telecom Intermediaries & Subprocessors**: The third parties cataloged in the [Subprocessor Register](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/docs/compliance/SUBPROCESSOR_REGISTER.md) act as sub-processors or telecommunications intermediaries.

---

## 2. Customer Responsibilities & Lawful Basis

1. **Lawful Basis & Notice**: Customer represents and warrants that it has established a valid statutory basis (including informed, affirmative consent under India DPDP Act Sec 6, TRAI TCCCPR 2018, and GDPR Art 6/7) to process and transfer Personal Data to Company.
2. **AI Identity Disclosure & Recording Consent**: Customer agrees that all voice agents deployed through the Company platform must adhere to immutable statutory disclosures:
   - Mandatory AI assistant identity statement.
   - Mandatory call recording notice before recording is activated.
   - Respect for mid-call caller recording declines and live human transfers.
3. **Prohibited Categories**: Customer shall not submit to the platform:
   - Unmasked Aadhaar numbers or government identification except via the dedicated Encrypted KYC Vault.
   - Personal health information requiring clinical medical device certification.
   - Data relating to minors under 18 years without verifiable parental consent (`CONFIRM WITH A LAWYER`).

---

## 3. Technical & Organizational Security Measures

Company implements enterprise-grade technical and organizational safeguards (TOMs) as codified in Section 18 of the Master Plan:
1. **Encryption**:
   - **At Rest**: AES-256-GCM authenticated encryption for uploaded KYC documents and carrier credentials; AES-256 for database volumes and backups.
   - **In Transit**: Mandatory TLS 1.3 for API endpoints and web traffic; DTLS-SRTP for real-time WebRTC media streams.
2. **Access Control & Privilege Separation**:
   - Role-Based Access Control enforcing three canonical roles: `customer`, `developer_tester`, and `admin`.
   - Mandatory Multi-Factor Authentication (MFA / TOTP) and 30-minute idle session timeouts for privileged administrative access.
   - Mandatory Step-Up Re-Authentication (`action: kyc_view`, `wallet_adjust`, `price_change`, `role_change`) before performing high-risk actions.
   - Strict bar preventing `developer_tester` accounts from accessing customer KYC documents or production financial records.
3. **Data Isolation**:
   - PostgreSQL Row Level Security (RLS) policies guaranteeing cryptographic and logical tenant isolation (`organization_id`).
4. **PII Sanitization & Logging Hygiene**:
   - Real-time logging scrubber redacting phone numbers, Aadhaar, PAN, SSN, API tokens, and JWTs from logs, error reports, and external monitoring providers.
5. **Caller Rights & Statutory DSAR**:
   - Native programmatic tools to support Data Subject Access Requests (DSAR), machine-readable data export (JSON/CSV), and statutory right to erasure with audit trail verification.

---

## 4. Subprocessor Engagement & Notification

1. **Authorized Subprocessors**: Customer grants general written authorization to Company to engage the Subprocessors listed in the [Subprocessor Register](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/docs/compliance/SUBPROCESSOR_REGISTER.md).
2. **30-Day Prior Notification**: Company shall provide at least **thirty (30) days' prior written notice** (via administrative dashboard alert and email) before engaging any new Subprocessor or modifying processing scopes.
3. **Right to Object**: Customer may object to a new Subprocessor on reasonable data protection grounds within fourteen (14) days of notice. If the parties cannot resolve the objection, Customer may terminate the affected services without penalty (`CONFIRM WITH A LAWYER`).
4. **Subprocessor Obligations**: Company shall impose data protection obligations no less protective than those in this DPA upon every Subprocessor.

---

## 5. Personal Data Breach Incident Response & Notification

1. **Notification Timelines**:
   - In the event of a confirmed Personal Data Breach affecting Customer Personal Data, Company shall notify Customer **without undue delay**, and in all cases within:
     - **Six (6) hours** where required under CERT-In Cybersecurity Directions 2022.
     - **Seventy-two (72) hours** of becoming aware of the breach under GDPR Article 33 (`CONFIRM WITH A LAWYER`).
2. **Incident Details**: The notification shall specify:
   - Nature and extent of the breach, including categories and approximate number of data subjects affected.
   - Identity of Company's incident response lead.
   - Likely consequences and potential risks.
   - Mitigation and containment measures adopted or planned.
3. **Remediation & Assistance**: Company shall execute its [Data Breach Incident Response Runbook](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/docs/compliance/DATA_BREACH_RUNBOOK.md), preserve forensic evidence, and assist Customer with regulatory notifications to the Data Protection Board of India or supervisory authorities.

---

## 6. Data Subject Rights & Audit Assistance

1. **Data Subject Rights**: Company shall assist Customer via programmatic endpoints (`/api/admin/caller-rights`) in responding to requests by data subjects exercising statutory rights (access, rectification, erasure, restriction, and portability).
2. **Audits & Inspection**: Company shall make available information reasonably necessary to demonstrate compliance with this DPA, and allow for independent third-party audits or certifications (e.g. SOC 2 Type II or ISO 27001 summary reports) upon annual written request subject to standard confidentiality agreements.

---

## 7. Termination, Data Return & Deletion

1. **Post-Termination Deletion**: Within thirty (30) days following termination of the Agreement, Company shall delete or return all Customer Personal Data in its possession or control.
2. **Statutory Exceptions**: Company is permitted to retain Customer Personal Data solely to the extent required by applicable statutory law:
   - Financial and tax records retained for up to eight (8) years under Section 44AA of the Indian Income Tax Act 1961 (`CONFIRM WITH CA`).
   - Call detail records retained for nine (9) months under telecom intermediary directives (`CONFIRM WITH A LAWYER`).
   - Cryptographically masked audit trail logs (`admin_audit_trail`, `kyc_audit_logs`) maintained for legal defense.

---

## 8. Governing Law & Jurisdiction

This DPA shall be governed by and construed in accordance with the laws of the **Republic of India** (with jurisdiction in the courts of Bengaluru/New Delhi) or, where GDPR mandatory provisions apply, the relevant EU Member State law specified in the Standard Contractual Clauses (`CONFIRM WITH A LAWYER`).
