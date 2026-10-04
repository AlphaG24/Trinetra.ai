"""
backend/app/services/compliance_service.py

Compliance Service Engine for Trinetra AI (Vaakriti).
Implements Master Plan Section 18.15 Item 15 & Statutory Disclosure Mandates.

Exposes:
1. Active Statutory Subprocessor Register.
2. Customer Data Processing Addendum (DPA) terms & safeguards.
3. Personal Data Breach Incident Response parameters (CERT-In 6h / GDPR 72h).
4. Statutory Status Taxonomy & Caveat Verifier.
"""

from typing import Dict, Any, List


class ComplianceService:
    """Service providing programmatic access to statutory compliance records."""

    SUBPROCESSORS: List[Dict[str, Any]] = [
        {
            "name": "Supabase",
            "entity": "Supabase, Inc. (USA)",
            "category": "database_and_storage",
            "data_processed": "Account metadata, user profiles, encrypted KYC documents, encrypted carrier credentials, audit logs",
            "location": "AWS Mumbai (ap-south-1) / Frankfurt / US",
            "safeguards": "Standard Contractual Clauses (SCCs), AES-256 at rest, TLS 1.3 in transit",
            "status": "VERIFIED (2026-10-04)"
        },
        {
            "name": "LiveKit Cloud",
            "entity": "LiveKit, Inc. (USA)",
            "category": "webrtc_media_routing",
            "data_processed": "Ephemeral voice audio packets, room session metadata",
            "location": "Global Edge (India/Singapore/Frankfurt/US nodes)",
            "safeguards": "DTLS-SRTP encryption, Zero Data Retention (ZDR) by default, EU SCCs",
            "status": "VERIFIED (2026-10-04)"
        },
        {
            "name": "Exotel",
            "entity": "Exotel Techcom Private Limited (India)",
            "category": "telephony_carrier",
            "data_processed": "Caller and callee phone numbers (E.164), call duration, DTMF signals, call metadata",
            "location": "India (Mumbai / Bengaluru data centers)",
            "safeguards": "Indian IT Act telecom intermediary terms, TRAI TCCCPR 2018 compliance, TLS",
            "status": "VERIFIED TERMS ANALYZED; enterprise contract CONFIRM WITH A LAWYER"
        },
        {
            "name": "Twilio",
            "entity": "Twilio, Inc. (USA)",
            "category": "telephony_carrier_and_messaging",
            "data_processed": "Phone numbers, SMS/WhatsApp message text, call connection metadata",
            "location": "USA, Ireland, Germany, Global edge",
            "safeguards": "Binding Corporate Rules (BCRs), EU/UK SCCs, Data Privacy Framework",
            "status": "VERIFIED (2026-10-04)"
        },
        {
            "name": "Google Gemini API",
            "entity": "Google LLC (USA)",
            "category": "llm_inference",
            "data_processed": "Transcribed caller utterances, agent prompts, conversation context (ephemeral)",
            "location": "Google Cloud Data Centers (Global)",
            "safeguards": "Google Cloud DPA (Paid Services tier with Zero Model Training), EU SCCs",
            "status": "VERIFIED TERMS ANALYZED; enterprise DPA execution CONFIRM WITH A LAWYER"
        },
        {
            "name": "Groq",
            "entity": "Groq, Inc. (USA)",
            "category": "llm_inference_failover",
            "data_processed": "Transcribed caller utterances, agent prompts, conversation context (ephemeral)",
            "location": "USA (GroqCloud Infrastructure)",
            "safeguards": "Groq Customer DPA, Zero Data Retention for commercial API, EU SCCs",
            "status": "VERIFIED TERMS ANALYZED; customer DPA CONFIRM WITH A LAWYER"
        },
        {
            "name": "Sarvam AI",
            "entity": "Axonwise Private Limited (India)",
            "category": "voice_ai_stt_tts",
            "data_processed": "Indian regional audio streams, voice prompts, phonetic transcriptions",
            "location": "India (Local sovereign data infrastructure)",
            "safeguards": "Sarvam AI DPA, DPDP Act 2023 alignment, TLS 1.3",
            "status": "VERIFIED TERMS ANALYZED; master service agreement CONFIRM WITH A LAWYER"
        },
        {
            "name": "ElevenLabs",
            "entity": "ElevenLabs, Inc. (USA)",
            "category": "voice_synthesis_tts",
            "data_processed": "Agent dialogue text strings, voice synthesis parameter outputs",
            "location": "USA and EU cloud edge",
            "safeguards": "Commercial Plan DPA, EU SCCs, TLS 1.3",
            "status": "VERIFIED TERMS ANALYZED; commercial plan terms CONFIRM WITH A LAWYER"
        },
        {
            "name": "Deepgram",
            "entity": "Deepgram, Inc. (USA)",
            "category": "speech_to_text_stt",
            "data_processed": "Streaming audio chunks, spoken text tokens",
            "location": "USA and EU cloud nodes",
            "safeguards": "Deepgram DPA, streaming ephemeral processing",
            "status": "UNVERIFIED, check provider terms"
        },
        {
            "name": "Razorpay",
            "entity": "Razorpay Software Private Limited (India)",
            "category": "payment_gateway",
            "data_processed": "Billing contact name, email, transaction amounts, payment method tokens (PCI-DSS)",
            "location": "India (RBI-mandated localized data storage)",
            "safeguards": "RBI payment aggregator guidelines, PCI-DSS Level 1, TLS 1.3",
            "status": "VERIFIED TERMS ANALYZED; merchant terms CONFIRM WITH A LAWYER"
        },
        {
            "name": "Vultr / DigitalOcean",
            "entity": "The Constant Company, LLC / DigitalOcean, LLC (USA)",
            "category": "cloud_infrastructure",
            "data_processed": "Ephemeral container execution memory, encrypted log buffers",
            "location": "Mumbai (India), Singapore, Frankfurt",
            "safeguards": "Enterprise Cloud DPA, EU SCCs, ISO 27001",
            "status": "IMPLEMENTED, pending legal review"
        }
    ]

    DPA_METADATA: Dict[str, Any] = {
        "version": "2026.1",
        "last_updated": "2026-10-04",
        "governing_law": "Republic of India (Courts of Bengaluru/Delhi) / EU SCCs for cross-border transfers",
        "statutory_label": "IMPLEMENTED, pending legal review",
        "parties": {
            "customer": "Data Fiduciary / Controller",
            "company": "Data Processor"
        },
        "technical_safeguards": [
            "AES-256-GCM authenticated encryption at rest",
            "TLS 1.3 and DTLS-SRTP encryption in transit",
            "UIDAI Aadhaar and PAN masking",
            "PostgreSQL Row Level Security (RLS) tenant isolation",
            "Mandatory Admin MFA and 30-minute idle session timeout",
            "Privileged Step-Up Auth enforcement (kyc_view, wallet_adjust, price_change, role_change)"
        ],
        "subprocessor_change_notice_days": 30,
        "breach_notification_window_hours": {
            "cert_in": 6,
            "gdpr": 72
        },
        "legal_caveat": "CONFIRM WITH A LAWYER"
    }

    BREACH_RUNBOOK_SUMMARY: Dict[str, Any] = {
        "status": "IMPLEMENTED, pending legal review",
        "severity_levels": ["P1 - CRITICAL", "P2 - HIGH", "P3 - MEDIUM", "P4 - LOW"],
        "reporting_deadlines": {
            "t0": "Confirmed breach detection",
            "cert_in_statutory_window_hours": 6,
            "gdpr_customer_window_hours": 72
        },
        "containment_protocols": [
            "Immediate privileged session and step-up token invalidation",
            "Upstream credential rotation (carrier, database service role, signing secrets)",
            "Network ingress restrictions and Cloudflare under-attack defense"
        ],
        "incident_contact": "security@trinetraedu-ai.com",
        "legal_caveat": "CONFIRM WITH A LAWYER"
    }

    @classmethod
    def get_subprocessors(cls) -> List[Dict[str, Any]]:
        """Returns the complete list of statutory subprocessors."""
        return cls.SUBPROCESSORS

    @classmethod
    def get_dpa_metadata(cls) -> Dict[str, Any]:
        """Returns the customer DPA summary and technical safeguards."""
        return cls.DPA_METADATA

    @classmethod
    def get_breach_runbook_summary(cls) -> Dict[str, Any]:
        """Returns the data breach incident response parameters."""
        return cls.BREACH_RUNBOOK_SUMMARY

    @classmethod
    def get_compliance_overview(cls) -> Dict[str, Any]:
        """Returns aggregated statutory compliance status."""
        return {
            "dpa": cls.DPA_METADATA,
            "subprocessor_count": len(cls.SUBPROCESSORS),
            "subprocessors": cls.SUBPROCESSORS,
            "breach_runbook": cls.BREACH_RUNBOOK_SUMMARY,
            "statutory_status": "IMPLEMENTED, pending legal review",
            "legal_caveat": "CONFIRM WITH A LAWYER"
        }
