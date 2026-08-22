import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const AGENT_TYPE_TEMPLATES: Record<string, string> = {
    "sales_agent":           "sales_agent.txt",
    "support_agent":         "support_agent.txt",
    "appointment_agent":     "appointment_agent.txt",
    "lead_qualifier":        "lead_qualifier.txt",
    "multi_agent":           "multi_agent.txt",
    "anika-voice":           "sales_agent.txt",
    "voice":                 "sales_agent.txt",
    "sales_agent.txt":       "sales_agent.txt",
    "support_agent.txt":     "support_agent.txt",
    "appointment_agent.txt": "appointment_agent.txt",
    "lead_qualifier.txt":    "lead_qualifier.txt",
    "multi_agent.txt":       "multi_agent.txt",
};

const SARVAM_VOICE_DEFAULTS: Record<string, string> = {
    "sales_agent":       "shubh",
    "lead_qualifier":    "shubh",
    "multi_agent":       "shubh",
    "anika-voice":       "shubh",
    "support_agent":     "anushka",
    "appointment_agent": "anushka",
};

const AGENT_TYPE_GREETINGS: Record<string, (name: string, company: string) => string> = {
    "sales_agent":       (n, c) => `Hello, main ${n} bol raha hoon ${c} se. Kya main 30 second le sakta hoon?`,
    "support_agent":     (n, c) => `Hello, main ${n} bol rahi hoon ${c} support team se. Kaise help kar sakti hoon?`,
    "appointment_agent": (n, c) => `Hello, main ${n} bol rahi hoon ${c} se. Kaise help kar sakti hoon?`,
    "lead_qualifier":    (n, _c) => `Hello, main ${n} bol raha hoon. Aapne hamari website pe enquiry ki thi. 2 minute hain aapke paas?`,
    "multi_agent":       (n, c) => `Hello, main ${n} bol raha hoon ${c} se. Kaise help kar sakta hoon?`,
    "anika-voice":       (n, c) => `Hello, main ${n} bol raha hoon ${c} se. Kya main 30 second le sakta hoon?`,
};

function resolveTemplateFileName(key: string): string | null {
    return AGENT_TYPE_TEMPLATES[key] ?? null;
}

function loadPromptTemplate(
    templateKey: string,
    agentName: string,
    companyName: string
): string | null {
    const fileName = resolveTemplateFileName(templateKey);
    if (!fileName) return null;

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
                break;
            }
        } catch (_e) {
            // try next candidate
        }
    }

    if (!rawTemplate) return null;

    return rawTemplate
        .replace(/\{\{agent_name\}\}/g, agentName)
        .replace(/\{\{company_name\}\}/g, companyName);
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: agentId } = await params;
        const supabase = await createClient();

        // 1. Authenticate User
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { reset_type } = body; // 'behavior' | 'voice' | 'all'

        // Initialize Admin Client (for fetching and editing metadata easily)
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseAdmin = serviceRoleKey
            ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
            : supabase;

        // 2. Fetch the existing agent to extract its type and profile context
        const { data: agent, error: agentErr } = await supabaseAdmin
            .from('agents')
            .select('*')
            .eq('id', agentId)
            .eq('user_id', user.id)
            .single();

        if (agentErr || !agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        // Extract raw agent type from name prefix (e.g., "[appointment_agent] Appointment Booker - Demo")
        const nameMatch = agent.name.match(/^\[([^\]]+)\]/);
        const requestedAgentType = nameMatch ? nameMatch[1] : 'voice';

        // Strip slug prefix and Demo suffix for greeting and internal generation
        const cleanName = agent.name
            .replace(/^\[[^\]]+\]\s*/, '')
            .replace(/\s*-\s*Demo\s*$/i, '');

        // Fetch profile to get company name fallback
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('company_name, full_name, email')
            .eq('id', user.id)
            .single();

        const userName = profile?.full_name || user.email?.split('@')[0] || "Trinetra User";
        const companyDisplayName = profile?.company_name || userName;

        // Load blueprint templates for fallback
        const BLUEPRINTS: Record<string, any> = {
            "Custom": {
                firstMessage: `Hello, I am ${cleanName}. How may I assist you?`,
                systemPrompt: `You are a helpful AI assistant for ${userName}.`,
            }
        };

        // Fetch platform service
        const { data: platformService } = await supabaseAdmin
            .from('platform_services')
            .select('id, type, marketplace_metadata')
            .eq('slug', requestedAgentType)
            .maybeSingle();

        const metadataTemplateFile: string | null =
            platformService?.marketplace_metadata?.template_file ?? null;

        const updates: Record<string, any> = {};

        if (reset_type === 'behavior' || reset_type === 'all') {
            const primaryKey = metadataTemplateFile || requestedAgentType;
            const templatePrompt = loadPromptTemplate(primaryKey, cleanName, companyDisplayName);

            if (templatePrompt) {
                updates.system_prompt = templatePrompt;
            } else {
                updates.system_prompt = BLUEPRINTS["Custom"].systemPrompt;
            }

            const greetingFn = AGENT_TYPE_GREETINGS[requestedAgentType];
            if (greetingFn) {
                updates.greeting_message = greetingFn(cleanName, companyDisplayName);
            } else {
                updates.greeting_message = BLUEPRINTS["Custom"].firstMessage;
            }

            updates.fallback_message = 'Mujhe yeh samajh nahi aaya, kripya dubara bataiye.';
            updates.ending_message = 'Dhanyavad ji, aapse baat karke accha laga. Goodbye!';
            updates.temperature = 0.7;
            updates.max_tokens = 250;
        }

        if (reset_type === 'voice' || reset_type === 'all') {
            const defaultVoice = SARVAM_VOICE_DEFAULTS[requestedAgentType] || 'shubh';
            updates.voice_provider = 'sarvam';
            updates.voice_id = defaultVoice;
            updates.voice_speed = 1.0;
            updates.voice_pitch = 1.0;
            updates.primary_language = 'hinglish';
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "No reset updates performed" }, { status: 400 });
        }

        // Apply reset updates
        const { data: updatedAgent, error: updateError } = await supabaseAdmin
            .from('agents')
            .update(updates)
            .eq('id', agentId)
            .select()
            .single();

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, agent: updatedAgent });
    } catch (error: any) {
        console.error("[Agent Reset API] Catch Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
