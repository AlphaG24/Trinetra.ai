-- Migration: Create product_bundles table, add additional_agents & additional_phone_numbers columns, and seed configuration variables

-- 1. Create product_bundles table
CREATE TABLE IF NOT EXISTS public.product_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    products JSONB NOT NULL DEFAULT '[]'::jsonb,
    individual_price_paisa INTEGER NOT NULL,
    bundle_price_paisa INTEGER NOT NULL,
    discount_percent INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    purchase_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add resource purchase tracking to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS additional_agents INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS additional_phone_numbers INTEGER DEFAULT 0;

-- 3. Enable RLS
ALTER TABLE public.product_bundles ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Enable read access for authenticated users on bundles"
    ON public.product_bundles
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all actions for super admins on bundles"
    ON public.product_bundles
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

-- 5. Seed system_config table with bulk discounts
INSERT INTO public.system_config (config_key, config_value, description) VALUES
    ('bulk_discount_2_agents_percent', '10', 'Discount percent when purchasing 2 agents concurrently'),
    ('bulk_discount_3_agents_percent', '15', 'Discount percent when purchasing 3 or more agents concurrently'),
    ('bulk_discount_2_numbers_percent', '5', 'Discount percent when purchasing 2 phone numbers concurrently'),
    ('bulk_discount_3plus_numbers_percent', '10', 'Discount percent when purchasing 3 or more phone numbers concurrently')
ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    description = EXCLUDED.description;

-- 6. Seed an initial default bundle
INSERT INTO public.product_bundles (name, description, products, individual_price_paisa, bundle_price_paisa, discount_percent, is_active) VALUES
    (
        'Dual Voice Agent Starter Pack', 
        'Get 2 Voice Agents and 2 Local Phone Numbers at a heavily discounted rate. Perfect for scaling support.', 
        '[{"type": "agent", "quantity": 2, "tier": "starter"}, {"type": "phone_number", "quantity": 2}]'::jsonb,
        1099600, -- 2 * 4999 (starter agent) + 2 * 499 (phone number) in paisa = 999800 + 99800 = 1099600
        879600,  -- Bundle price with ~20% discount (Rupees 8,796)
        20,
        true
    )
ON CONFLICT DO NOTHING;
