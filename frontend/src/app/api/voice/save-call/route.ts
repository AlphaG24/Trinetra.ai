import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { agent_id, transcript, duration, duration_seconds, sentiment } = body;

    const secs = duration_seconds || duration || 0;
    const fullTranscript = Array.isArray(transcript)
      ? transcript.map((t: any) => `${t.speaker || 'User'}: ${t.text || ''}`).join('\n')
      : String(transcript || '');

    let detectedSentiment = sentiment || 'neutral';
    if (!sentiment && fullTranscript) {
      const lower = fullTranscript.toLowerCase();
      if (lower.includes('thank') || lower.includes('yes') || lower.includes('great') || lower.includes('good')) {
        detectedSentiment = 'positive';
      } else if (lower.includes('cancel') || lower.includes('no') || lower.includes('bad') || lower.includes('error')) {
        detectedSentiment = 'negative';
      }
    }

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const callRecord: Record<string, any> = {
      user_id: user.id,
      agent_id: agent_id || 'demo-agent',
      caller_phone: 'SANDBOX',
      caller_name: 'Browser Test Call',
      status: 'completed',
      duration_seconds: secs,
      transcript: fullTranscript || 'No transcript generated.',
      sentiment: detectedSentiment,
      is_test_call: true,
      started_at: new Date(Date.now() - secs * 1000).toISOString(),
      ended_at: new Date().toISOString(),
      metadata: {
        provider: 'sarvam',
        is_sandbox: true
      }
    };

    const { data, error } = await adminClient
      .from('voice_calls')
      .insert(callRecord)
      .select()
      .single();

    if (error) {
      console.error("[Save Call API] Error inserting into voice_calls:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("[Save Call API] Catch Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
