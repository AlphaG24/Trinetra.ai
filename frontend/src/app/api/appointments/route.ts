import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import crypto from "crypto";

const SECRET_SEED = process.env.SUPABASE_SERVICE_ROLE_KEY || "default-secret-key-seed-value";
const ENCRYPTION_KEY = crypto.createHash("sha256").update(SECRET_SEED).digest();
const IV_LENGTH = 16;

function decrypt(text: string) {
  try {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift() || "", "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    return "";
  }
}

async function getTwilioCredentials(supabase: any) {
  try {
    const { data } = await supabase.from("integrations").select("*").limit(1);
    if (data && data.length > 0) {
      const row = data[0];
      const rawToken = row.whatsapp_access_token;
      if (rawToken) {
        const dec = decrypt(rawToken);
        if (dec && dec.startsWith("{")) {
          const parsed = JSON.parse(dec);
          if (parsed.twilio_sid && parsed.auth_token) {
            return {
              sid: parsed.twilio_sid,
              token: parsed.auth_token,
              from: parsed.phone_number || "+14155238886"
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn("[Appointments Notification] Error getting Twilio credentials:", err);
  }
  return null;
}

function normalizePhone(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "").trim();
  if (cleaned.startsWith("+")) return cleaned;
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return `+${digits}`;
}

async function sendAppointmentCustomerNotification({
  action,
  appointment,
  newScheduledAt,
  reason
}: {
  action: "accept" | "reject" | "reschedule";
  appointment: any;
  newScheduledAt?: string;
  reason?: string;
}) {
  const contactName = appointment.contact_name || "Valued Client";
  const firstName = contactName.split(" ")[0];
  const meetingType = appointment.meeting_type || "AI Voice Demo Consultation";
  const contactPhone = normalizePhone(appointment.contact_phone || "");
  const contactEmail = appointment.contact_email || "raghav00424@gmail.com";

  let scheduledDateStr = "Scheduled Session";
  try {
    const d = new Date(appointment.scheduled_at);
    scheduledDateStr = d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "short" });
  } catch {
    scheduledDateStr = appointment.scheduled_at || "Scheduled Session";
  }

  let newDateStr = "";
  if (newScheduledAt) {
    try {
      const d = new Date(newScheduledAt);
      newDateStr = d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "short" });
    } catch {
      newDateStr = newScheduledAt;
    }
  }

  let waBody = "";
  let emailSubject = "";
  let emailBody = "";

  if (action === "accept") {
    emailSubject = `✅ Appointment Confirmed: ${meetingType} | Trinetra AI`;
    emailBody = 
      `Hello ${firstName} ji,\n\n` +
      `Your appointment has been accepted and confirmed by our team.\n\n` +
      `📋 Appointment Details:\n` +
      `• Meeting: ${meetingType}\n` +
      `• Date & Time: ${scheduledDateStr} IST\n` +
      `• Client: ${contactName}\n` +
      `• Status: Confirmed\n\n` +
      `We look forward to speaking with you! If you need to make any changes, please feel free to reply to this email.\n\n` +
      `Best regards,\n` +
      `Trinetra AI Operations Team\nhttps://trinetraedu-ai.com`;

    waBody = 
      `✅ *Appointment Confirmed* | *Trinetra AI*\n\n` +
      `Hello ${firstName} ji,\n\n` +
      `Your appointment for *${meetingType}* has been accepted and confirmed.\n\n` +
      `⏰ *Time:* ${scheduledDateStr} IST\n` +
      `👤 *Client:* ${contactName}\n\n` +
      `We look forward to speaking with you! Feel free to reply directly to this message if you have any questions.\n\n` +
      `Warm regards,\n*Trinetra AI Team*`;
  } else if (action === "reject") {
    emailSubject = `Appointment Update: ${meetingType} | Trinetra AI`;
    emailBody = 
      `Hello ${firstName} ji,\n\n` +
      `Regarding your appointment request for ${meetingType} scheduled for ${scheduledDateStr} IST:\n\n` +
      `Unfortunately, our team is unable to accommodate this slot at this time and the appointment has been declined.\n` +
      (reason ? `Reason: ${reason}\n\n` : `\n`) +
      `If you would like to book a different date and time that works better for you, please visit https://trinetraedu-ai.com or reply directly to this email.\n\n` +
      `Best regards,\n` +
      `Trinetra AI Operations Team`;

    waBody = 
      `❌ *Appointment Update* | *Trinetra AI*\n\n` +
      `Hello ${firstName} ji,\n\n` +
      `Regarding your appointment for *${meetingType}* on ${scheduledDateStr} IST:\n\n` +
      `Unfortunately, our team is unable to accommodate this slot at this time and the appointment has been cancelled.\n` +
      (reason ? `_Note: ${reason}_\n\n` : `\n`) +
      `Please reply to this message if you would like to reschedule for an alternate time.\n\n` +
      `Warm regards,\n*Trinetra AI Team*`;
  } else if (action === "reschedule") {
    emailSubject = `🗓️ Appointment Rescheduled: ${meetingType} | Trinetra AI`;
    emailBody = 
      `Hello ${firstName} ji,\n\n` +
      `Your appointment for ${meetingType} has been rescheduled to a new time.\n\n` +
      `📅 New Date & Time: ${newDateStr} IST\n` +
      (reason ? `Reason / Note: ${reason}\n\n` : `\n`) +
      `If this new slot works for you, no further action is needed. If you would like to request another time, simply reply to this email.\n\n` +
      `Best regards,\n` +
      `Trinetra AI Operations Team\nhttps://trinetraedu-ai.com`;

    waBody = 
      `🗓️ *Appointment Rescheduled* | *Trinetra AI*\n\n` +
      `Hello ${firstName} ji,\n\n` +
      `Your appointment for *${meetingType}* has been rescheduled.\n\n` +
      `⏰ *New Date & Time:* ${newDateStr} IST\n` +
      (reason ? `_Note: ${reason}_\n\n` : `\n`) +
      `If this new time works for you, no action is needed. Reply to this message if you need any adjustments.\n\n` +
      `Warm regards,\n*Trinetra AI Team*`;
  }

  // 1. Send Email via Resend
  const resendKey = process.env.RESEND_API_KEY || process.env.RESEND_PRIVATE_KEY;
  if (resendKey && contactEmail) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "Trinetra AI <alerts@trinetraedu-ai.com>",
          to: [contactEmail],
          subject: emailSubject,
          text: emailBody
        })
      });
      console.log(`[Appointments Notification] Email delivered to ${contactEmail} for action: ${action}`);
    } catch (emailErr) {
      console.error("[Appointments Notification] Failed to send email:", emailErr);
    }
  }

  // 2. Send WhatsApp via Twilio
  const twilioCreds = await getTwilioCredentials(appointment.supabase);
  if (twilioCreds && contactPhone && contactPhone.length >= 10) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioCreds.sid}/Messages.json`;
      const params = new URLSearchParams();
      params.append("From", "whatsapp:+14155238886");
      params.append("To", `whatsapp:${contactPhone}`);
      params.append("Body", waBody);

      await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": "Basic " + Buffer.from(`${twilioCreds.sid}:${twilioCreds.token}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
      });
      console.log(`[Appointments Notification] WhatsApp delivered to ${contactPhone} for action: ${action}`);
    } catch (waErr) {
      console.error("[Appointments Notification] Failed to send WhatsApp:", waErr);
    }
  }
}

