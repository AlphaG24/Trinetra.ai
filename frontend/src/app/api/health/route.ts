import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export const runtime = 'nodejs';

export async function GET() {
    try {
        const supabase = await createClient();

        // 1. Check Supabase
        const dbStart = Date.now();
        const { count, error: dbError } = await supabase.from('audit_history').select('*', { count: 'exact', head: true });
        const dbLatency = Date.now() - dbStart;
        const dbStatus = dbError ? 'error' : 'ok';

        // 2. Check Ollama Logic
        // We will ping the local Ollama instance (assuming running on host port 11434 via localhost)
        // Note: In some deployments 'localhost' might loopback inside container. 
        // We assume access is configured.
        let ollamaStatus = 'unknown';
        let ollamaModels = [];
        try {
            const endpoint = process.env.OLLAMA_URL ? `${process.env.OLLAMA_URL.replace(/\/$/, '')}/api/tags` : 'http://localhost:11434/api/tags';
            const ollamaRes = await fetch(endpoint, { method: 'GET' });
            if (ollamaRes.ok) {
                const data = await ollamaRes.json();
                ollamaStatus = 'ok';
                ollamaModels = data.models || [];
            } else {
                ollamaStatus = 'error';
            }
        } catch (e) {
            ollamaStatus = 'unreachable';
        }

        const hasLlama = ollamaModels.some((m: any) => m.name.includes('llama3.2'));
        const hasNomic = ollamaModels.some((m: any) => m.name.includes('nomic-embed-text'));

        return NextResponse.json({
            database: { status: dbStatus, latency: dbLatency, check: "audit_history connection" },
            ollama: { status: ollamaStatus, models: ollamaModels.map((m: any) => m.name) },
            verification: {
                llama_present: hasLlama,
                nomic_present: hasNomic,
                ready: dbStatus === 'ok' && hasLlama && hasNomic
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
