import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// --- AGENT TYPE → PROMPT TEMPLATE MAPPING ---
// Maps agent_type slug OR marketplace_metadata.template_file → prompt file in backend/prompts/
const AGENT_TYPE_TEMPLATES: Record<string, string> = {
    // New typed templates
    "sales_agent":           "sales_agent.txt",
    "support_agent":         "support_agent.txt",
    "appointment_agent":     "appointment_agent.txt",
    "lead_qualifier":        "lead_qualifier.txt",
    "multi_agent":           "multi_agent.txt",
    // Legacy slugs → default to sales_agent
    "anika-voice":           "sales_agent.txt",
    "voice":                 "sales_agent.txt",
    // Direct file name pass-through (from marketplace_metadata.template_file)
    "sales_agent.txt":       "sales_agent.txt",
    "support_agent.txt":     "support_agent.txt",
    "appointment_agent.txt": "appointment_agent.txt",
    "lead_qualifier.txt":    "lead_qualifier.txt",
    "multi_agent.txt":       "multi_agent.txt",
};

// Per-agent-type default Sarvam voices
const AGENT_TYPE_VOICES: Record<string, string> = {
    "sales_agent":       "shubh",
    "lead_qualifier":    "shubh",
    "multi_agent":       "shubh",
    "anika-voice":       "shubh",
    "support_agent":     "anushka",
    "appointment_agent": "anushka",
};

// Per-agent-type default greetings (natural and professional human greetings)
const AGENT_TYPE_GREETINGS: Record<string, (name: string, company: string) => string> = {
    "sales_agent":       (n, c) => `Hello, main ${n} bol raha hoon ${c} se. Kaise hain aap?`,
    "support_agent":     (n, c) => `Hello, main ${n} bol rahi hoon ${c} support team se. Kaise help kar sakti hoon?`,
    "appointment_agent": (n, c) => `Hello, main ${n} bol rahi hoon ${c} se. Kaise help kar sakti hoon?`,
    "lead_qualifier":    (n, c) => `Hello, main ${n} bol raha hoon. Aapne hamari website pe enquiry ki thi. Kaise help kar sakta hoon?`,
    "multi_agent":       (n, c) => `Hello, main ${n} bol raha hoon ${c} se. Kaise help kar sakta hoon?`,
    "anika-voice":       (n, c) => `Hello, main ${n} bol raha hoon ${c} se. Kaise hain aap?`,
};

/**
 * Resolves the template file name from a slug or file name key.
 * Returns null if no mapping found.
 */
function resolveTemplateFileName(key: string): string | null {
    return AGENT_TYPE_TEMPLATES[key] ?? null;
}

/**
 * Loads a prompt template file from backend/prompts/ and substitutes {{agent_name}} / {{company_name}}.
 * Returns null if the file is not found on any candidate path.
 */
function loadPromptTemplate(
    templateKey: string,
    agentName: string,
    companyName: string
): string | null {
    const fileName = resolveTemplateFileName(templateKey);
    if (!fileName) return null;

    // Candidate paths — tries dev monorepo first, then root, then container
    const possiblePaths = [
        path.resolve(process.cwd(), "../backend/prompts", fileName),
        path.resolve(process.cwd(), "backend/prompts", fileName),
        path.resolve("/app/backend/prompts", fileName),
    ];

    let rawTemplate: string | null = null;
    for (const filePath of possiblePaths) {
        try {
            if (fs.existsSync(filePath)) {
                rawTemplate = fs.readFileSync(filePath, "utf-8");
                console.log(`[Trinetra] Loaded prompt template: ${fileName} from ${filePath}`);
                break;
            }
        } catch (_e) {
            // try next candidate
        }
    }

    if (!rawTemplate) {
        console.warn(`[Trinetra] Prompt template not found for key '${templateKey}' (file: ${fileName})`);
        return null;
    }

    return rawTemplate
        .replace(/\{\{agent_name\}\}/g, agentName)
        .replace(/\{\{company_name\}\}/g, companyName);
}

