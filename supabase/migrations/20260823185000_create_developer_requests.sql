-- Migration: 20260823185000_create_developer_requests.sql
-- Description: Create developer_requests table to manage 2-way approval operations.

CREATE TABLE IF NOT EXISTS public.developer_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    developer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('set_homepage_agent', 'bypass_limits', 'custom_voice_activation')),
    request_data JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.developer_requests ENABLE ROW LEVEL SECURITY;

-- 1. Developers can view their own requests
CREATE POLICY "Developers view own requests" ON public.developer_requests
    FOR SELECT TO authenticated
    USING (developer_id = auth.uid());

-- 2. Developers can submit new requests
CREATE POLICY "Developers submit requests" ON public.developer_requests
    FOR INSERT TO authenticated
    WITH CHECK (developer_id = auth.uid());

-- 3. Admins/Super Admins can view all requests
CREATE POLICY "Admins view all requests" ON public.developer_requests
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ));

-- 4. Admins/Super Admins can resolve requests
CREATE POLICY "Admins resolve requests" ON public.developer_requests
    FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ));
