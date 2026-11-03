import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const runtime = "nodejs";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function analyzeVoiceDirectiveWithLLM(transcript: string) {
  const now = new Date();
  const dateIso = now.toISOString().slice(0, 10);

  const systemPrompt = `You are the AI Business Brain Operations Specialist for Trinetra AI.
The business owner has provided a verbal instruction or operational update in Hindi, Hinglish, or English.
Current Date: ${dateIso}.

Analyze the user's spoken words and return a structured JSON response:
{
  "title": "Short, clear human-readable title (e.g. 'Operating Hours: Open After 10:00 AM Today' or 'Shop Closed Today - Reschedule to Tomorrow')",
  "prompt_override": "A direct, imperative instruction for the AI voice agent answering live calls. State clearly what the bot must tell callers, what slots to book, and what limits to enforce.",
  "category": "appointment_slots | inventory | logistics | general",
  "action_type": "hours_update | closure_reschedule | inventory_zero | rule_override",
  "summary_hindi": "One sentence summary in simple Hindi/Hinglish",
  "mutations": {
    "zero_out_category": "logistics | inventory | null",
    "mark_closed": boolean,
    "slot_start": "string or null",
    "slot_end": "string or null"
  },
  "auto_populated_items": [
    {
      "title": "Clear offering or slot name (e.g. 'Appointment Slot: 10:00 AM - 12:00 PM' or 'Afternoon Consultation Slot: 02:00 PM - 04:00 PM')",
      "category": "appointment_slots | inventory | logistics | general",
      "identifier_code": "e.g. SLOT-10AM",
      "available_units": 3,
      "base_price_inr": 500,
      "minimum_price_inr": 400,
      "booking_slot_start": "${dateIso}T10:00:00Z",
      "booking_slot_end": "${dateIso}T12:00:00Z",
      "metadata": {
        "notes": "Smart auto-populated from owner spoken instruction"
      }
    }
  ]
}

RULES FOR AUTO-POPULATED ITEMS:
1. If the owner mentions open hours or appointment booking (e.g., "10 baje tak band rahega to uske baad appointment lena" or "10 baje se 4 bje tak salon open rakhunga"):
   - Generate 2 to 4 bookable appointment slots within that open window for today (e.g. 10:00-12:00, 12:00-14:00, 14:00-16:00, etc.) so customers calling the AI agent can book actual confirmed times.
2. If the owner says the shop is closed today ("aaj shop close rakhunga"):
   - auto_populated_items can be an empty array [] or tomorrow's first available slot.
3. If the owner mentions specific products or discounts, create or update those items.
4. If no specific slots are implied, return "auto_populated_items": [].

OUTPUT RULES:
- Output ONLY valid JSON. No markdown codeblocks. No conversational introduction.`;

  const groqApiKey = process.env.GROQ_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  let rawJson = "";

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
          { role: "user", content: `Owner Voice Transcript: "${transcript}"` },
        ],
        temperature: 0.1,
      });
      rawJson = res.choices[0]?.message?.content || "";
    } catch (err: any) {
      console.warn("[VoiceDirective] Groq failed, fallback:", err?.message);
    }
  }

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
                { text: `Owner Voice Transcript: "${transcript}"` },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
          },
        }),
      });

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
    } catch (err: any) {
      console.warn("[VoiceDirective] Gemini failed:", err?.message);
    }
  }

  if (!rawJson && openaiApiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiApiKey });
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Owner Voice Transcript: "${transcript}"` },
        ],
        temperature: 0.1,
      });
      rawJson = res.choices[0]?.message?.content || "";
    } catch (err: any) {
      console.warn("[VoiceDirective] OpenAI failed:", err?.message);
    }
  }

  if (!rawJson) {
    throw new Error("Could not process voice directive with AI.");
  }

  let cleanJson = rawJson.trim();
  if (cleanJson.startsWith("```")) {
    cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }

  return JSON.parse(cleanJson);
}