// --- BLUEPRINTS DEFINITION ---
const BLUEPRINTS: Record<string, any> = {
    "Receptionist": {
        firstMessage: "Namaste. I am {agentName}, the receptionist. How can I help you book an appointment?",
        systemPrompt: "You are a professional receptionist for {userName}. Your goal is to capture the user's Name, Phone Number, and Intent. Once captured, use the 'save_lead' tool immediately.",
        functions: [
            {
                name: "save_lead",
                description: "Save a potential client's details.",
                parameters: {
                    type: "object",
                    properties: {
                        client_name: { type: "string", description: "The name of the client." },
                        phone: { type: "string", description: "The client's phone number." },
                        notes: { type: "string", description: "Summary of client's intent or request." }
                    },
                    required: ["client_name", "phone"]
                }
            }
        ]
    },
    "Sales Lead": {
        firstMessage: "Hello! This is {agentName} calling from {userName}'s team. We noticed you were interested in our premium services.",
        systemPrompt: "You are a top-tier sales executive for {userName}. Your goal is to qualify the lead, understand their budget and timeline, and schedule a closing call. Use 'save_lead' to record interest.",
        functions: [
            {
                name: "save_lead",
                description: "Save a qualified lead's details.",
                parameters: {
                    type: "object",
                    properties: {
                        client_name: { type: "string" },
                        phone: { type: "string" },
                        notes: { type: "string" },
                        budget: { type: "string" }
                    },
                    required: ["client_name", "phone"]
                }
            }
        ]
    },
    "Technical Support": {
        firstMessage: "Hi there, I'm {agentName} from Technical Support. What issue are you facing today?",
        systemPrompt: "You are a helpful technical support agent for {userName}. Diagnose the user's problem. If you cannot solve it, collect their contact info for a human callback using 'save_lead'.",
        functions: [
            {
                name: "save_lead",
                description: "Escalate ticket to human support.",
                parameters: {
                    type: "object",
                    properties: {
                        client_name: { type: "string" },
                        phone: { type: "string" },
                        issue_summary: { type: "string" }
                    },
                    required: ["client_name", "phone"]
                }
            }
        ]
    },
    "Custom": {
        firstMessage: "Hello, I am {agentName}. How may I assist you?",
        systemPrompt: "You are a helpful AI assistant for {userName}.",
        functions: []
    }
};

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // 1. Authenticate User
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: "Unauthorized. Please authenticate." },
                { status: 401 }
            );
        }

        // Initialize Admin Client (for bypassing RLS on organization & profile creation)
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseAdmin = serviceRoleKey
            ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
            : supabase;

        // Parse request body early
        const body = await request.json();
        const { name, role, voice, directive, company_name, industry, agent_type, is_demo, is_trial } = body;
        const requestedAgentType = agent_type || 'voice';

        // Fetch platform service to resolve agent_type and template metadata.
        // NOTE: platform_services.id is NOT stored in agents.product_id because
        // agents.product_id has a FK referencing the `products` table, not `platform_services`.
        // We track it separately as platformServiceId for deduplication queries only.
        let platformServiceId: string | null = null;
        let resolvedAgentType = 'voice';

        const { data: platformService } = await supabaseAdmin
            .from('platform_services')
            .select('id, name, type, marketplace_metadata')
            .eq('slug', requestedAgentType)
            .maybeSingle();

        // The template_file from marketplace_metadata is the highest-priority template key
        const metadataTemplateFile: string | null =
            platformService?.marketplace_metadata?.template_file ?? null;

        if (platformService) {
            platformServiceId = platformService.id;  // For dedup queries only — NOT inserted into product_id
            resolvedAgentType = platformService.type;
        } else {
            if (['voice', 'chat', 'whatsapp'].includes(requestedAgentType)) {
                resolvedAgentType = requestedAgentType;
            }
        }

        // ── DEDUPLICATION: Does this user already have THIS specific agent? ─────────────
        // Rules:
        //   1. Match by product_id  (exact tool from DB)          ← most specific
        //   2. Match by name prefix [slug]  (works without migration) ← per-tool
        //   3. Generic 'voice' fallback only for bare onboarding   ← legacy
        let existingAgent = null;

        // (1) By platform_service_id stored in agents.product_id (legacy agents created before this fix)
        //     or by matching agents that have a product_id equal to the platform service's id.
        //     This handles backward-compat for any agents already in DB with product_id set.
        if (platformServiceId) {
            const { data: prodAgent } = await supabaseAdmin
                .from('agents')
                .select('id, name, agent_type, product_id, system_prompt, greeting_message, voice_id')
                .eq('user_id', user.id)
                .eq('product_id', platformServiceId)
                .limit(1)
                .maybeSingle();
            if (prodAgent) existingAgent = prodAgent;
        }

        // (2) By name prefix [slug] or clean name
        if (!existingAgent && requestedAgentType !== 'voice') {
            const cleanTarget = (name || platformService?.name || '').replace(/^\[[^\]]+\]\s*/, '').trim();
            const orFilter = cleanTarget 
                ? `name.ilike.[${requestedAgentType}]%,name.ilike.%${cleanTarget}%` 
                : `name.ilike.[${requestedAgentType}]%`;
            const { data: namedAgent } = await supabaseAdmin
                .from('agents')
                .select('id, name, agent_type, product_id, system_prompt, greeting_message, voice_id')
                .eq('user_id', user.id)
                .or(orFilter)
                .limit(1)
                .maybeSingle();
            if (namedAgent) existingAgent = namedAgent;
        }

        // (3) Generic 'voice' fallback — legacy onboarding flow only
        if (!existingAgent && requestedAgentType === 'voice') {
            const { data: genericAgent } = await supabaseAdmin
                .from('agents')
                .select('id, name, agent_type, product_id, system_prompt, greeting_message, voice_id')
                .eq('user_id', user.id)
                .eq('agent_type', 'voice')
                .not('name', 'ilike', '[%]%')  // exclude slug-tagged agents
                .limit(1)
                .maybeSingle();
            if (genericAgent) existingAgent = genericAgent;
        }

        if (existingAgent) {
            console.log(`[Trinetra] Reusing existing agent ${existingAgent.id} for slug '${requestedAgentType}'`);
            return NextResponse.json({
                success: true,
                agent: { id: existingAgent.id },
                dbAgent: existingAgent,
                reused: true,
                message: "Existing agent reused."
            });
        }

        // 2. Fetch Profile (including plan_tier, demo_usage and business_description)
        let { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, email, company_name, business_type, onboarding_complete, organization_id, plan_tier, demo_usage, business_description, additional_agents, role')
            .eq('id', user.id)
            .single();
 
        if (profileError || !profile) {
            // Auto-heal: Create default profile if missing
            console.log(`[Trinetra] Profile missing for ${user.id}. Creating default.`);
 
            const { data: newProfile, error: createError } = await supabaseAdmin
                .from('profiles')
                .insert({
                    id: user.id,
                    email: user.email,
                    full_name: user.user_metadata?.full_name || '',
                    onboarding_complete: false,
                })
                .select('id, full_name, email, company_name, business_type, onboarding_complete, organization_id, plan_tier, demo_usage, business_description, additional_agents, role')
                .single();
 
            if (createError || !newProfile) {
                console.error("[Trinetra] Failed to create default profile:", createError);
                return NextResponse.json(
                    { error: "Profile creation failed. Contact support.", debug: createError?.message },
                    { status: 500 }
                );
            }
 
            profile = newProfile;
        }

        // Check for 1-time free demo per agent type rule
        if (is_demo) {
            const currentDemoUsage = (profile as any)?.demo_usage || {};
            if (currentDemoUsage[requestedAgentType]) {
                return NextResponse.json(
                    { error: "1 demo per agent per account is allowed." },
                    { status: 403 }
                );
            }
        }

        // --- 2.5 Auto-Create Organization if missing ---
        let organizationId = profile?.organization_id;

        if (!organizationId) {
            console.log(`[Trinetra] No organization_id found for user ${user.id}. Creating organization first.`);
            
            const orgName = company_name || `${profile?.full_name || user.email?.split('@')[0] || 'My'}'s Company`;
            // Simple slug generation: lower case, replace non-alphanumeric with hyphens
            const orgSlug = orgName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);

            const { data: newOrg, error: orgError } = await supabaseAdmin
                .from('organizations')
                .insert({
                    name: orgName,
                    slug: orgSlug,
                    primary_email: user.email,
                })
                .select('id')
                .single();

            if (orgError || !newOrg) {
                console.error("[Trinetra] Failed to create organization:", orgError);
                return NextResponse.json(
                    { error: "Failed to create organization.", debug: orgError?.message },
                    { status: 500 }
                );
            }

            organizationId = newOrg.id;
            console.log(`[Trinetra] Organization created successfully: ${organizationId} with slug: ${orgSlug}`);

            // Update profile with this organization_id using admin client (bypasses RLS)
            const { error: profileOrgUpdateError } = await supabaseAdmin
                .from('profiles')
                .update({ organization_id: organizationId })
                .eq('id', user.id);

            if (profileOrgUpdateError) {
                console.error("[Trinetra] Failed to update profile with organization_id:", profileOrgUpdateError);
                return NextResponse.json(
                    { error: "Failed to link organization to profile.", debug: profileOrgUpdateError?.message },
                    { status: 500 }
                );
            }
        }

        // 3. Count existing agents for this user (excluding deleted ones)
        const { count: agentCount, error: countError } = await supabaseAdmin
            .from('agents')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .neq('status', 'deleted');

        if (countError) {
            console.error("[Trinetra] Agent count query failed:", countError);
        }

        const currentAgentCount = agentCount ?? 0;
        const userPlanTier = (profile as any)?.plan_tier || body.plan_tier || 'free';
        const rawTier = userPlanTier.toLowerCase();
        const normalizedTier = rawTier === 'free_demo' ? 'free' : (rawTier === 'pro' ? 'professional' : rawTier);
        
        let limit = 1; // Default Free: 1 agent
        if (normalizedTier === 'trial') {
            limit = 3; // Trial: 3 agents
        } else if (normalizedTier === 'starter') {
            limit = 5; // Starter: 5 agents
        } else if (normalizedTier === 'professional') {
            limit = 20; // Professional: 20 agents
        }
        
        // Add purchased slots
        if (profile?.additional_agents) {
            limit += profile.additional_agents;
        }

        // Try to fetch custom config limit from system_config if available
        try {
            const configKey = `max_agents_${normalizedTier}`;
            const { data: configLimit } = await supabaseAdmin
                .from('system_config')
                .select('config_value')
                .eq('config_key', configKey)
                .maybeSingle();
            if (configLimit?.config_value) {
                limit = parseInt(configLimit.config_value, 10);
            }
        } catch (err) {
            console.error("[Trinetra] Error fetching dynamic agent limit:", err);
        }

        // Bypass limit checks entirely if user has developer_tester role
        if (profile?.role !== 'developer_tester' && currentAgentCount >= limit) {
            return NextResponse.json(
                { error: "You've reached the maximum number of agents for your plan. Please upgrade to add more." },
                { status: 403 }
            );
        }


        // --- IF CHECKS PASS: PROCEED WITH CREATION ---

        // Blueprint Logic
        let blueprints = BLUEPRINTS;
        try {
            const { data: configData } = await supabaseAdmin
                .from('system_config')
                .select('config_value')
                .eq('config_key', 'agent_blueprints')
                .single();

            if (configData?.config_value) {
                blueprints = JSON.parse(configData.config_value);
            }
        } catch (e) {
            console.error("[Trinetra] Error fetching dynamic blueprints:", e);
        }

        const blueprint = blueprints[role] || blueprints["Custom"] || BLUEPRINTS["Custom"];

        // Use clean agent name without bracketed slug prefix
        const rawAgentName = name || (platformService?.name || "Neural Unit");
        const agentName = rawAgentName.replace(/^\[[^\]]+\]\s*/, '').trim();

        const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || "Trinetra User";
        const companyDisplayName = company_name || profile?.company_name || userName;

        // --- TEMPLATE-BASED PROMPT LOADING ---
        // Priority order:
        //   1. User-provided directive (manual override)
        //   2. marketplace_metadata.template_file  (agent-type specific, from DB)
        //   3. requestedAgentType slug  (direct slug → template map)
        //   4. Blueprint fallback  (legacy)
        let systemPrompt = directive;
        let firstMessage: string;

        if (!systemPrompt || systemPrompt.trim() === "") {
            // Try marketplace_metadata.template_file first (most authoritative for typed agents)
            const primaryKey = metadataTemplateFile || requestedAgentType;
            const templatePrompt = loadPromptTemplate(primaryKey, agentName, companyDisplayName);

            if (templatePrompt) {
                systemPrompt = templatePrompt;
                console.log(`[Trinetra] Applied template '${primaryKey}' for agent '${agentName}'`);
            } else {
                // Fallback: blueprint
                systemPrompt = blueprint.systemPrompt
                    .replace("{userName}", userName)
                    .replace("{agentName}", agentName);
                console.log(`[Trinetra] Used blueprint for agent '${agentName}' (no template match for '${primaryKey}')`);
            }
        }

        // Inject business description / context if available (Fix 5: use fallback defaults and try/catch context block)
        try {
            const businessDescription = profile?.business_description || 'General business';
            const contextBlock = `=== BUSINESS CONTEXT ===
Business Description: ${businessDescription}
Company Name: ${companyDisplayName}
Industry: ${profile?.business_type || 'General'}
========================\n\n`;
            systemPrompt = contextBlock + systemPrompt;
            console.log(`[Trinetra] Successfully injected business context with description: "${businessDescription}"`);
        } catch (contextError: any) {
            console.error(`[Trinetra] Failed to inject business context:`, contextError);
        }

        // --- GREETING MESSAGE ---
        // Strip suffixes like " - Demo" or " - Trial" from greeting name
        const cleanGreetingName = rawAgentName
            .replace(/\s*-\s*Demo\s*$/i, '')
            .replace(/\s*-\s*Trial\s*$/i, '');

        const industryTemplates: Record<string, { systemPrompt: string, greeting: string }> = {
            "real_estate": {
                systemPrompt: "You are a professional real estate sales assistant. Qualify leads by politely asking: (1) Budget (in Lakhs/Crores), (2) Property type preference (Apartment, Penthouse, or Villa), (3) Preferred location. Keep responses concise and use the 'save_lead' tool immediately once details are collected.",
                greeting: "Hello, main {agentName} bol raha hoon {companyName} Real Estate se. Kya aap properties buy ya sell karne ke baare mein soch rahe hain?"
            },
            "healthcare": {
                systemPrompt: "You are a warm healthcare clinic assistant. Assist patients in scheduling appointments, checking doctor availability, and summarizing primary symptoms. Keep medical details strictly private, remain highly empathetic, and use the 'save_lead' tool to log appointment slots.",
                greeting: "Hello, main {agentName} bol rahi hoon {companyName} Clinic se. Kya main aapke appointment ya health query ke liye help kar sakti hoon?"
            },
            "education": {
                systemPrompt: "You are an academic advisor at the admissions desk. Qualify student inquiries by collecting: (1) Preferred course/field of study, (2) Last educational qualification, (3) Preferred batch timing (morning/evening). Keep details concise and use the 'save_lead' tool to forward the lead to the admissions team.",
                greeting: "Hello, main {agentName} bol raha hoon {companyName} Admissions Desk se. Kya aap kisi course or admissions ke baare mein inquire karna chahte hain?"
            },
            "ecommerce": {
                systemPrompt: "You are a customer satisfaction assistant for an online retail store. Help customers track order delivery status, resolve shipping issues, coordinate returns, and suggest complementary products. Use the 'save_lead' tool to flag support escalations.",
                greeting: "Hello, main {agentName} bol raha hoon {companyName} Support Desk se. Kya main aapke order status or product return mein help kar sakta hoon?"
            },
            "banking_insurance": {
                systemPrompt: "You are a finance assistant helping callers with credit cards, loans, and account opening documentation. Guide users on loan eligibility requirements and use the 'save_lead' tool to schedule professional agent callbacks.",
                greeting: "Hello, main {agentName} bol raha hoon {companyName} Finance Desk se. Kya main aapke account opening, loan query, or insurance check mein help kar sakta hoon?"
            }
        };

        const indTemplate = body.industry_template;
        if (indTemplate && industryTemplates[indTemplate]) {
            const tpl = industryTemplates[indTemplate];
            systemPrompt = tpl.systemPrompt;
            firstMessage = tpl.greeting
                .replace("{agentName}", cleanGreetingName)
                .replace("{companyName}", companyDisplayName);
        } else {
            const greetingFn = AGENT_TYPE_GREETINGS[requestedAgentType];
            if (greetingFn) {
                firstMessage = greetingFn(cleanGreetingName, companyDisplayName);
            } else {
                firstMessage = blueprint.firstMessage
                    .replace("{userName}", userName)
                    .replace("{agentName}", cleanGreetingName);
            }
        }

        // --- VOICE SELECTION ---
        // Default: Sarvam AI for all Indian-context agents.
        // ElevenLabs is only used when a caller explicitly passes a real ElevenLabs voice UUID.
        // Per-agent-type Sarvam voice defaults:
        //   appointment_agent, support_agent → anushka (Female, warm)
        //   sales_agent, lead_qualifier, multi_agent → shubh (Male, energetic)
        const SARVAM_VOICE_DEFAULTS: Record<string, string> = {
            "sales_agent":       "shubh",
            "lead_qualifier":    "shubh",
            "multi_agent":       "shubh",
            "anika-voice":       "shubh",
            "support_agent":     "anushka",
            "appointment_agent": "anushka",
        };

        // Use caller-supplied voice only if it looks like a real Sarvam voice name.
        // If voice param is a legacy ElevenLabs key (calm/energetic/etc), ignore it.
        const SARVAM_VOICE_IDS = ['shubh', 'anushka', 'arvind', 'maya', 'neel', 'pavithra', 'arjun', 'amol', 'diya', 'meera'];
        const callerVoiceIsSarvam = voice && SARVAM_VOICE_IDS.includes(voice);
        const selectedVoice = callerVoiceIsSarvam
            ? voice
            : SARVAM_VOICE_DEFAULTS[requestedAgentType] || 'shubh';

        // 5a. Insert into consolidated agents table.
        // voice_provider is always 'sarvam' for Indian-context agents.
        // voice_id is the actual Sarvam voice name (shubh, anushka, etc.).
        const safeVoiceId = selectedVoice;

        // Calculate trial parameters if this agent is a trial agent
        let agentConfig = {};
        if (is_trial) {
            let trialMinutes = 100;
            let trialDays = 7;
            try {
                const { data: configMinutes } = await supabaseAdmin
                    .from('system_config')
                    .select('config_value')
                    .eq('config_key', 'trial_minutes')
                    .maybeSingle();
                if (configMinutes?.config_value) trialMinutes = parseInt(configMinutes.config_value, 10);

                const { data: configDays } = await supabaseAdmin
                    .from('system_config')
                    .select('config_value')
                    .eq('config_key', 'trial_days')
                    .maybeSingle();
                if (configDays?.config_value) trialDays = parseInt(configDays.config_value, 10);
            } catch (e) {
                console.error("[Trinetra] Error loading trial config parameters:", e);
            }

            agentConfig = {
                plan_tier: 'trial',
                trial_started_at: new Date().toISOString(),
                trial_ends_at: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString(),
                minutes_limit: trialMinutes
            };
        }

        // Full payload — some columns may not exist depending on schema version.
        // IMPORTANT: product_id is intentionally omitted here.
        // agents.product_id has a FK to `products` table, not `platform_services`.
        // Storing platform_services.id in product_id would violate that constraint.
        // Deduplication is handled via name-prefix encoding (e.g., "[lead_qualifier] ...").
        const fullPayload: Record<string, any> = {
            user_id: user.id,
            organization_id: organizationId,
            name: agentName,
            agent_type: resolvedAgentType,
            voice_provider: 'sarvam',   // Default: Sarvam AI for all Indian-context agents
            voice_id: safeVoiceId,       // Actual Sarvam voice name (shubh, anushka, etc.)
            vapi_agent_id: null,
            status: 'active',
            is_demo: is_demo || false,
            system_prompt: systemPrompt,
            greeting_message: firstMessage,
            fallback_message: 'Mujhe yeh samajh nahi aaya, kripya dubara bataiye.',
            config: agentConfig
        };

        let insertedAgent: any = null;
        let dbError: any = null;

        // First attempt: full payload
        ({ data: insertedAgent, error: dbError } = await supabaseAdmin
            .from('agents')
            .insert(fullPayload)
            .select()
            .single());

        // If PGRST204 (column not in schema cache), retry with minimal safe columns
        if (dbError && (dbError.code === 'PGRST204' || dbError.message?.includes('column'))) {
            console.warn(`[Trinetra] Column error on full insert (${dbError.message}), retrying with minimal columns`);
            const minimalPayload: Record<string, any> = {
                user_id: user.id,
                organization_id: organizationId,
                name: agentName,
                agent_type: resolvedAgentType,
                voice_id: safeVoiceId,
                status: 'active',
                system_prompt: systemPrompt,
                greeting_message: firstMessage,
                config: agentConfig,
            };
            // NOTE: product_id is intentionally excluded — see comment on fullPayload above.
            ({ data: insertedAgent, error: dbError } = await supabaseAdmin
                .from('agents')
                .insert(minimalPayload)
                .select()
                .single());
        }

        if (dbError) {
            console.error("[Trinetra] FULL DB ERROR:", JSON.stringify(dbError, null, 2));
            return NextResponse.json(
                {
                    error: "Database creation failed",
                    message: dbError.message,
                    details: dbError,
                    code: dbError.code,
                    hint: dbError.hint
                },
                { status: 500 }
            );
        }

        // 5c. Update profile with onboarding details (only columns that actually exist)
        const profileUpdatePayload: Record<string, any> = {
            onboarding_complete: true,
        };
        if (company_name) {
            profileUpdatePayload.company_name = company_name;
        }
        if (industry) {
            profileUpdatePayload.business_type = industry;
        }

        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update(profileUpdatePayload)
            .eq('id', user.id);

        if (updateError) {
            console.error("[Trinetra] Profile update failed:", JSON.stringify(updateError));
        }

        // If this is a demo agent, initialize/add it to demo_usage in profiles to lock it forever
        if (is_demo || insertedAgent?.is_demo) {
            const currentDemoUsage = (profile as any)?.demo_usage || {};
            if (!currentDemoUsage[requestedAgentType]) {
                const updatedDemoUsage = {
                    ...currentDemoUsage,
                    [requestedAgentType]: {
                        minutes_used: 0,
                        limit: 10,
                        created_at: new Date().toISOString()
                    }
                };
                await supabaseAdmin
                    .from('profiles')
                    .update({ demo_usage: updatedDemoUsage })
                    .eq('id', user.id);
            }
        }

        return NextResponse.json({
            success: true,
            agent: insertedAgent,
            dbAgent: insertedAgent,
            message: "Agent deployed successfully."
        });

    } catch (error: any) {
        console.error("[Trinetra] Agent Creation Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: error.message },
            { status: 500 }
        );
    }
}