export async function GET(request: Request) {
  try {
    const { authenticated, profile, error, supabase } = await authenticateRequest();
    if (!authenticated || !profile) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const agent_id = searchParams.get("agent_id");
    const search = searchParams.get("search");
    const date = searchParams.get("date"); // YYYY-MM-DD

    let query = supabase
      .from("appointments")
      .select(`
        *,
        agent:agents (
          id,
          name
        )
      `)
      .eq("user_id", profile.id);

    if (status && status !== "all" && status !== "All") {
      query = query.eq("status", status.toLowerCase());
    }

    if (agent_id && agent_id !== "all" && agent_id !== "All") {
      query = query.eq("agent_id", agent_id);
    }

    if (search) {
      query = query.or(`contact_name.ilike.%${search}%,contact_phone.ilike.%${search}%,meeting_type.ilike.%${search}%`);
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);
      query = query.gte("scheduled_at", startOfDay.toISOString()).lte("scheduled_at", endOfDay.toISOString());
    }

    const { data: appointments, error: dbError } = await query
      .order("scheduled_at", { ascending: false });

    if (dbError) {
      console.error("[API] Error fetching appointments:", dbError);
      return NextResponse.json({ success: false, error: "Database error fetching appointments" }, { status: 500 });
    }

    // Compute stats
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const allList = appointments || [];
    const stats = {
      total_count: allList.length,
      scheduled_count: allList.filter((a: any) => a.status === 'scheduled' || a.status === 'confirmed').length,
      completed_count: allList.filter((a: any) => a.status === 'completed').length,
      cancelled_count: allList.filter((a: any) => a.status === 'cancelled').length,
      today_count: allList.filter((a: any) => {
        if (!a.scheduled_at) return false;
        const d = new Date(a.scheduled_at);
        return d >= todayStart && d <= todayEnd;
      }).length
    };

    return NextResponse.json({
      success: true,
      data: {
        appointments: allList,
        stats
      }
    });
  } catch (err: any) {
    console.error("[API] Unexpected error in appointments GET:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { authenticated, profile, error, supabase } = await authenticateRequest();
    if (!authenticated || !profile) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, scheduled_at, notes, action, reason } = body;

    if (!id) {
      return NextResponse.json({ error: "Appointment ID is required" }, { status: 400 });
    }

    // Fetch existing appointment
    const { data: existingAppt, error: findError } = await supabase
      .from("appointments")
      .select("*, agent:agents(name)")
      .eq("id", id)
      .eq("user_id", profile.id)
      .single();

    if (findError || !existingAppt) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    if (status) updates.status = status;
    if (scheduled_at) updates.scheduled_at = scheduled_at;
    if (notes !== undefined) updates.notes = notes;

    const { data: updatedAppt, error: updateError } = await supabase
      .from("appointments")
      .update(updates)
      .eq("id", id)
      .eq("user_id", profile.id)
      .select()
      .single();

    if (updateError) {
      console.error("[API] Error updating appointment:", updateError);
      return NextResponse.json({ success: false, error: "Failed to update appointment" }, { status: 500 });
    }

    // Dispatch real WhatsApp and Email notifications to the prospect
    if (action === "accept" || action === "reject" || action === "reschedule") {
      try {
        await sendAppointmentCustomerNotification({
          action,
          appointment: { ...existingAppt, supabase },
          newScheduledAt: scheduled_at,
          reason
        });
      } catch (notifErr) {
        console.warn("[API] Notification dispatch warning:", notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedAppt
    });
  } catch (err: any) {
    console.error("[API] Unexpected error in appointments PATCH:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { authenticated, profile, error, supabase } = await authenticateRequest();
    if (!authenticated || !profile) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Appointment ID is required" }, { status: 400 });
    }

    const { error: delError } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id)
      .eq("user_id", profile.id);

    if (delError) {
      console.error("[API] Error deleting appointment:", delError);
      return NextResponse.json({ success: false, error: "Failed to delete appointment" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Appointment deleted successfully"
    });
  } catch (err: any) {
    console.error("[API] Unexpected error in appointments DELETE:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
