import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const supabase = await createClient();

    // 1. Authenticate User
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;

    if (!file || !name) {
      return NextResponse.json({ error: "File and Name are required." }, { status: 400 });
    }

    // 2. Fetch ElevenLabs API key
    let apiKey = process.env.ELEVENLABS_API_KEY || '';
    const admin = createAdminClient();

    if (!apiKey) {
      try {
        const { data: configRecord } = await admin
          .from('system_config')
          .select('config_value')
          .eq('config_key', 'ELEVENLABS_API_KEY')
          .maybeSingle();
        if (configRecord?.config_value) {
          apiKey = configRecord.config_value;
        }
      } catch (err) {
        console.warn("[Voice Clone] Could not read ELEVENLABS_API_KEY from system_config:", err);
      }
    }

    if (!apiKey) {
      return NextResponse.json({ error: "ElevenLabs API key is not configured in the system." }, { status: 500 });
    }

    // 3. Call ElevenLabs voices/add API
    const elFormData = new FormData();
    elFormData.append("name", name.trim());
    elFormData.append("description", `Cloned voice for agent ${agentId} (${name.trim()})`);
    elFormData.append("files", file);

    const elResponse = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey
      },
      body: elFormData
    });

    if (!elResponse.ok) {
      const errDetail = await elResponse.text();
      console.error("[Voice Clone] ElevenLabs API error:", elResponse.status, errDetail);
      return NextResponse.json({
        error: `ElevenLabs voice cloning failed: ${errDetail || elResponse.statusText}`
      }, { status: elResponse.status });
    }

    const elData = await elResponse.json();
    const newVoiceId = elData.voice_id;

    if (!newVoiceId) {
      return NextResponse.json({ error: "ElevenLabs did not return a valid voice_id." }, { status: 500 });
    }

    // 4. Update agent's voice settings in Supabase
    const { error: updateError } = await admin
      .from('agents')
      .update({
        voice_provider: 'elevenlabs',
        voice_id: newVoiceId,
        cloned_voice_id: newVoiceId,
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId);

    if (updateError) {
      console.error("[Voice Clone] DB Update failed:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      voiceId: newVoiceId,
      voiceName: name.trim(),
      message: `Voice "${name.trim()}" successfully cloned and assigned to agent.`
    });
  } catch (error: any) {
    console.error("[Voice Clone] Catch Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
