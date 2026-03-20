import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

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

        // 2. Fetch Profile & Check Access
        let { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('subscription_tier, agents_created, agent_limit')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            // Auto-heal: Create default profile if missing
            console.log(`[Trinetra] Profile missing for ${user.id}. Creating default.`);

            const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert({
                    id: user.id,
                    email: user.email,
                    subscription_tier: 'free',
                    agents_created: 0,
                    agent_limit: 1
                })
                .select()
                .single();

            if (createError || !newProfile) {
                console.error("[Trinetra] Failed to create default profile:", createError);
                return NextResponse.json(
                    { error: "Profile creation failed. Contact support." },
                    { status: 500 }
                );
            }

            // Use the newly created profile
            profile = newProfile;
        }

        if (!profile) {
            return NextResponse.json({ error: "Profile could not be verified." }, { status: 500 });
        }

        // Check 1: Subscription Tier (Sovereign Gate)
        if (profile.subscription_tier === 'free') {
            return NextResponse.json(
                { error: "Access Denied. Deployment requires Sovereign Status." },
                { status: 403 }
            );
        }

        // Check 2: Unit Limits
        if (profile.agents_created >= profile.agent_limit) {
            return NextResponse.json(
                { error: "Unit Limit Reached. Upgrade your clearance." },
                { status: 403 }
            );
        }


        // --- IF CHECKS PASS: PROCEED WITH CREATION ---

        const body = await request.json();
        const { name, role, voice, directive } = body;

        // Blueprint Logic
        const blueprint = BLUEPRINTS[role] || BLUEPRINTS["Custom"];
        const agentName = name || "Neural Unit";
        const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || "Trinetra User";

        let systemPrompt = directive;
        if (!systemPrompt || systemPrompt.trim() === "") {
            systemPrompt = blueprint.systemPrompt
                .replace("{userName}", userName)
                .replace("{agentName}", agentName);
        }

        const firstMessage = blueprint.firstMessage
            .replace("{userName}", userName)
            .replace("{agentName}", agentName);


        // 3. Create Agent via Vapi API
        const vapiKey = process.env.VAPI_PRIVATE_KEY || process.env.NEXT_PUBLIC_VAPI_PRIVATE_KEY;
        console.log(`[Trinetra] Vapi Key Loaded: ${vapiKey ? (vapiKey.substring(0, 10) + "...") : "UNDEFINED"}`);
        console.log(`[Trinetra] Initializing Agent: ${agentName} (${role}) for User: ${user.id}`);
        console.log(`[Trinetra] Using System Prompt: ${systemPrompt.substring(0, 50)}...`);

        // Voice Mapping (OpenAI Voices)
        const FORCE_VOICE_MAP: Record<string, string> = {
            "calm": "shimmer-openai",      // Female, Calm
            "energetic": "echo-openai",    // Male, Energetic
            "authoritative": "onyx-openai",// Male, Deep
            "soft": "nova-openai"          // Female, Soft
        };
        const selectedVoice = FORCE_VOICE_MAP[voice] || "shimmer-openai";

        // Vapi expects just 'shimmer' if using provider 'openai' in 'voice'?
        // No, typically 'voice: "shimmer-openai"' is safe or voice object.
        // Actually, Vapi error list showed 'shimmer-openai' as valid option.

        const vapiPayload = {
            name: agentName,
            voice: selectedVoice,
            model: {
                provider: "openai",
                model: "gpt-4-turbo",
                systemPrompt: systemPrompt,
                functions: blueprint.functions || [],
                // Tool calling enabled
            },
            transcriber: {
                provider: "deepgram",
                model: "nova-2",
                language: "en-US",
            },
            firstMessage: firstMessage,
            metadata: {
                role: role,
                userId: user.id
            }
        };

        const vapiResponse = await fetch("https://api.vapi.ai/assistant", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${vapiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(vapiPayload),
        });

        if (!vapiResponse.ok) {
            const errorData = await vapiResponse.json();
            console.error("[Trinetra] Vapi Creation Failed:", errorData);
            return NextResponse.json(
                { error: "Vapi Creation Failed", details: errorData },
                { status: vapiResponse.status }
            );
        }

        const newAgent = await vapiResponse.json();

        // 4a. Stick Agent in DB
        const { data: insertedAgent, error: dbError } = await supabase
            .from('agents')
            .insert({
                user_id: user.id,
                name: agentName,
                role: role,
                voice: selectedVoice,
                vapi_id: newAgent.id,
                status: 'online',
                stats: { calls: 0, avg_time: "0m 0s" }
            })
            .select()
            .single();

        if (dbError) {
            console.error("[Trinetra] DB Insert Failed:", dbError);
            // Non-critical, but good to know
        }

        // 4b. Update Profile (Increment Count)
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ agents_created: profile.agents_created + 1 })
            .eq('id', user.id);

        if (updateError) {
            console.error("[Trinetra] Failed to increment agent count:", updateError);
        }

        return NextResponse.json({
            success: true,
            agent: newAgent, // Vapi Agent
            dbAgent: insertedAgent, // Supabase Agent
            message: "Unit Deployed Successfully."
        });

    } catch (error: any) {
        console.error("[Trinetra] Agent Creation Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: error.message },
            { status: 500 }
        );
    }
}
