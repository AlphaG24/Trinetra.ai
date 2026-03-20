import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
    try {
        // 1. Secret Key Check
        const secret = req.headers.get("x-vapi-secret");
        if (secret !== process.env.VAPI_WEBHOOK_SECRET) {
            console.error("[Vapi Webhook] Unauthorized access attempt.");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const message = body.message as any; // Type assertion for flexibility with Vapi payload

        // 2. Filter Message Type
        if (!message || (message.type !== "end-of-call-report" && message.type !== "call-report")) {
            // Vapi sends various events (status-update, function-call, etc.)
            // We only care about call completion for billing.
            return NextResponse.json({ message: "Ignored event type." }, { status: 200 });
        }

        console.log(`[Vapi Webhook] Processing Call Report. ID: ${message.call?.id || 'Unknown'}`);

        // 3. Extract Data
        // Vapi payload structure varies slightly but 'duration' is key.
        // usually message.call.durationSeconds or message.durationSeconds
        const durationSeconds = (message.durationSeconds || message.call?.durationSeconds || message.analysis?.durationSeconds || 0) as number;
        const agentId = (message.assistant?.id || message.assistantId) as string;

        if (!agentId) {
            console.error("[Vapi Webhook] Missing agent ID in payload.");
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        // 4. Initialize Supabase Admin Client
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // 5. Find User via Agent ID
        // Assuming 'agents' table has 'vapi_id' and 'user_id'
        const { data: agent, error: agentError } = await supabase
            .from("agents")
            .select("user_id")
            .eq("vapi_id", agentId)
            .single();

        if (agentError || !agent) {
            console.error(`[Vapi Webhook] Agent not found for ID: ${agentId}`);
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const userId = agent.user_id;

        // 6. Update Profile Usage
        // Fetch current usage first (to check limits)
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("seconds_used_this_month, monthly_limit_seconds")
            .eq("id", userId)
            .single();

        if (profileError || !profile) {
            console.error(`[Vapi Webhook] Profile not found for User: ${userId}`);
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const currentUsage = (profile.seconds_used_this_month || 0) as number;
        const limit = (profile.monthly_limit_seconds || 600) as number;

        const newUsage = currentUsage + Math.round(durationSeconds);

        // update
        const { error: updateError } = await supabase
            .from("profiles")
            .update({
                seconds_used_this_month: newUsage
            })
            .eq("id", userId);

        if (updateError) {
            console.error(`[Vapi Webhook] Failed to update usage for User: ${userId}`, updateError);
            return NextResponse.json({ error: "Update failed" }, { status: 500 });
        }

        // 7. Check Limits
        if (newUsage > limit) {
            console.warn(`[Vapi Webhook] User ${userId} has exceeded monthly limit! (${newUsage}/${limit}s)`);
            // TODO: Logic to pause agent or trigger billing alert
        }

        console.log(`[Vapi Webhook] Usage updated for User: ${userId}. Added ${Math.round(durationSeconds)}s. Total: ${newUsage}s.`);

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error: any) {
        console.error("[Vapi Webhook] Internal Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
