import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
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

    const updateFields: any = {};
    const { scheduled_at, status, notes, priority } = payload;

    if (scheduled_at) {
      if (new Date(scheduled_at) <= new Date()) {
        return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 });
      }
      updateFields.scheduled_at = scheduled_at;
    }

    if (status) {
      const allowedStatuses = ['scheduled', 'in_progress', 'completed', 'missed', 'cancelled'];
      if (!allowedStatuses.includes(status.toLowerCase())) {
        return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
      }
      updateFields.status = status.toLowerCase();

      if (status.toLowerCase() === 'completed') {
        updateFields.completed_at = new Date().toISOString();
      }
    }

    if (notes !== undefined) {
      updateFields.notes = notes;
    }

    if (priority) {
      const allowedPriorities = ['low', 'normal', 'high'];
      if (!allowedPriorities.includes(priority.toLowerCase())) {
        return NextResponse.json({ error: "Invalid priority value" }, { status: 400 });
      }
      updateFields.priority = priority.toLowerCase();
    }

    updateFields.updated_at = new Date().toISOString();

    const { data: updatedCallback, error: updateError } = await supabase
      .from("callbacks")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error('[API] Database Error updating callback:', updateError);
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
    }

    // Write to activity log
    let description = `Updated callback for ${callback.prospect_phone}`;
    if (status) {
      description += ` - Status changed to ${status}`;
    }

    await supabase.from("activity_log").insert({
      user_id: user.id,
      organization_id: profile.organization_id,
      activity_type: "callback_updated",
      title: "Callback Updated",
      description
    });

    return NextResponse.json({
      success: true,
      data: {
        callback: updatedCallback
      }
    });

  } catch (err) {
    console.error('[API] Error in PATCH /api/callbacks/[id]:', err);
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { authenticated, profile, user, error, supabase } = await authenticateRequest();
    if (!authenticated) {
      return NextResponse.json({ error }, { status: 401 });
    }
    if (!profile?.organization_id) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
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

    // Only allow deleting 'cancelled' or 'completed' callbacks
    if (callback.status === 'scheduled' || callback.status === 'in_progress') {
      return NextResponse.json({ error: "Cannot delete an active callback. Please cancel it first." }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from("callbacks")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error('[API] Database Error deleting callback:', deleteError);
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
    }

    // Write to activity log
    await supabase.from("activity_log").insert({
      user_id: user.id,
      organization_id: profile.organization_id,
      activity_type: "callback_deleted",
      title: "Callback Deleted",
      description: `Deleted callback record for ${callback.prospect_phone}`
    });

    return NextResponse.json({
      success: true,
      message: "Callback deleted successfully"
    });

  } catch (err) {
    console.error('[API] Error in DELETE /api/callbacks/[id]:', err);
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 });
  }
}
