import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Force Node.js runtime
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

function chunkText(text: string, chunkSize: number = 1000, overlap: number = 100): string[] {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push(text.slice(start, end));
        // Move forward by chunkSize - overlap to create overlapping chunks
        start += (chunkSize - overlap);
    }
    return chunks;
}

export async function POST(request: Request) {
    try {
        const { filePath, fileName } = await request.json();

        if (!filePath) {
            return NextResponse.json({ error: "File path is required" }, { status: 400 });
        }

        console.log(`[Vault] Starting ingestion for: ${fileName}`);

        // 1. Download File
        const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
            .from("audits") // Use existing bucket
            .download(filePath);

        if (downloadError || !fileBlob) {
            console.error("Vault Download Error:", downloadError);
            return NextResponse.json({ error: "Failed to download file from bucket" }, { status: 500 });
        }

        // 2. Extract Text
        const arrayBuffer = await fileBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        let extractedText = "";

        try {
            const lowerPath = filePath.toLowerCase();
            if (lowerPath.endsWith(".pdf")) {
                const PDFParser = require("pdf2json");
                const pdfParser = new PDFParser(null, 1);
                extractedText = await new Promise((resolve, reject) => {
                    pdfParser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
                    pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent()));
                    pdfParser.parseBuffer(buffer);
                });
            } else if (lowerPath.endsWith(".docx")) {
                const mammoth = require("mammoth");
                const result = await mammoth.extractRawText({ buffer: buffer });
                extractedText = result.value;
            } else {
                return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
            }
        } catch (extractError: any) {
            console.error("Text Extraction Failed:", extractError);
            return NextResponse.json({ error: "Failed to extract text", details: extractError.message }, { status: 500 });
        }

        if (!extractedText || extractedText.trim().length === 0) {
            console.error("[Vault] Extraction failed: Text is empty");
            return NextResponse.json({ error: "Extracted text is empty. The document might be scanned/image-based." }, { status: 400 });
        }

        // 3. Chunk Text
        const cleanText = extractedText.replace(/\s+/g, ' ').trim();
        const chunks = chunkText(cleanText);
        console.log(`[Vault] Extraction success. Text length: ${cleanText.length}. Created ${chunks.length} chunks.`);

        if (chunks.length === 0) {
            return NextResponse.json({ error: "Chunking resulted in 0 chunks." }, { status: 400 });
        }

        // 4. Generate Embeddings & Store
        let savedChunks = 0;
        let lastError = "";

        for (const [index, chunk] of chunks.entries()) {
            try {
                // Debug log for first chunk to verify loop entry
                if (index === 0) console.log(`[Vault] Processing first chunk... sending to Ollama.`);

                // Using 127.0.0.1 instead of localhost to prevent IPv6 resolution issues
                const embeddingResponse = await fetch('http://127.0.0.1:11434/api/embeddings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: "nomic-embed-text",
                        prompt: chunk
                    })
                });

                if (!embeddingResponse.ok) {
                    const errorText = await embeddingResponse.text();
                    console.error(`[Vault] Ollama API Error (${embeddingResponse.status}): ${errorText}`);
                    throw new Error(`Ollama API Error: ${embeddingResponse.status} ${embeddingResponse.statusText}. Details: ${errorText}`);
                }

                const embeddingData = await embeddingResponse.json();
                const vector = embeddingData.embedding;

                if (!vector) {
                    console.error("[Vault] No vector in Ollama response:", embeddingData);
                    throw new Error("No embedding vector returned from Ollama");
                }

                // Insert into DB
                const { error: insertError } = await supabaseAdmin
                    .from('knowledge_vault')
                    .insert({
                        file_name: fileName,
                        content: chunk,
                        embedding: vector
                    });

                if (insertError) {
                    console.error("DB Insert Error:", insertError);
                    lastError = `DB Error: ${insertError.message}`;
                    // Break loop to report error immediately instead of processing all
                    break;
                } else {
                    savedChunks++;
                }
            } catch (embedError: any) {
                lastError = embedError.message;
                console.error(`[Vault] Embedding Generation Failed for chunk ${index}:`, embedError.message);

                // If it's a connection error, fail fast and warn user
                if (embedError.cause?.code === 'ECONNREFUSED' || embedError.message?.includes('fetch failed')) {
                    return NextResponse.json({
                        error: "Embedding engine unreachable. Is Ollama running? (Connection Refused 127.0.0.1:11434)"
                    }, { status: 503 });
                }
            }
        }

        console.log(`[Vault] Ingestion finished. Successfully indexed ${savedChunks}/${chunks.length} chunks.`);

        if (chunks.length > 0 && savedChunks === 0) {
            console.error("[Vault] Critical Failure: 0 chunks saved.");
            return NextResponse.json({
                error: `Failed to save any chunks. Last error: ${lastError}`
            }, { status: 503 });
        }

        return NextResponse.json({
            success: true,
            chunks: savedChunks,
            totalChunks: chunks.length
        });

    } catch (error: any) {
        console.error("Vault Ingestion System Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
