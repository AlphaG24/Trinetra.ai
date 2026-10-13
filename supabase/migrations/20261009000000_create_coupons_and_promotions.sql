-- ==============================================================================
-- Trinetra AI Migration: 20261009000000_create_coupons_and_promotions.sql
-- Enterprise Coupon Code & Promotions System
-- Features:
--   - Percentage or Flat Discount
--   - Max discount cap (INR)
--   - Minimum order requirement (INR)
--   - Public offer toggle (for "Check today's Offer" drawer)
--   - Usage limits (total & per-user)
--   - First-purchase only restriction
--   - Coupon redemptions audit log
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
    discount_value NUMERIC(10, 2) NOT NULL, -- percentage (e.g. 20) or flat paisa/rupees
    max_discount_inr NUMERIC(10, 2) DEFAULT NULL, -- Max cap in Rupees for percentage discounts
    min_order_inr NUMERIC(10, 2) DEFAULT 0, -- Minimum order amount in Rupees
    is_public_offer BOOLEAN NOT NULL DEFAULT FALSE, -- Show when client clicks "Check today's Offer"
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    first_purchase_only BOOLEAN NOT NULL DEFAULT FALSE,
    max_uses INTEGER DEFAULT NULL, -- Total redemptions allowed across platform
    used_count INTEGER NOT NULL DEFAULT 0,
    max_uses_per_user INTEGER DEFAULT 1,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    coupon_code VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id VARCHAR(100),
    payment_id VARCHAR(100),
    discount_amount_paisa BIGINT NOT NULL,
    cart_subtotal_paisa BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON public.coupons(is_active, is_public_offer);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON public.coupon_redemptions(user_id, coupon_code);

-- Default Starter Promotion Seed
INSERT INTO public.coupons (code, title, description, discount_type, discount_value, max_discount_inr, min_order_inr, is_public_offer, is_active, max_uses_per_user)
VALUES 
    ('WELCOME10', 'Welcome Offer', 'Get 10% instant discount on your first voice agent purchase.', 'percentage', 10.00, 1000.00, 99.00, true, true, 1),
    ('TRINETRA20', 'Festival Special', 'Get flat ₹500 off on subscription packs above ₹2,000.', 'flat', 500.00, 500.00, 2000.00, true, true, 1)
ON CONFLICT (code) DO NOTHING;
