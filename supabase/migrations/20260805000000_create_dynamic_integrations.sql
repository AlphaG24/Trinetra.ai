-- Create integration_types table
CREATE TABLE IF NOT EXISTS public.integration_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    category VARCHAR(50),
    setup_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    required_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    docs_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create agent_integrations table
CREATE TABLE IF NOT EXISTS public.agent_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    integration_type_id UUID NOT NULL REFERENCES public.integration_types(id) ON DELETE CASCADE,
    config JSONB DEFAULT '{}'::jsonb,
    is_connected BOOLEAN DEFAULT false,
    connected_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'disconnected',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(agent_id, integration_type_id)
);

-- Enable RLS
ALTER TABLE public.integration_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_integrations ENABLE ROW LEVEL SECURITY;

-- integration_types policies: Public read, Admin write
CREATE POLICY "Allow public read for integration_types"
    ON public.integration_types FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY "Allow admin write for integration_types"
    ON public.integration_types FOR ALL
    TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    );

-- agent_integrations policies: Org scope isolation
CREATE POLICY "Allow select for agent_integrations"
    ON public.agent_integrations FOR SELECT
    TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Allow insert for agent_integrations"
    ON public.agent_integrations FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Allow update for agent_integrations"
    ON public.agent_integrations FOR UPDATE
    TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Allow delete for agent_integrations"
    ON public.agent_integrations FOR DELETE
    TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

-- Seed dynamic integration types
INSERT INTO public.integration_types (name, slug, description, icon, category, setup_steps, required_fields) 
VALUES
('Telegram', 'telegram', 'Get instant lead alerts and call summaries via Telegram bot', 'Send', 'messaging', 
 '[{"title":"Create a Telegram Bot","description":"Open Telegram and search for @BotFather. Send /newbot and follow the instructions to create your bot. Copy the API token."},{"title":"Enter API Token","description":"Paste the bot token below. This allows Trinetra to send messages through your bot."},{"title":"Start the Bot","description":"Open your bot in Telegram and send /start. You will now receive lead alerts and call summaries instantly."}]'::jsonb,
 '["telegram_bot_token", "telegram_chat_id"]'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    setup_steps = EXCLUDED.setup_steps,
    required_fields = EXCLUDED.required_fields;

INSERT INTO public.integration_types (name, slug, description, icon, category, setup_steps, required_fields) 
VALUES
('WhatsApp', 'whatsapp', 'Send lead alerts and notifications via WhatsApp', 'MessageCircle', 'messaging',
 '[{"title":"Connect WhatsApp Business","description":"You need a WhatsApp Business API account. You can use Twilio or Meta''s official API."},{"title":"Enter API Credentials","description":"Provide your WhatsApp Business API credentials below."},{"title":"Verify Connection","description":"We''ll send a test message to confirm the connection."}]'::jsonb,
 '["whatsapp_phone_id","whatsapp_access_token"]'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    setup_steps = EXCLUDED.setup_steps,
    required_fields = EXCLUDED.required_fields;

INSERT INTO public.integration_types (name, slug, description, icon, category, setup_steps, required_fields) 
VALUES
('Google Calendar', 'google-calendar', 'Sync appointments and callbacks to Google Calendar', 'Calendar', 'calendar',
 '[{"title":"Enable Google Calendar API","description":"Go to Google Cloud Console, enable the Calendar API, and create OAuth 2.0 credentials."},{"title":"Connect Your Account","description":"Click the button below to sign in with Google and grant calendar access."},{"title":"Select Calendar","description":"Choose which calendar to sync appointments to."}]'::jsonb,
 '["google_client_id","google_client_secret","google_refresh_token"]'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    setup_steps = EXCLUDED.setup_steps,
    required_fields = EXCLUDED.required_fields;

INSERT INTO public.integration_types (name, slug, description, icon, category, setup_steps, required_fields) 
VALUES
('Zoho CRM', 'zoho-crm', 'Sync leads and contacts to Zoho CRM', 'Database', 'crm',
 '[{"title":"Get Zoho API Credentials","description":"Log in to Zoho Developer Console and create a Self Client application."},{"title":"Enter Credentials","description":"Provide your Client ID, Client Secret, and Refresh Token."},{"title":"Map Fields","description":"Choose how Trinetra lead fields map to your Zoho CRM modules."}]'::jsonb,
 '["zoho_client_id","zoho_client_secret","zoho_refresh_token"]'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    setup_steps = EXCLUDED.setup_steps,
    required_fields = EXCLUDED.required_fields;

INSERT INTO public.integration_types (name, slug, description, icon, category, setup_steps, required_fields) 
VALUES
('Salesforce', 'salesforce', 'Sync leads and contacts to Salesforce', 'Cloud', 'crm',
 '[{"title":"Create Connected App","description":"In Salesforce Setup, create a Connected App to get API credentials."},{"title":"Enter Credentials","description":"Provide your Consumer Key, Consumer Secret, and Security Token."}]'::jsonb,
 '["salesforce_client_id","salesforce_client_secret","salesforce_security_token","salesforce_instance_url"]'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    setup_steps = EXCLUDED.setup_steps,
    required_fields = EXCLUDED.required_fields;

INSERT INTO public.integration_types (name, slug, description, icon, category, setup_steps, required_fields) 
VALUES
('SMTP Email', 'smtp-email', 'Send email notifications for new leads and call summaries', 'Mail', 'email',
 '[{"title":"Configure SMTP Server","description":"Enter your SMTP server details. Works with Gmail, Outlook, SendGrid, or any SMTP provider."},{"title":"Enter Credentials","description":"Provide SMTP host, port, username, and password."},{"title":"Set Notification Email","description":"Where should we send the notifications?"}]'::jsonb,
 '["smtp_host","smtp_port","smtp_username","smtp_password","notification_email"]'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    setup_steps = EXCLUDED.setup_steps,
    required_fields = EXCLUDED.required_fields;

INSERT INTO public.integration_types (name, slug, description, icon, category, setup_steps, required_fields) 
VALUES
('Webhook', 'webhook', 'Send real-time call data to any webhook URL', 'Link', 'other',
 '[{"title":"Configure Webhook URL","description":"Enter the URL where you want to receive call data."},{"title":"Select Events","description":"Choose which events to send: new lead, call completed, appointment booked."},{"title":"Test Webhook","description":"We''ll send a test payload to verify the connection."}]'::jsonb,
 '["webhook_url","webhook_secret"]'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    setup_steps = EXCLUDED.setup_steps,
    required_fields = EXCLUDED.required_fields;
