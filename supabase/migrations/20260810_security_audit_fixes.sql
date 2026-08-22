-- Row Level Security (RLS) Audit & Security Hardening Fixes
-- Target: Hardening all 27 requested platform tables with robust RLS and organization isolation policies.

-- Helper functions to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT organization_id FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
DECLARE
    tbl RECORD;
BEGIN
    -- 1. Enable RLS on all requested tables if not already enabled
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename IN (
            'organizations', 'profiles', 'agents', 'voice_calls', 'leads', 'campaigns', 'campaign_contacts',
            'phone_numbers', 'agent_phone_numbers', 'callbacks', 'customer_contacts',
            'integrations', 'agent_integrations', 'integration_types', 'global_integrations',
            'product_bundles', 'dnd_registry', 'prompt_templates',
            'invoices', 'notifications', 'queued_notifications',
            'consent_records', 'audit_logs', 'activity_log',
            'system_config', 'platform_services', 'support_tickets', 'tickets'
          )
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl.tablename);
    END LOOP;
END $$;

-- 2. Drop and recreate policies to ensure zero leaks and strict organization/user isolation

DO $$
BEGIN
    -- ==========================================
    -- ORGANIZATIONS
    -- ==========================================
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organizations') THEN
        DROP POLICY IF EXISTS "Users can read own organization" ON public.organizations;
        CREATE POLICY "Users can read own organization" ON public.organizations
            FOR SELECT TO authenticated
            USING (id = public.get_user_org_id());

        DROP POLICY IF EXISTS "Admins manage organizations" ON public.organizations;
        CREATE POLICY "Admins manage organizations" ON public.organizations
            FOR ALL TO authenticated
            USING (public.is_admin());
    END IF;

    -- ==========================================
    -- PROFILES
    -- ==========================================
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
        CREATE POLICY "Users view own profile" ON public.profiles
            FOR SELECT TO authenticated USING (id = auth.uid());

        DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
        CREATE POLICY "Users update own profile" ON public.profiles
            FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

        DROP POLICY IF EXISTS "Admins manage profiles" ON public.profiles;
        CREATE POLICY "Admins manage profiles" ON public.profiles
            FOR ALL TO authenticated
            USING (public.is_admin());
    END IF;

    -- ==========================================
    -- AGENTS
    -- ==========================================
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agents') THEN
        DROP POLICY IF EXISTS "Users manage own agents" ON public.agents;
        CREATE POLICY "Users manage own agents" ON public.agents
            FOR ALL TO authenticated
            USING (user_id = auth.uid() OR organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
            WITH CHECK (user_id = auth.uid() OR organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

        DROP POLICY IF EXISTS "Admins manage agents" ON public.agents;
        CREATE POLICY "Admins manage agents" ON public.agents
            FOR ALL TO authenticated
            USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
    END IF;

    -- ==========================================
    -- VOICE_CALLS
    -- ==========================================
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'voice_calls') THEN
        DROP POLICY IF EXISTS "Users access own voice calls" ON public.voice_calls;
        CREATE POLICY "Users access own voice calls" ON public.voice_calls
            FOR ALL TO authenticated
            USING (user_id = auth.uid() OR organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
            WITH CHECK (user_id = auth.uid() OR organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

        DROP POLICY IF EXISTS "Admins manage voice calls" ON public.voice_calls;
        CREATE POLICY "Admins manage voice calls" ON public.voice_calls
            FOR ALL TO authenticated
            USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
    END IF;

    -- ==========================================
    -- LEADS
    -- ==========================================
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leads') THEN
        DROP POLICY IF EXISTS "Users manage own leads" ON public.leads;
        CREATE POLICY "Users manage own leads" ON public.leads
            FOR ALL TO authenticated
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());

        DROP POLICY IF EXISTS "Anyone can insert leads from widgets" ON public.leads;
        CREATE POLICY "Anyone can insert leads from widgets" ON public.leads
            FOR INSERT WITH CHECK (true); -- Public forms are allowed

        DROP POLICY IF EXISTS "Admins manage leads" ON public.leads;
        CREATE POLICY "Admins manage leads" ON public.leads
            FOR ALL TO authenticated
            USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
    END IF;

    -- ==========================================
    -- CAMPAIGNS
    -- ==========================================
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'campaigns') THEN
        DROP POLICY IF EXISTS "Users manage campaigns" ON public.campaigns;
        CREATE POLICY "Users manage campaigns" ON public.campaigns
            FOR ALL TO authenticated
            USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
            WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
    END IF;

    -- ==========================================
    -- CAMPAIGN_CONTACTS
    -- ==========================================
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'campaign_contacts') THEN
        DROP POLICY IF EXISTS "Users manage campaign contacts" ON public.campaign_contacts;
        CREATE POLICY "Users manage campaign contacts" ON public.campaign_contacts
            FOR ALL TO authenticated
            USING (campaign_id IN (SELECT id FROM public.campaigns WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())))
            WITH CHECK (campaign_id IN (SELECT id FROM public.campaigns WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));
    END IF;

    -- ==========================================
    -- PHONE_NUMBERS
    -- ==========================================
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'phone_numbers') THEN
        DROP POLICY IF EXISTS "Users view own phone numbers" ON public.phone_numbers;
        CREATE POLICY "Users view own phone numbers" ON public.phone_numbers
            FOR SELECT TO authenticated
            USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

        DROP POLICY IF EXISTS "Admins manage phone numbers" ON public.phone_numbers;
        CREATE POLICY "Admins manage phone numbers" ON public.phone_numbers
            FOR ALL TO authenticated
            USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
    END IF;

    -- ==========================================
    -- AGENT_PHONE_NUMBERS
    -- ==========================================
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agent_phone_numbers') THEN
        DROP POLICY IF EXISTS "Users manage agent phone numbers" ON public.agent_phone_numbers;
        CREATE POLICY "Users manage agent phone numbers" ON public.agent_phone_numbers
            FOR ALL TO authenticated
            USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid() OR organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));
    END IF;

    -- ==========================================
    -- CALLBACKS
    -- ==========================================
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'callbacks') THEN
        DROP POLICY IF EXISTS "Users manage callbacks" ON public.callbacks;
        CREATE POLICY "Users manage callbacks" ON public.callbacks
            FOR ALL TO authenticated
            USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
            WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
    END IF;

    -- ==========================================
    -- CUSTOMER_CONTACTS
    -- ==========================================
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customer_contacts') THEN
        DROP POLICY IF EXISTS "Users manage customer contacts" ON public.customer_contacts;
        CREATE POLICY "Users manage customer contacts" ON public.customer_contacts
            FOR ALL TO authenticated
            USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
            WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
    END IF;

    -- ==========================================
    -- INTEGRATIONS
    -- ==========================================
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'integrations') THEN
        DROP POLICY IF EXISTS "Users manage integrations" ON public.integrations;
        CREATE POLICY "Users manage integrations" ON public.integrations
            FOR ALL TO authenticated
            USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
            WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
    END IF;

    -- ==========================================
    -- AGENT_INTEGRATIONS
    -- ==========================================
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agent_integrations') THEN
        DROP POLICY IF EXISTS "Users manage agent integrations" ON public.agent_integrations;
        CREATE POLICY "Users manage agent integrations" ON public.agent_integrations
            FOR ALL TO authenticated
            USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid() OR organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));
    END IF;

    -- ==========================================
    -- INTEGRATION_TYPES / GLOBAL_INTEGRATIONS
    -- ==========================================
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'integration_types') THEN
        DROP POLICY IF EXISTS "Anyone can view integration types" ON public.integration_types;
        CREATE POLICY "Anyone can view integration types" ON public.integration_types
            FOR SELECT USING (true);

        DROP POLICY IF EXISTS "Admins manage integration types" ON public.integration_types;
        CREATE POLICY "Admins manage integration types" ON public.integration_types
            FOR ALL TO authenticated
            USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'global_integrations') THEN
        DROP POLICY IF EXISTS "Admins manage global integrations" ON public.global_integrations;
        CREATE POLICY "Admins manage global integrations" ON public.global_integrations
            FOR ALL TO authenticated
            USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
    END IF;

    -- ==========================================
    -- PRODUCT_BUNDLES
    -- ==========================================
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_bundles') THEN
        DROP POLICY IF EXISTS "Anyone can view bundles" ON public.product_bundles;
        CREATE POLICY "Anyone can view bundles" ON public.product_bundles
            FOR SELECT USING (true);

        DROP POLICY IF EXISTS "Admins manage bundles" ON public.product_bundles;
        CREATE POLICY "Admins manage bundles" ON public.product_bundles
            FOR ALL TO authenticated
            USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
    END IF;

    -- ==========================================
    -- DND_REGISTRY
    -- ==========================================
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dnd_registry') THEN
        DROP POLICY IF EXISTS "Anyone view DND registry" ON public.dnd_registry;
        CREATE POLICY "Anyone view DND registry" ON public.dnd_registry
            FOR SELECT USING (true);

        DROP POLICY IF EXISTS "Admins manage DND registry" ON public.dnd_registry;
        CREATE POLICY "Admins manage DND registry" ON public.dnd_registry
            FOR ALL TO authenticated
            USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
    END IF;

    -- ==========================================
    -- PROMPT_TEMPLATES
    -- ==========================================
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'prompt_templates') THEN
        DROP POLICY IF EXISTS "Anyone view prompt templates" ON public.prompt_templates;
        CREATE POLICY "Anyone view prompt templates" ON public.prompt_templates
            FOR SELECT USING (true);

        DROP POLICY IF EXISTS "Admins manage prompt templates" ON public.prompt_templates;
        CREATE POLICY "Admins manage prompt templates" ON public.prompt_templates
            FOR ALL TO authenticated
            USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
    END IF;

    -- ==========================================
    -- INVOICES
    -- ==========================================
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN
        DROP POLICY IF EXISTS "Users view own invoices" ON public.invoices;
        CREATE POLICY "Users view own invoices" ON public.invoices
            FOR SELECT TO authenticated
            USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

        DROP POLICY IF EXISTS "Admins manage invoices" ON public.invoices;
        CREATE POLICY "Admins manage invoices" ON public.invoices
            FOR ALL TO authenticated
            USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
    END IF;

    -- ==========================================
    -- NOTIFICATIONS / QUEUED_NOTIFICATIONS
    -- ==========================================
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        DROP POLICY IF EXISTS "Users manage own notifications" ON public.notifications;
        CREATE POLICY "Users manage own notifications" ON public.notifications
            FOR ALL TO authenticated USING (user_id = auth.uid());
    END IF;

    -- ==========================================
    -- CONSENT_RECORDS
    -- ==========================================
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'consent_records') THEN
        DROP POLICY IF EXISTS "Users view own consent records" ON public.consent_records;
        CREATE POLICY "Users view own consent records" ON public.consent_records
            FOR SELECT TO authenticated USING (user_id = auth.uid());

        DROP POLICY IF EXISTS "Anyone can insert consent records" ON public.consent_records;
        CREATE POLICY "Anyone can insert consent records" ON public.consent_records
            FOR INSERT WITH CHECK (true);

        DROP POLICY IF EXISTS "Admins view all consent records" ON public.consent_records;
        CREATE POLICY "Admins view all consent records" ON public.consent_records
            FOR SELECT TO authenticated
            USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
    END IF;

    -- ==========================================
    -- AUDIT_LOGS
    -- ==========================================
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
        DROP POLICY IF EXISTS "Admins view all audit logs" ON public.audit_logs;
        CREATE POLICY "Admins view all audit logs" ON public.audit_logs
            FOR SELECT TO authenticated
            USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

        DROP POLICY IF EXISTS "Anyone can insert audit logs" ON public.audit_logs;
        CREATE POLICY "Anyone can insert audit logs" ON public.audit_logs
            FOR INSERT WITH CHECK (true);
    END IF;

    -- ==========================================
    -- ACTIVITY_LOG
    -- ==========================================
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_log') THEN
        DROP POLICY IF EXISTS "Users manage own activity log" ON public.activity_log;
        CREATE POLICY "Users manage own activity log" ON public.activity_log
            FOR ALL TO authenticated USING (user_id = auth.uid());

        DROP POLICY IF EXISTS "Anyone can insert activity log" ON public.activity_log;
        CREATE POLICY "Anyone can insert activity log" ON public.activity_log
            FOR INSERT WITH CHECK (true);
    END IF;

    -- ==========================================
    -- SYSTEM_CONFIG / PLATFORM_SERVICES
    -- ==========================================
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_config') THEN
        DROP POLICY IF EXISTS "Anyone can view system configs" ON public.system_config;
        CREATE POLICY "Anyone can view system configs" ON public.system_config
            FOR SELECT USING (true);

        DROP POLICY IF EXISTS "Admins manage system configs" ON public.system_config;
        CREATE POLICY "Admins manage system configs" ON public.system_config
            FOR ALL TO authenticated
            USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'platform_services') THEN
        DROP POLICY IF EXISTS "Anyone view platform services" ON public.platform_services;
        CREATE POLICY "Anyone view platform services" ON public.platform_services
            FOR SELECT USING (true);

        DROP POLICY IF EXISTS "Admins manage platform services" ON public.platform_services;
        CREATE POLICY "Admins manage platform services" ON public.platform_services
            FOR ALL TO authenticated
            USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
    END IF;

    -- ==========================================
    -- SUPPORT_TICKETS / TICKETS
    -- ==========================================
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'support_tickets') THEN
        DROP POLICY IF EXISTS "Users manage own support tickets" ON public.support_tickets;
        CREATE POLICY "Users manage own support tickets" ON public.support_tickets
            FOR ALL TO authenticated
            USING (submitted_by = auth.uid() OR organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

        DROP POLICY IF EXISTS "Admins manage support tickets" ON public.support_tickets;
        CREATE POLICY "Admins manage support tickets" ON public.support_tickets
            FOR ALL TO authenticated
            USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tickets') THEN
        DROP POLICY IF EXISTS "Users manage own tickets" ON public.tickets;
        CREATE POLICY "Users manage own tickets" ON public.tickets
            FOR ALL TO authenticated USING (user_id = auth.uid());
    END IF;

END $$;

-- 3. Optimization Indexes for Fast Aggregation and Filtering
CREATE INDEX IF NOT EXISTS idx_support_tickets_submitted_by ON public.support_tickets(submitted_by) WHERE submitted_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_org_id ON public.support_tickets(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_callbacks_org_id ON public.callbacks(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_org_id ON public.campaigns(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_campaign_id ON public.campaign_contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_integrations_org_id ON public.integrations(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_integrations_agent_id ON public.agent_integrations(agent_id);

