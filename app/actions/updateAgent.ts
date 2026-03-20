'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateAgent(agentId: string, formData: FormData) {
    const supabase = await createClient(); // Await createClient

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    // 1. KEY CHECK
    if (!process.env.VAPI_PRIVATE_KEY) {
        return { success: false, error: 'CRITICAL: VAPI_PRIVATE_KEY is missing from .env file' };
    }

    const name = formData.get('name') as string;
    // Use 'prompt' (from textarea name="prompt") or fallback to 'context' if needed
    const prompt = (formData.get('prompt') || formData.get('context')) as string || 'You are a helpful assistant.';
    const welcome_message = formData.get('welcome_message') as string || 'Hello!';

    // 2. Fetch current agent
    const { data: agent } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();

    let vapiAssistantId = agent?.vapi_assistant_id;

    // 3. Talk to Vapi
    try {
        const vapiEndpoint = vapiAssistantId
            ? `https://api.vapi.ai/assistant/${vapiAssistantId}`
            : 'https://api.vapi.ai/assistant';

        const vapiMethod = vapiAssistantId ? 'PATCH' : 'POST';

        const vapiRes = await fetch(vapiEndpoint, {
            method: vapiMethod,
            headers: {
                'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                firstMessage: welcome_message,
                model: {
                    provider: "openai",
                    model: "gpt-4",
                    messages: [{ role: "system", content: prompt }]
                },
                voice: {
                    provider: "11labs",
                    voiceId: "21m00Tcm4TlvDq8ikWAM" // Using ID for Rachel to adhere to Vapi specs
                }
            })
        });

        if (!vapiRes.ok) {
            const errorText = await vapiRes.text();
            return { success: false, error: `VAPI API ERROR: ${errorText}` };
        }

        const vapiData = await vapiRes.json();
        if (vapiData.id) {
            vapiAssistantId = vapiData.id;
        }

    } catch (err: any) {
        return { success: false, error: `NETWORK ERROR: ${err.message}` };
    }

    // 4. Save to Supabase
    const { error: dbError } = await supabase
        .from('agents')
        .update({
            name,
            prompt,
            welcome_message,
            vapi_assistant_id: vapiAssistantId
        })
        .eq('id', agentId);

    if (dbError) {
        return { success: false, error: `SUPABASE ERROR: ${dbError.message}` };
    }

    revalidatePath('/dashboard/agents');
    revalidatePath(`/dashboard/agents/${agentId}`);

    return { success: true };
}
