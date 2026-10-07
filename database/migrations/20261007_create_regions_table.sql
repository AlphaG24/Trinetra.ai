-- database/migrations/20261007_create_regions_table.sql
-- Master Plan Section 3: Global Compliance Strategy
-- Stores region-specific compliance rules and customer overrides.

CREATE TABLE IF NOT EXISTS regions (
    region_code VARCHAR(10) PRIMARY KEY, -- 'IN', 'US', 'EU', 'ME', 'SEA'
    name VARCHAR(100) NOT NULL,
    country_codes TEXT[] NOT NULL,
    kyc_document_types TEXT[] NOT NULL,
    raw_aadhaar_allowed BOOLEAN DEFAULT FALSE,
    dnd_scrub_required BOOLEAN DEFAULT TRUE,
    calling_hours_start VARCHAR(5) NOT NULL, -- '09:00' or '08:00'
    calling_hours_end VARCHAR(5) NOT NULL,   -- '21:00'
    recording_consent_type VARCHAR(50) NOT NULL, -- 'audible_disclosure', 'explicit_opt_in', 'two_party_opt_in'
    grace_period_days INT DEFAULT 15,
    hold_period_days INT DEFAULT 14,
    billing_retention_years INT DEFAULT 8,
    deal_retention_days INT DEFAULT 180,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Data for Canonical 5 Regions
INSERT INTO regions (
    region_code, name, country_codes, kyc_document_types, raw_aadhaar_allowed,
    dnd_scrub_required, calling_hours_start, calling_hours_end, recording_consent_type,
    grace_period_days, hold_period_days, billing_retention_years, deal_retention_days
) VALUES
(
    'IN', 'India', ARRAY['+91'],
    ARRAY['masked_aadhaar', 'company_pan', 'gstin_certificate', 'authorized_signatory_id'],
    FALSE, TRUE, '09:00', '21:00', 'audible_disclosure', 15, 14, 8, 180
),
(
    'US', 'United States of America', ARRAY['+1'],
    ARRAY['business_ein', 'state_certificate', 'drivers_license', 'passport'],
    FALSE, TRUE, '08:00', '21:00', 'two_party_opt_in', 15, 14, 7, 180
),
(
    'EU', 'European Union & United Kingdom', ARRAY['+44', '+33', '+49', '+34', '+39', '+31', '+32', '+353', '+46', '+48'],
    ARRAY['company_registration', 'vat_certificate', 'authorized_director_id'],
    FALSE, TRUE, '09:00', '20:00', 'explicit_opt_in', 15, 14, 10, 180
),
(
    'ME', 'Middle East', ARRAY['+971', '+966', '+974', '+965', '+968', '+973'],
    ARRAY['trade_license', 'commercial_registry', 'national_id', 'passport'],
    FALSE, TRUE, '09:00', '21:00', 'audible_disclosure', 15, 14, 10, 180
),
(
    'SEA', 'Southeast Asia', ARRAY['+65', '+62', '+60', '+63', '+66', '+84'],
    ARRAY['local_business_registration', 'tax_id', 'director_id'],
    FALSE, TRUE, '09:00', '21:00', 'explicit_opt_in', 15, 14, 7, 180
)
ON CONFLICT (region_code) DO UPDATE SET
    country_codes = EXCLUDED.country_codes,
    kyc_document_types = EXCLUDED.kyc_document_types,
    calling_hours_start = EXCLUDED.calling_hours_start,
    calling_hours_end = EXCLUDED.calling_hours_end,
    recording_consent_type = EXCLUDED.recording_consent_type,
    updated_at = NOW();

-- Customer Regional Overrides Table
CREATE TABLE IF NOT EXISTS customer_region_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id VARCHAR(100) NOT NULL,
    organization_id VARCHAR(100),
    region_code VARCHAR(10) NOT NULL REFERENCES regions(region_code),
    reason TEXT NOT NULL,
    overridden_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id)
);
