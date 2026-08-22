import { createClient } from "@/utils/supabase/server";
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

    console.log(`[Voice Clone] Uploaded file: ${file.name} (${file.size} bytes) for agent ${agentId}`);

    // Generate a mock custom cloned voice ID
    const newVoiceId = `cloned-${Math.random().toString(36).substring(2, 11)}`;

    // Update agent's voice provider and voice ID
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        voice_provider: 'elevenlabs',
        voice_id: newVoiceId,
        cloned_voice_id: newVoiceId,
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error("[Voice Clone] DB Update failed:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      voiceId: newVoiceId,
      message: `Voice "${name}" successfully cloned and assigned to agent.`
    });
  } catch (error: any) {
    console.error("[Voice Clone] Catch Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
