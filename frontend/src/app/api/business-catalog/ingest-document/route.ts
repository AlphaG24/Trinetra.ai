import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import OpenAI from "openai";

export const runtime = "nodejs";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Helper to call LLM for structured document parsing
async function parseDocumentContentWithLLM(extractedTexts: { filename: string; text: string }[]) {
  const combinedContext = extractedTexts
    .map((item, idx) => `=== DOCUMENT ${idx + 1}: ${item.filename} ===\n${item.text.slice(0, 15000)}`)
    .join("\n\n");

  const systemPrompt = `You are an expert AI business operations knowledge extractor for Trinetra AI.
The user is a business owner (could run a salon, healthcare clinic, retail store, logistics/transport, consulting firm, coaching institute, restaurant, or service company).
They have uploaded one or more documents (price lists, product catalogs, service menus, route sheets, appointment schedules, etc.).

Analyze all the documents and extract all operational items, products, services, routes, or appointment slots into a structured JSON array.
Each item in the JSON array MUST strictly match this schema:
{
  "title": "string (name of product, service, route, or appointment type)",
  "category": "appointment_slots | inventory | logistics | containers | general",
  "identifier_code": "string or null (SKU, code, or short ID)",
  "route_origin": "string or null (origin city/place if logistics)",
  "route_destination": "string or null (destination city/place if logistics)",
  "available_units": 1,
  "base_price_inr": number or null,
  "minimum_price_inr": number or null (strict floor limit if discount given, or same as base_price_inr),
  "booking_slot_start": "ISO 8601 string or null",
  "booking_slot_end": "ISO 8601 string or null",
  "status": "available",
  "metadata": {
    "description": "brief description or details",
    "source_file": "filename from which this was extracted",
    "custom_attributes": {}
  }
}

OUTPUT REQUIREMENTS:
- Output ONLY valid JSON: an array of objects [ { ... }, { ... } ].
- No markdown code fences, no conversational prose, only the raw JSON array.
- For prices in INR, extract numbers only. If currency is in USD or other, convert or preserve numeric value.
- If floor/minimum price is not specified, default to 85-90% of base_price_inr or equal to base_price_inr.
- Ensure all items have a meaningful 'title' and proper 'category'.`;

  const groqApiKey = process.env.GROQ_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  let rawJson = "";

  // 1. Try Groq (ultra-fast)
  if (groqApiKey) {
    try {
      const groqClient = new OpenAI({
        apiKey: groqApiKey,
        baseURL: "https://api.groq.com/openai/v1",
      });
      const res = await groqClient.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here are the uploaded documents:\n\n${combinedContext}` },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      });
      rawJson = res.choices[0]?.message?.content || "";
    } catch (err: any) {
      console.warn("[Ingest] Groq LLM failed, falling back:", err?.message);
    }
  }

  // 2. Try Gemini 2.5 Flash / Pro
  if (!rawJson && geminiApiKey) {
    try {
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
      const geminiRes = await fetch(geminiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt },
                { text: `Here are the uploaded documents:\n\n${combinedContext}` },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4000,
          },
        }),
      });

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else {
        console.warn("[Ingest] Gemini HTTP error:", await geminiRes.text());
      }
    } catch (err: any) {
      console.warn("[Ingest] Gemini LLM failed:", err?.message);
    }
  }

  // 3. Try OpenAI as fallback
  if (!rawJson && openaiApiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiApiKey });
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here are the uploaded documents:\n\n${combinedContext}` },
        ],
        temperature: 0.1,
      });
      rawJson = res.choices[0]?.message?.content || "";
    } catch (err: any) {
      console.warn("[Ingest] OpenAI LLM failed:", err?.message);
    }
  }

  if (!rawJson) {
    throw new Error("Could not process documents with any AI provider.");
  }

  // Clean JSON response (strip ```json or ``` wrapper)
  let cleanJson = rawJson.trim();
  if (cleanJson.startsWith("```")) {
    cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }

  const parsed = JSON.parse(cleanJson);
  return Array.isArray(parsed) ? parsed : (parsed.items || [parsed]);
}

