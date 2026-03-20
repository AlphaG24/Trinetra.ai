
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { message } = await req.json();

        // Validate inputs
        if (!message || typeof message !== 'string') {
            return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Search Supabase for relevant context (Simple Text Search)
        const searchTerms = message.trim().split(/\s+/).join(' | ');

        const { data: documents, error: searchError } = await supabase
            .from('document_sections')
            .select('content')
            .textSearch('content', searchTerms, {
                type: 'websearch', // 'plain', 'phrase', or 'websearch'
                config: 'english'
            })
            .limit(3);

        if (searchError) {
            console.warn("Supabase Search Error (falling back to empty context):", searchError.message);
        }

        // Construct Context
        const context = documents && documents.length > 0
            ? documents.map(d => d.content).join('\n___\n')
            : 'No specific document context found in Knowledge Vault.';

        // 2. Send to Groq Cloud API
        const groqApiKey = process.env.GROQ_API_KEY?.trim();

        if (!groqApiKey) {
            console.error("GROQ_API_KEY is missing in environment variables.");
            return NextResponse.json({
                role: 'system',
                content: "Configuration Error: Neural Uplink (GROQ_API_KEY) is offline.",
                source: 'SYSTEM_ERROR'
            }, { status: 503 });
        }

        try {
            const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${groqApiKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        {
                            role: "system",
                            content: `You are Trinetra, an advanced cybersecurity AI. Refuse to answer non-technical questions (like cooking or sports).

                            Your Goal: Answer the user's security query accurately.
                            
                            Protocol:
                            1. SEARCH the provided 'Context' first. If the answer is there, cite the specific details.
                            2. IF the Context is empty or irrelevant, use your own General Knowledge to answer the question educationally.
                            3. NEVER say 'I don't have context' or 'I cannot answer'. Instead, provide a general definition and ask the user to upload a specific log file for more detail.
                            
                            --- CONTEXT BEGIN ---
                            ${context}
                            --- CONTEXT END ---`
                        },
                        {
                            role: "user",
                            content: message
                        }
                    ],
                    stream: false
                })
            });

            if (!groqResponse.ok) {
                const errorData = await groqResponse.text();
                throw new Error(`Groq API Error: ${groqResponse.status} - ${errorData}`);
            }

            const groqData = await groqResponse.json();
            const aiContent = groqData.choices[0]?.message?.content || "No intel generated.";

            return NextResponse.json({
                role: 'system',
                content: aiContent,
                source: documents && documents.length > 0 ? 'VERIFIED_VAULT_DATA' : 'GENERAL_KNOWLEDGE_BASE'
            });

        } catch (aiError: any) {
            console.error("AI Generation Error:", aiError);
            return NextResponse.json({
                role: 'system',
                content: "Neural Uplink Connection Failed. Unable to process inference request.",
                source: 'SYSTEM_ERROR'
            });
        }

    } catch (error: any) {
        console.error("Chat API Critical Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
