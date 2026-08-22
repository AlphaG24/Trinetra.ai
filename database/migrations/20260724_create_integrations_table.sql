-- UP MIGRATION
-- Create integrations table to store Telegram, WhatsApp, and CRM tokens/credentials
CREATE TABLE IF NOT EXISTS public.integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
    telegram_bot_token TEXT,
    telegram_chat_id TEXT,
    whatsapp_phone_number_id TEXT,
    whatsapp_access_token TEXT,
    crm_webhook_url TEXT,
    crm_sync_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (agent_id) -- One set of integrations per agent
);

-- Enable Row-Level Security
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- Create Indexes for optimization
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON public.integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_agent_id ON public.integrations(agent_id);

-- RLS Policies
CREATE POLICY "Users can manage their own integrations" 
ON public.integrations 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- DOWN MIGRATION
-- DROP TABLE IF EXISTS public.integrations;