export async function GET(request: Request) {
  try {
    const { authenticated, profile, user, error } = await authenticateRequest();
    if (!authenticated || !profile || !user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const admin = getAdminClient();
    let query = admin
      .from("business_operations_catalog")
      .select("*")
      .eq("category", "voice_directive")
      .order("created_at", { ascending: false });

    if (profile.organization_id) {
      query = query.or(`organization_id.eq.${profile.organization_id},user_id.eq.${user.id}`);
    } else {
      query = query.eq("user_id", user.id);
    }

    const { data: directives, error: dbError } = await query;
    if (dbError) {
      return NextResponse.json({ success: true, data: { directives: [] } });
    }

    return NextResponse.json({ success: true, data: { directives: directives || [] } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { authenticated, profile, user, error } = await authenticateRequest();
    if (!authenticated || !profile || !user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const transcript = (body?.transcript || "").toString().trim();

    if (!transcript) {
      return NextResponse.json({ error: "Voice transcript is required." }, { status: 400 });
    }

    const analysis = await analyzeVoiceDirectiveWithLLM(transcript);

    const admin = getAdminClient();
    const orgId = profile.organization_id || null;

    // Apply database mutations if needed
    if (analysis.mutations?.zero_out_category) {
      const catToZero = analysis.mutations.zero_out_category;
      let zeroQuery = admin
        .from("business_operations_catalog")
        .update({ available_units: 0, status: "reserved", updated_at: new Date().toISOString() })
        .eq("category", catToZero);

      if (orgId) {
        zeroQuery = zeroQuery.or(`organization_id.eq.${orgId},user_id.eq.${user.id}`);
      } else {
        zeroQuery = zeroQuery.eq("user_id", user.id);
      }
      await zeroQuery;
    }

    // Insert voice directive entry
    const { data: newDirective, error: insertError } = await admin
      .from("business_operations_catalog")
      .insert({
        user_id: user.id,
        organization_id: orgId,
        title: analysis.title || "Spoken Daily Operational Directive",
        category: "voice_directive",
        identifier_code: `VOICE-${Date.now().toString().slice(-6)}`,
        available_units: 1,
        status: "available",
        metadata: {
          is_active: true,
          voice_transcript: transcript,
          prompt_override: analysis.prompt_override,
          action_type: analysis.action_type,
          summary_hindi: analysis.summary_hindi,
          mutations: analysis.mutations,
          created_via: "voice_to_brain",
          timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error("[VoiceDirective] Insert error:", insertError);
      return NextResponse.json({ error: "Failed to save voice directive" }, { status: 500 });
    }

    // Smart Auto-Population: If slots or offerings were generated from the voice instruction
    let autoPopulatedRows: any[] = [];
    if (Array.isArray(analysis.auto_populated_items) && analysis.auto_populated_items.length > 0) {
      const itemsToInsert = analysis.auto_populated_items.map((raw: any, idx: number) => ({
        user_id: user.id,
        organization_id: orgId,
        title: raw.title || `Operational Slot ${idx + 1}`,
        category: raw.category || "appointment_slots",
        identifier_code: raw.identifier_code || `AUTO-${Date.now().toString().slice(-4)}-${idx + 1}`,
        available_units: Number(raw.available_units) || 1,
        base_price_inr: raw.base_price_inr !== undefined && raw.base_price_inr !== null ? Number(raw.base_price_inr) : null,
        minimum_price_inr: raw.minimum_price_inr !== undefined && raw.minimum_price_inr !== null ? Number(raw.minimum_price_inr) : null,
        booking_slot_start: raw.booking_slot_start || null,
        booking_slot_end: raw.booking_slot_end || null,
        status: "available",
        metadata: {
          ...(raw.metadata || {}),
          auto_generated_from_directive_id: newDirective?.id,
          source_voice_transcript: transcript
        }
      }));

      const { data: insertedSlots, error: slotsError } = await admin
        .from("business_operations_catalog")
        .insert(itemsToInsert)
        .select();

      if (!slotsError && insertedSlots) {
        autoPopulatedRows = insertedSlots;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        directive: newDirective,
        analysis,
        auto_populated_items: autoPopulatedRows
      }
    });
  } catch (err: any) {
    console.error("[VoiceDirective] Error in POST:", err);
    return NextResponse.json({ error: err?.message || "Failed to process voice directive" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { authenticated, profile, user, error } = await authenticateRequest();
    if (!authenticated || !profile || !user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const { id, is_active } = body || {};

    if (!id) {
      return NextResponse.json({ error: "Directive ID required" }, { status: 400 });
    }

    const admin = getAdminClient();
    const status = is_active ? "available" : "reserved";

    const { data, error: updateError } = await admin
      .from("business_operations_catalog")
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: "Failed to update directive status" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to toggle directive" }, { status: 500 });
  }
}
