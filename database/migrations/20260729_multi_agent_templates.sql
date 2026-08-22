-- ============================================================
-- Migration: Multi-Agent Template Types → platform_services
-- Date: 2026-07-29
-- Description: Adds 5 new agent template types to the marketplace
--              (Sales Agent, Support Agent, Appointment Booker,
--               Lead Qualifier, Multi-Personality Agent)
-- ============================================================

-- UP MIGRATION
-- Safe inserts — skips if slug already exists (idempotent)

INSERT INTO platform_services (
    name,
    slug,
    type,
    description,
    status,
    marketplace_metadata
)
VALUES

-- 1. Sales Agent
(
    'Sales Agent',
    'sales_agent',
    'voice',
    'An AI voice sales agent that calls prospects in natural Hinglish, handles every objection, and closes with a concrete next step. Pre-loaded with price objection handling, competitor comparison scripts, trial close, and assumptive close techniques.',
    'live',
    '{
        "icon": "🎯",
        "tagline": "Converts prospects with natural Hinglish sales conversations",
        "category": "Sales",
        "features": [
            "Natural Hinglish with automatic language switching",
            "Full BANT objection handling (price, competitor, busy, not interested)",
            "3 closing techniques: trial close, assumptive close, urgency close",
            "Warm human-style conversation with fillers and emotional acknowledgment",
            "Default greeting auto-configured",
            "Never uses bookish Hindi — always natural business Hinglish"
        ],
        "use_cases": [
            "Outbound lead follow-up",
            "Product demo scheduling",
            "Trial activation calls",
            "Pricing enquiry handling"
        ],
        "language": "Hinglish (Hindi + English)",
        "personality": "Warm, confident, persuasive",
        "voice_recommendation": "shubh",
        "pricing_tier": "starter",
        "template_file": "sales_agent.txt"
    }'::jsonb
),

-- 2. Support Agent
(
    'Support Agent',
    'support_agent',
    'voice',
    'An empathetic AI customer support agent that troubleshoots step by step, handles angry customers with warmth, and escalates to humans when needed. Built for Indian businesses with natural Hinglish.',
    'live',
    '{
        "icon": "🤝",
        "tagline": "Resolves customer issues with empathy and precision",
        "category": "Support",
        "features": [
            "Empathy-first approach: acknowledges frustration before troubleshooting",
            "Step-by-step troubleshooting with progress updates",
            "Angry customer de-escalation protocol",
            "Seamless human escalation with handoff script",
            "Never makes customer feel stupid",
            "Handles refunds, complaints, order issues, technical problems"
        ],
        "use_cases": [
            "Customer complaint handling",
            "Technical support calls",
            "Order and delivery queries",
            "Refund and return processing"
        ],
        "language": "Hinglish (Hindi + English)",
        "personality": "Empathetic, calm, solution-focused",
        "voice_recommendation": "anushka",
        "pricing_tier": "starter",
        "template_file": "support_agent.txt"
    }'::jsonb
),

-- 3. Appointment Booker
(
    'Appointment Booker',
    'appointment_agent',
    'voice',
    'A precise, friendly AI appointment booking agent that collects all necessary details, confirms availability, reads back booking details before confirming, and handles rescheduling and cancellations seamlessly.',
    'live',
    '{
        "icon": "📅",
        "tagline": "Books, reschedules, and cancels appointments with zero friction",
        "category": "Appointments",
        "features": [
            "Collects Name, Phone, Service, Date, Time in natural conversation",
            "Always reads back all details before confirming",
            "Handles new bookings, rescheduling, and cancellations",
            "Availability simulation (real calendar integration ready)",
            "Sends confirmation with all appointment details",
            "Works for clinics, salons, consultancies, and any service business"
        ],
        "use_cases": [
            "Medical clinic appointment booking",
            "Salon and spa scheduling",
            "Consultant and coach bookings",
            "Service center appointments"
        ],
        "language": "Hinglish (Hindi + English)",
        "personality": "Friendly, efficient, precise",
        "voice_recommendation": "anushka",
        "pricing_tier": "starter",
        "template_file": "appointment_agent.txt"
    }'::jsonb
),

-- 4. Lead Qualifier
(
    'Lead Qualifier',
    'lead_qualifier',
    'voice',
    'An AI lead qualification agent that asks BANT questions conversationally, scores leads as Hot/Warm/Cold automatically, routes hot leads to humans immediately, and always captures contact details before hanging up.',
    'live',
    '{
        "icon": "🔥",
        "tagline": "Qualifies every inbound lead in under 2 minutes",
        "category": "Sales",
        "features": [
            "BANT qualification: Budget, Authority, Need, Timeline",
            "Automatic lead scoring: Hot / Warm / Cold",
            "Hot lead instant routing to human team",
            "Conversational style — never sounds like an interrogation",
            "Captures Name, Phone, Email, Company before every call ends",
            "Warm leads scheduled for callback, cold leads sent resources"
        ],
        "use_cases": [
            "Website enquiry follow-up",
            "Inbound lead screening",
            "Trade show and event lead qualification",
            "Marketing campaign response handling"
        ],
        "language": "Hinglish (Hindi + English)",
        "personality": "Curious, conversational, non-pushy",
        "voice_recommendation": "shubh",
        "pricing_tier": "starter",
        "template_file": "lead_qualifier.txt"
    }'::jsonb
),

-- 5. Multi-Personality Agent
(
    'Multi-Personality Agent',
    'multi_agent',
    'voice',
    'One AI agent that handles Sales, Support, Appointments, AND Lead Qualification from a single phone number. Detects caller intent from the first 10-15 words and instantly switches personality. No IVR, no press-1-for-sales — just natural intelligence.',
    'live',
    '{
        "icon": "🤖",
        "tagline": "One number, all capabilities — intent-aware AI for every caller",
        "category": "Multi-Agent",
        "features": [
            "Intent detection from first 10-15 words of conversation",
            "4 personalities in one: Sales, Support, Appointments, Lead Qualifier",
            "Seamless mid-call personality switching if caller shifts intent",
            "Single phone number handles all call types",
            "Natural Hinglish with automatic language matching",
            "Full objection handling, empathy protocols, and booking flows built-in"
        ],
        "use_cases": [
            "Small businesses that need one number for everything",
            "Companies replacing an IVR phone tree",
            "Startups that cannot staff separate sales and support teams",
            "Any business where callers have mixed needs"
        ],
        "language": "Hinglish (Hindi + English)",
        "personality": "Adaptive — Sales / Support / Booking / Qualifier",
        "voice_recommendation": "shubh",
        "pricing_tier": "professional",
        "template_file": "multi_agent.txt",
        "is_premium": true
    }'::jsonb
)

ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    marketplace_metadata = EXCLUDED.marketplace_metadata,
    updated_at = now();


-- ============================================================
-- DOWN MIGRATION (run if you need to rollback)
-- ============================================================
-- DELETE FROM platform_services
-- WHERE slug IN (
--     'sales_agent',
--     'support_agent',
--     'appointment_agent',
--     'lead_qualifier',
--     'multi_agent'
-- );