export async function POST(request: Request) {
  try {
    const { authenticated, profile, user, error } = await authenticateRequest();
    if (!authenticated || !profile || !user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Please upload at least one document" }, { status: 400 });
    }

    const extractedTexts: { filename: string; text: string }[] = [];

    for (const file of files) {
      const filename = file.name;
      const ext = filename.split(".").pop()?.toLowerCase() || "";
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      let text = "";

      if (ext === "pdf") {
        try {
          const pdfParseModule = await import("pdf-parse");
          const PDFParseClass = (pdfParseModule as any).PDFParse || (pdfParseModule as any).default;
          if (typeof PDFParseClass === "function") {
            const parser = new PDFParseClass({ data: buffer });
            if (typeof (parser as any).load === "function") {
              await (parser as any).load();
            }
            const textResult = typeof (parser as any).getText === "function" ? await (parser as any).getText() : "";
            text = typeof textResult === "string" ? textResult : (textResult?.text || "");
          }
        } catch (pdfErr: any) {
          console.warn(`[Ingest] PDF parse error on ${filename}:`, pdfErr?.message);
          text = `[PDF Document: ${filename}]`;
        }
      } else if (ext === "xlsx" || ext === "xls") {
        try {
          const workbook = XLSX.read(buffer, { type: "buffer" });
          const sheetNames = workbook.SheetNames;
          const allSheetsText: string[] = [];

          sheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            if (csv && csv.trim()) {
              allSheetsText.push(`--- Sheet: ${sheetName} ---\n${csv}`);
            }
          });
          text = allSheetsText.join("\n\n");
        } catch (xlErr: any) {
          console.warn(`[Ingest] Excel parse error on ${filename}:`, xlErr?.message);
        }
      } else if (ext === "docx") {
        try {
          const result = await mammoth.extractRawText({ buffer });
          text = result.value || "";
        } catch (docErr: any) {
          console.warn(`[Ingest] Word parse error on ${filename}:`, docErr?.message);
        }
      } else {
        // Plain text, CSV, markdown, JSON
        text = buffer.toString("utf-8");
      }

      if (text.trim()) {
        extractedTexts.push({ filename, text });
      }
    }

    if (extractedTexts.length === 0) {
      return NextResponse.json(
        { error: "Could not extract readable text from the uploaded files." },
        { status: 400 }
      );
    }

    // Call LLM to extract structured operations records
    const structuredItems = await parseDocumentContentWithLLM(extractedTexts);

    if (!structuredItems || structuredItems.length === 0) {
      return NextResponse.json(
        { error: "AI could not identify any business offerings or inventory items in the documents." },
        { status: 400 }
      );
    }

    // Format rows for Supabase insertion
    const orgId = profile.organization_id || null;
    const formattedRows = structuredItems.map((raw: any) => {
      const title = (raw.title || raw.name || "Untitled Item").toString().trim();
      return {
        user_id: user.id,
        organization_id: orgId,
        title,
        category: (raw.category || "general").toString().toLowerCase().trim(),
        identifier_code: raw.identifier_code ? raw.identifier_code.toString().trim() : null,
        route_origin: raw.route_origin ? raw.route_origin.toString().trim() : null,
        route_destination: raw.route_destination ? raw.route_destination.toString().trim() : null,
        available_units: Number(raw.available_units !== undefined ? raw.available_units : 1) || 1,
        base_price_inr: raw.base_price_inr !== undefined && raw.base_price_inr !== null ? Number(raw.base_price_inr) : null,
        minimum_price_inr: raw.minimum_price_inr !== undefined && raw.minimum_price_inr !== null ? Number(raw.minimum_price_inr) : null,
        booking_slot_start: raw.booking_slot_start || null,
        booking_slot_end: raw.booking_slot_end || null,
        status: "available",
        metadata: {
          ...(raw.metadata || {}),
          ingested_via: "ai_document_extraction",
          ingested_at: new Date().toISOString()
        }
      };
    });

    const admin = getAdminClient();
    const { data: insertedItems, error: insertError } = await admin
      .from("business_operations_catalog")
      .insert(formattedRows)
      .select();

    if (insertError) {
      console.error("[Ingest] Database insert error:", insertError);
      return NextResponse.json({ error: "Failed to save extracted catalog items to database" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        items: insertedItems,
        count: insertedItems?.length || 0,
        files_processed: extractedTexts.map(f => f.filename)
      }
    });
  } catch (err: any) {
    console.error("[Ingest] Unexpected error in /api/business-catalog/ingest-document:", err);
    return NextResponse.json({ error: err?.message || "Failed to process documents" }, { status: 500 });
  }
}
