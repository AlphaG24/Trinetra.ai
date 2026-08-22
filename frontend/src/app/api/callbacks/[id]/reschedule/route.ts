import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { authenticated, profile, user, error, supabase } = await authenticateRequest();
    if (!authenticated) {
      return NextResponse.json({ error }, { status: 401 });
    }
    if (!profile?.organization_id) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const payload = await request.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { scheduled_at, reason } = payload;

    if (!scheduled_at) {
      return NextResponse.json({ error: "New scheduled time is required" }, { status: 400 });
    }

    if (new Date(scheduled_at) <= new Date()) {
      return NextResponse.json({ error: "New scheduled time must be in the future" }, { status: 400 });
    }

    // Verify ownership of the callback
    const { data: callback, error: fetchError } = await supabase
      .from("callbacks")
      .select("*")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .maybeSingle();

    if (fetchError || !callback) {
      return NextResponse.json({ error: "Callback not found or unauthorized" }, { status: 404 });
    }

    // Append reschedule note to notes field
    const timestampStr = new Date().toLocaleString();
    const reasonSuffix = reason ? ` (Reason: ${reason})` : "";
    const rescheduleNote = `\n[Rescheduled on ${timestampStr} to ${new Date(scheduled_at).toLocaleString()}${reasonSuffix}]`;
    const updatedNotes = (callback.notes || "") + rescheduleNote;

    const { data: updatedCallback, error: updateError } = await supabase
      .from("callbacks")
      .update({
        scheduled_at,
        attempt_count: 0,
        notes: updatedNotes,
        status: "scheduled", // reset back to scheduled if it was in missed/cancelled
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error('[API] Database Error rescheduling callback:', updateError);
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
    }

    // Write to activity log
    await supabase.from("activity_log").insert({
      user_id: user.id,
      organization_id: profile.organization_id,
      activity_type: "callback_rescheduled",
      title: "Callback Rescheduled",
      description: `Rescheduled callback for ${callback.prospect_phone} to ${new Date(scheduled_at).toLocaleString()}`
    });

    return NextResponse.json({
      success: true,
      data: {
        callback: updatedCallback
      }
    });

  } catch (err) {
    console.error('[API] Error in POST /api/callbacks/[id]/reschedule:', err);
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 });
  }
}
