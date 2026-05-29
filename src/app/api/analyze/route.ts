import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = 'nodejs';

// Polyfills
// @ts-ignore
global.DOMMatrix = global.DOMMatrix || class { };
// @ts-ignore
global.ImageData = global.ImageData || class { };
// @ts-ignore
global.Path2D = global.Path2D || class { };

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
    baseURL: 'http://localhost:11434/v1',
    apiKey: 'ollama',
});

async function getEmbedding(text: string): Promise<number[] | null> {
    try {
        const response = await fetch('http://127.0.0.1:11434/api/embeddings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "nomic-embed-text",
                prompt: text
            })
        });

        if (!response.ok) {
            console.error("Embedding API Error:", await response.text());
            return null;
        }

        const data = await response.json();
        return data.embedding;
    } catch (error) {
        console.error("Embedding Fetch Error:", error);
        return null;
    }
}

export async function POST(request: Request) {
    try {
        const { filePath, text, fileName } = await request.json();

        let extractedText = "";
        let finalFileName = fileName || (filePath ? filePath.split('/').pop() : "unknown_doc");

        if (text) {
            // DIRECT TEXT MODE (Ghost Mode / Testing)
            extractedText = text;
        } else if (filePath) {
            // STORAGE MODE (Normal Upload)

            // 1. Download File (as Admin)
            const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
                .from("audits")
                .download(filePath);

            if (downloadError || !fileBlob) {
                return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
            }

            // 2. Extract Text
            const arrayBuffer = await fileBlob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            try {
                if (filePath.toLowerCase().endsWith(".pdf")) {
                    const PDFParser = require("pdf2json");
                    const pdfParser = new PDFParser(null, 1);
                    extractedText = await new Promise((resolve, reject) => {
                        pdfParser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
                        pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent()));
                        pdfParser.parseBuffer(buffer);
                    });
                } else if (filePath.toLowerCase().endsWith(".docx")) {
                    const mammoth = require("mammoth");
                    const result = await mammoth.extractRawText({ buffer: buffer });
                    extractedText = result.value;
                } else {
                    return NextResponse.json({ error: "Unsupported file type. Please upload PDF or DOCX." }, { status: 400 });
                }
            } catch (parseError: any) {
                console.error("Parsing Error:", parseError);
                return NextResponse.json({ error: "Failed to extract text from file.", details: parseError.message }, { status: 500 });
            }
        } else {
            return NextResponse.json({ error: "Either 'filePath' or 'text' is required." }, { status: 400 });
        }


        if (!extractedText || extractedText.trim().length === 0) {
            return NextResponse.json({
                error: "Document appears empty. If this is a scanned PDF (image), AI cannot read it. Please use a text-based PDF."
            }, { status: 400 });
        }

        // 3. RAG: Retrieve Relevant Standards
        let contextText = "No specific standards found in vault. Audit based on general best practices.";
        let referencedStandards: string[] = [];

        const queryText = extractedText.substring(0, 2000);
        const queryEmbedding = await getEmbedding(queryText);

        if (queryEmbedding) {
            const { data: matches, error: matchError } = await supabaseAdmin.rpc('match_documents', {
                query_embedding: queryEmbedding,
                match_threshold: 0.5,
                match_count: 3
            });

            if (matches && matches.length > 0) {
                console.log(`[Auditor] Found ${matches.length} relevant standards in vault.`);
                contextText = matches.map((m: any) => `STANDARD (${m.file_name}):\n${m.content}`).join("\n\n");
                referencedStandards = matches.map((m: any) => m.file_name);
            }
        }

        // 4. AI Analysis
        const prompt = `
        You are an elite Lead Compliance Auditor (Trinetra AI).
        
        --- KNOWLEDGE VAULT STANDARDS (GROUND TRUTH) ---
        ${contextText}
        ------------------------------------------------

        --- DOCUMENT TO AUDIT ---
        ${extractedText.substring(0, 15000)} ... (truncated)
        -------------------------

        INSTRUCTIONS:
        1. **Context Priority**: Use "Knowledge Vault Standards" as primary law. 
           - IF VAULT IS EMPTY or IRRELEVANT: You MUST audit against General Industry Best Practices.
        
        2. **Risk Analysis**: 
           - Identify RISKS (Compliance, Security, Privacy, Legal).
           - Check for minimal PII exposure or data leakage risks.
           - Check for missing clauses or vague terms.

        3. **Scoring**:
           - Assign a Risk Score (0-100). 
           - 0 = Safe. 100 = Critical.

        4. **Output**: Strictly valid JSON.

        JSON FORMAT:
        {
          "riskScore": number,
          "summary": "Professional executive summary of findings.",
          "criticalIssues": ["List of specific violations"],
          "recommendations": ["Actionable fixes"]
        }
        `;

        const completion = await openai.chat.completions.create({
            model: "llama3.2",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
        });

        const rawContent = completion.choices[0].message.content;
        let analysisData;

        try {
            analysisData = JSON.parse(rawContent!);

            // Sanitization
            const sanitizeArray = (arr: any[]) => {
                if (!Array.isArray(arr)) return [];
                return arr.map(item => String(item));
            };

            analysisData.criticalIssues = sanitizeArray(analysisData.criticalIssues);
            analysisData.recommendations = sanitizeArray(analysisData.recommendations);
            analysisData.referenced_standards = [...new Set(referencedStandards)];
            analysisData.full_text = extractedText.substring(0, 20000);

        } catch (jsonError) {
            console.error("JSON Parse Error:", jsonError);
            analysisData = {
                riskScore: 50,
                summary: "Analysis completed but response format was invalid.",
                criticalIssues: [],
                recommendations: [],
                referenced_standards: referencedStandards,
                full_text: extractedText.substring(0, 20000)
            };
        }

        // 5. DB Save (Authenticated)
        let savedRecordId = null;
        try {
            const supabaseAuth = await createServerClient();
            const { data: { user: authUser } } = await supabaseAuth.auth.getUser();

            if (authUser) {
                const cleanFileName = finalFileName.replace(/^\d+_/, '');

                const { data: insertData, error: insertError } = await supabaseAdmin
                    .from('audit_history')
                    .insert({
                        user_id: authUser.id,
                        file_name: cleanFileName,
                        risk_score: analysisData.riskScore,
                        findings: analysisData,
                        created_at: new Date().toISOString()
                    })
                    .select('id')
                    .single();

                if (insertData) {
                    savedRecordId = insertData.id;
                }
            }
        } catch (dbError) {
            console.error("Database Save Failed:", dbError);
        }

        return NextResponse.json({
            success: true,
            data: analysisData,
            savedRecordId
        });

    } catch (error: any) {
        console.error("Analysis Server Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
