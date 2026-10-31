import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const { id: campaignId, contactId } = await params;
    const { authenticated, profile, error } = await authenticateRequest();
    if (!authenticated || !profile) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const admin = getAdminClient();

    // 1. Fetch contact details
    const { data: contact } = await admin
      .from("campaign_contacts")
      .select("id, campaign_id, full_name, phone, call_id, notes")
      .eq("id", contactId)
      .maybeSingle();

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    let transcript = null;
    let recordingUrl = null;
    let durationSeconds = undefined;
    let callRecord = null;

    // 2. Lookup call by call_id if present
    if (contact.call_id) {
      const { data: cById } = await admin
        .from("voice_calls")
        .select("*")
        .eq("id", contact.call_id)
        .maybeSingle();
      if (cById) callRecord = cById;
    }

    // 3. Fallback: Lookup by phone number
    if (!callRecord && contact.phone) {
      const cleanPhone = contact.phone.replace(/\D/g, "");
      const last10 = cleanPhone.slice(-10);
      if (last10) {
        const { data: cByPhone } = await admin
          .from("voice_calls")
          .select("*")
          .ilike("caller_phone", `%${last10}%`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cByPhone) callRecord = cByPhone;
      }
    }

    if (callRecord) {
      transcript = callRecord.transcript || callRecord.call_summary;
      recordingUrl = callRecord.recording_url;
      durationSeconds = callRecord.duration_seconds;
    } else {
      transcript = contact.notes || "No transcript recorded for this call yet.";
    }

    return NextResponse.json({
      success: true,
      data: {
        contact_id: contact.id,
        contact_name: contact.full_name,
        contact_phone: contact.phone,
        call_id: callRecord?.id || contact.call_id,
        transcript,
        recording_url: recordingUrl,
        duration_seconds: durationSeconds,
        call: callRecord
      }
    });
  } catch (err: any) {
    console.error("[GET contact transcript error]", err);
    return NextResponse.json({ error: err.message || "Failed to load transcript" }, { status: 500 });
  }
}
