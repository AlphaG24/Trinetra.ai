-- Create dnd_registry table
CREATE TABLE IF NOT EXISTS public.dnd_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    registered_at TIMESTAMPTZ DEFAULT now(),
    source VARCHAR(50) DEFAULT 'manual',
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Unique index on phone_number for fast lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_dnd_registry_phone_number ON public.dnd_registry(phone_number);

-- Enable RLS
ALTER TABLE public.dnd_registry ENABLE ROW LEVEL SECURITY;

-- Service role bypass
CREATE POLICY "Service role bypass dnd_registry" 
    ON public.dnd_registry FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- Super admin access
CREATE POLICY "Super admins have full access to dnd_registry"
    ON public.dnd_registry FOR ALL
    TO authenticated
    USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'super_admin'))
    WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'super_admin'));

-- Admin access
CREATE POLICY "Admins have full access to dnd_registry"
    ON public.dnd_registry FOR ALL
    TO authenticated
    USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'))
    WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
