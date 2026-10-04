# Trinetra AI / Vaakriti - Statutory Subprocessor Register

> **CRITICAL LEGAL NOTICE**  
> All statuses in this register are marked **`IMPLEMENTED, pending legal review`** unless formal, written confirmation has been executed by a licensed attorney.  
> Any legal question or statutory threshold is explicitly flagged **`CONFIRM WITH A LAWYER`**.  
> All claims regarding third-party vendor practices (LiveKit, Exotel, Twilio, Deepgram, ElevenLabs, Groq, Gemini, Supabase, Razorpay) are marked **`UNVERIFIED, check provider terms`**.  
> **Status Taxonomy**: Strictly uses `IMPLEMENTED, pending legal review` and `VERIFIED`. NEVER claims `COMPLIANT`.

---

## 1. Overview & Policy Statement

Trinetra AI (transitioning brand: Vaakriti) engages third-party entities ("Subprocessors") to perform specific infrastructure, telephony, machine learning, and payment processing functions on behalf of Customers.

Under the **Digital Personal Data Protection Act 2023 (India)**, the **General Data Protection Regulation (EU GDPR Art 28)**, and the **California Consumer Privacy Act (CCPA/CPRA)**:
- Customer acts as the **Data Fiduciary / Controller**.
- Trinetra acts as the **Data Processor**.
- Listed entities act as **Subprocessors / Telecommunications Intermediaries**.

### 30-Day Change Notification Protocol
Customers are notified at least **30 days** prior to the engagement of any new subprocessor or material modification to an existing subprocessor's processing scope. Notifications are transmitted via dashboard alert and registered email. Customers retain the right to submit reasonable, written objections on data protection grounds prior to activation (`CONFIRM WITH A LAWYER`).

---

## 2. Active Statutory Subprocessor Register

| Subprocessor Name | Corporate Entity & Jurisdiction | Processing Purpose / Category | Categories of Personal Data Processed | Data Processing Location | Transfer Mechanism & Safeguards | Execution Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Supabase, Inc.** | Supabase, Inc. (Delaware, USA) | Managed PostgreSQL database, authentication, file vault storage | Account metadata, user profiles, encrypted KYC documents, encrypted carrier credentials, audit logs | AWS Mumbai (ap-south-1) / Frankfurt / US (Tenant Configurable) | Standard Contractual Clauses (SCCs), AES-256 at rest, TLS 1.3 in transit | `VERIFIED (2026-10-04)` |
| **LiveKit Cloud** | LiveKit, Inc. (California, USA) | WebRTC real-time media routing & SFU audio transport | Ephemeral voice audio packets, room session metadata | Global edge routing, India/Singapore/Frankfurt/US nodes | DTLS-SRTP encryption, Zero Data Retention (ZDR) by default, EU SCCs | `VERIFIED (2026-10-04)` |
| **Exotel Techcom Private Limited** | Exotel Techcom Pvt. Ltd. (Bengaluru, Karnataka, India) | Indian domestic telephony, virtual phone numbers, DLT caller ID, PSTN bridging | Caller and callee phone numbers (E.164), call duration, DTMF signals, call metadata | India (Mumbai / Bengaluru data centers) | Indian IT Act telecom intermediary contract, TRAI TCCCPR 2018 compliance, TLS | `VERIFIED TERMS ANALYZED; enterprise contract CONFIRM WITH A LAWYER` |
| **Twilio, Inc.** | Twilio, Inc. (Delaware, USA) | International telephony, PSTN termination, WhatsApp Business API | Phone numbers, SMS/WhatsApp message text, call connection metadata | USA, Ireland, Germany, Global edge | Binding Corporate Rules (BCRs), EU/UK SCCs, Data Privacy Framework | `VERIFIED (2026-10-04)` |
| **Google LLC (Gemini API)** | Google LLC (California, USA) | Large Language Model (LLM) conversational inference & intent parsing | Transcribed caller utterances, agent prompts, conversation context (ephemeral) | Google Cloud Data Centers (Global) | Google Cloud DPA (Paid Services tier with Zero Model Training), EU SCCs | `VERIFIED TERMS ANALYZED; enterprise DPA execution CONFIRM WITH A LAWYER` |
| **Groq, Inc.** | Groq, Inc. (California, USA) | Ultra-low latency LPU foundation model inference (secondary/failover) | Transcribed caller utterances, agent prompts, conversation context (ephemeral) | USA (GroqCloud Infrastructure) | Groq Customer DPA, Zero Data Retention for commercial API, EU SCCs | `VERIFIED TERMS ANALYZED; customer DPA CONFIRM WITH A LAWYER` |
| **Sarvam AI** | Axonwise Private Limited (Bengaluru, Karnataka, India) | Indian language STT/TTS and sovereign voice models | Indian regional audio streams, voice prompts, phonetic transcriptions | India (Local data processing infrastructure) | Sarvam AI DPA, DPDP Act 2023 alignment, TLS 1.3 | `VERIFIED TERMS ANALYZED; master service agreement CONFIRM WITH A LAWYER` |
| **ElevenLabs, Inc.** | ElevenLabs, Inc. (Delaware, USA) | High-fidelity voice synthesis & dynamic speech generation | Agent dialogue text strings, voice synthesis parameter outputs | USA and EU cloud edge | Commercial Plan DPA, EU SCCs, TLS 1.3 | `VERIFIED TERMS ANALYZED; commercial plan terms CONFIRM WITH A LAWYER` |
| **Deepgram, Inc.** | Deepgram, Inc. (California, USA) | Real-time Speech-to-Text (STT) audio transcription | Streaming audio chunks, spoken text tokens | USA and EU cloud nodes | Deepgram DPA, streaming ephemeral processing | `UNVERIFIED, check provider terms` |
| **Razorpay Software Private Limited** | Razorpay Software Pvt. Ltd. (Bengaluru, Karnataka, India) | Prepaid wallet top-ups, payment gateway, GST invoicing billing | Billing contact name, email, transaction amounts, payment method tokens (PCI-DSS) | India (RBI-mandated localized data storage) | RBI payment aggregator guidelines, PCI-DSS Level 1, TLS 1.3 | `VERIFIED TERMS ANALYZED; merchant terms CONFIRM WITH A LAWYER` |
| **Vultr / DigitalOcean** | The Constant Company, LLC / DigitalOcean, LLC (USA) | Cloud computing, container orchestration, application hosting | Ephemeral container execution memory, encrypted log buffers | Mumbai (India), Singapore, Frankfurt | Enterprise Cloud DPA, EU SCCs, ISO 27001 | `IMPLEMENTED, pending legal review` |

---

## 3. Subprocessor Qualification & Due Diligence Requirements

Before engaging any subprocessor, Trinetra AI performs a mandatory four-pillar compliance assessment:
1. **Security & Cryptography**: Verification of AES-256 encryption at rest, TLS 1.3 in transit, and third-party certifications (SOC 2 Type II or ISO/IEC 27001).
2. **Data Minimization & AI Model Training**: Absolute contractual commitment that customer personal data is not used to train public or foundational models without explicit, affirmative opt-in.
3. **Statutory Alignment**: Execution of Standard Contractual Clauses (SCCs) for international transfers and Data Processing Agreements (DPAs) incorporating DPDP Act 2023 and GDPR Article 28 terms (`CONFIRM WITH A LAWYER`).
4. **Breach Notification SLAs**: Strict contractual obligation to report security incidents affecting customer data within **24 hours** of discovery.
