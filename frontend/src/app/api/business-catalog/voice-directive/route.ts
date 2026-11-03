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
  const systemPrompt = `You are the AI Business Brain Operations Specialist for Trinetra AI.
The business owner has provided a verbal instruction or operational update in Hindi, Hinglish, or English.
Examples:
1. "Aaj mai 10 baje se 4 bje tak salon open rakhunga to us time ke according he appointements lena"
   -> Goal: Limit appointment booking strictly to 10:00 AM - 4:00 PM today.
2. "Aaj mai shop close rakhunga so aaj ki saari appointement kal schedule karo aur us hisab se karna"
   -> Goal: Shop is closed today. Reschedule/decline today's appointments, offer tomorrow onwards.
3. "aaj mere paas koi gaadi nhi hai par products available hai to aur koi product mat lena sirf gadi ki jarurat hai"
   -> Goal: 0 transport vehicles/trucks available. Do not accept vehicle bookings; inform callers and seek truck providers.

Your job is to analyze the user's spoken words and return a structured JSON response:
{
  "title": "Short, clear human-readable title (e.g. 'Operating Hours: 10:00 AM - 4:00 PM Today' or 'Shop Closed Today - Reschedule to Tomorrow')",
  "prompt_override": "A direct, imperative instruction for the AI voice agent answering live calls. State clearly what the bot must tell callers, what slots to book, and what limits to enforce.",
  "category": "appointment_slots | inventory | logistics | general",
  "action_type": "hours_update | closure_reschedule | inventory_zero | rule_override",
  "summary_hindi": "One sentence summary in simple Hindi/Hinglish",
  "mutations": {
    "zero_out_category": "logistics | inventory | null",
    "mark_closed": boolean,
    "slot_start": "string or null",
    "slot_end": "string or null"
  }
}

OUTPUT RULES:
- Output ONLY valid JSON. No markdown codeblocks. No introductory text.`;

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
        status: "available", // "available" means active
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

    return NextResponse.json({
      success: true,
      data: {
        directive: newDirective,
        analysis
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
    const status = is_active ? "available" : "reserved"; // "available" = active in call prompt, "reserved" = paused

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

