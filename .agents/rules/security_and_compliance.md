# ============================================================================
# TRINETRA AI - SECURITY & COMPLIANCE PRESERVATION RULES
# ============================================================================
# CRITICAL MANDATE: NEVER MODIFY, BYPASS, OR DEGRADE SECURITY & COMPLIANCE FEATURES
# ============================================================================

rules:

  - id: SEC-011
    name: "Immutable Security & Regulatory Compliance Guardrails"
    severity: critical
    description: "Never change, bypass, disable, degrade, or revert any security, privacy, or regulatory compliance implementation under any circumstance."
    pattern: >
      Under NO circumstances should any AI assistant or developer edit, bypass, or weaken
      previously established security and compliance mechanisms. If any bug or issue arises,
      fix the bug while strictly keeping ALL compliance guardrails 100% active and intact.
      Specifically:

      1. MANDATORY AI BOT TRANSPARENCY:
         The voice agent MUST audibly identify itself as an AI assistant at the very start
         of every call (e.g., 'Main Trinetra se Arika bol rahi hoon, ek AI assistant' or
         'Hello! This is Arika from Trinetra, an AI assistant') in compliance with EU AI Act Art. 50
         and California B&P Code § 17941. NEVER bypass or suppress this disclosure.

      2. MANDATORY CALL RECORDING DISCLOSURE:
         The voice agent MUST state that the call may be recorded for service quality at call start
         (e.g., 'Service quality ke liye yeh call record ki ja sakti hai' or 'This call may be recorded
         for service quality') in compliance with two-party consent wiretapping laws. NEVER remove or mute it.

      3. SINGLE COMPLIANT OPENING COMPOSITION:
         ALL opening greetings MUST be resolved through `compose_single_opening_greeting` from
         `app.services.disclosure_service`. NEVER return a raw dashboard greeting directly without
         passing through compliant composition and deduplication.

      4. CALLER PRIVACY & SENSITIVE DATA WITHHOLDING:
         Caller names are used strictly for warm greeting ('Namaste Rahul ji!'). On outbound calls
         or matched caller records containing personal, financial, appointment, or medical details,
         those sensitive details MUST be withheld from the opening utterance until the recipient confirms
         their identity.

      5. RETENTION & TENANT ISOLATION:
         Multi-tenant boundaries (organization_id scoping) on queries, DND scrubbing, calling hour floors
         (09:00 - 21:00), and statutory financial record decoupling from transient voice logs must NEVER be bypassed.

      6. SERVICE-ROLE SAFETY:
         `SUPABASE_SERVICE_ROLE_KEY` must NEVER be exposed to client-side code, Next.js client bundles,
         or unprotected scripts.
