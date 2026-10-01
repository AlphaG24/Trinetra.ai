-- ============================================================================
-- TRINETRA AI: OUTBOUND SAFETY GUARDRAILS SCHEMA (PHASE 3)
-- Migration: 20261001000003_create_outbound_safety_guardrails.sql
-- Description: Adds campaign classification, contact consent tracking,
--              DND audit fields, and approved WhatsApp templates.
--
-- LEGAL NOTICE:
-- [CONFIRM WITH A LAWYER] Telemarketing time restrictions (09:00-21:00 local time)
-- and NCPR/DND scrubbing governed by TRAI TCCCPR 2018 (India) & FCC TCPA (US).
-- Primary Sources:
-- - TRAI TCCCPR 2018: https://trai.gov.in/telecom-commercial-communication-customer-preference-regulations-2018
-- - TRAI DND Portal: https://trai.gov.in/consumer-info/telecom/dnd
-- - FCC TCPA Rules (47 CFR § 64.1200): https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-64/subpart-L/section-64.1200
-- ============================================================================

-- 1. Add purpose classification to campaigns table
ALTER TABLE public.campaigns 
    ADD COLUMN IF NOT EXISTS purpose VARCHAR(50) DEFAULT 'promotional' 
    CHECK (purpose IN ('promotional', 'service', 'transactional'));

-- 2. Add per-contact consent, callback, and DND tracking columns to campaign_contacts
ALTER TABLE public.campaign_contacts
    ADD COLUMN IF NOT EXISTS consent_flag BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS consent_source VARCHAR(100),
    ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_requested_callback BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS requested_callback_time TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS whatsapp_opt_in_source VARCHAR(100),
    ADD COLUMN IF NOT EXISTS dnd_status VARCHAR(50) DEFAULT 'unchecked',
    ADD COLUMN IF NOT EXISTS dnd_checked_at TIMESTAMPTZ;

-- 3. Create table for approved WhatsApp messaging templates
CREATE TABLE IF NOT EXISTS public.whatsapp_approved_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
    language VARCHAR(20) NOT NULL DEFAULT 'en',
    body_text TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    meta_template_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable RLS on whatsapp_approved_templates (SEC-004)
ALTER TABLE public.whatsapp_approved_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view approved templates"
    ON public.whatsapp_approved_templates FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY "Service role full access on whatsapp_approved_templates"
    ON public.whatsapp_approved_templates FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 5. Seed standard compliant templates
INSERT INTO public.whatsapp_approved_templates (template_name, category, language, body_text, variables)
VALUES 
(
    'service_appointment_reminder',
    'UTILITY',
    'en',
    'Hello {{1}}, this is a reminder regarding your upcoming appointment with {{2}} scheduled for {{3}}. Reply YES to confirm or RESCHEDULE to pick a new time.',
    '["customer_name", "business_name", "appointment_time"]'::jsonb
),
(
    'service_appointment_reminder_hi',
    'UTILITY',
    'hi',
    'नमस्ते {{1}}, यह {{2}} के साथ {{3}} पर निर्धारित आपकी अपॉइंटमेंट की पुष्टि है। कन्फर्म करने के लिए YES भेजें।',
    '["customer_name", "business_name", "appointment_time"]'::jsonb
),
(
    'lead_requested_info',
    'UTILITY',
    'en',
    'Hi {{1}}, as requested during our call, here are the details for {{2}}: {{3}}. Feel free to ask any questions!',
    '["customer_name", "product_name", "info_link"]'::jsonb
)
ON CONFLICT (template_name) DO NOTHING;

-- 6. Indexes for safety guardrails
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_consent 
    ON public.campaign_contacts(campaign_id, consent_flag);

CREATE INDEX IF NOT EXISTS idx_campaign_contacts_dnd 
    ON public.campaign_contacts(campaign_id, dnd_status);

CREATE INDEX IF NOT EXISTS idx_campaigns_purpose 
    ON public.campaigns(purpose);
