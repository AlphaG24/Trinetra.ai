
import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { requireAuth } from "../../../../utils/apiAuth";

export const runtime = 'nodejs';

const openai = new OpenAI({
    baseURL: process.env.OLLAMA_URL ? `${process.env.OLLAMA_URL.replace(/\/$/, '')}/v1` : 'http://127.0.0.1:11434/v1',
    apiKey: 'ollama',
});

export async function POST(req: Request) {
    try {
        // SECURITY: Verify the caller is authenticated
        const authResult = await requireAuth();
        if (authResult instanceof Response) return authResult;

        const { finding, context, standard } = await req.json();

        const prompt = `
        You are a Senior Legal & Compliance Editor.
        
        TASK: Rewrite the following problematic text to be 100% compliant and risk-free.
        
        --- ORIGINAL ISSUE ---
        "${finding}"
        
        --- DOCUMENT CONTEXT ---
        "${context ? context.substring(0, 1000) : "N/A"}"
        
        --- COMPLIANCE STANDARD ---
        "${standard || "General Best Practices"}"
        -------------------------
        
        INSTRUCTIONS:
        1. Provide a "Fixed Version" that resolves the issue.
        2. Explain "Why this fixes it" in one sentence.
        3. Output as JSON: { "fix": "string", "reason": "string" }
        `;

        const completion = await openai.chat.completions.create({
            model: 'llama3.2',
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0].message.content;
        const result = JSON.parse(content!);

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Remediation Error:", error);
        // SECURITY: Never expose internal error details
        return NextResponse.json({ error: "Remediation service encountered an error." }, { status: 500 });
    }
}
