import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/agents/[id]/disclosure-opt-out
 * ========================================
 * Logs owner acknowledgment and justification for recording notice exemptions
 * (e.g., in single-party consent jurisdictions or exempt verticals).
 *
 * LEGAL NOTICE:
 * [CONFIRM WITH A LAWYER] Exemption from two-party consent recording notices
 * depends on statutory single-party consent laws or specific regulatory exemptions.
 * Primary sources:
 * - 18 U.S. Code § 2511: https://www.law.cornell.edu/uscode/text/18/2511
 * - California Penal Code § 632: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=632.&lawCode=PEN
 * - India DPDP Act 2023: https://www.meity.gov.in/content/digital-personal-data-protection-act-2023
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const supabase = await createClient();

    // 1. Authenticate user (SEC-003, SEC-006)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { jurisdiction, reason, legal_confirmation_checked, lawyer_confirmed, lawyer_name, lawyer_bar_or_registration_number } = body;

    // Strict Rule: AI identity statement cannot be exempted under any circumstance
    if (body.ai_identity_exempt === true || body.exempt_ai_identity === true || body.disable_ai_identity === true) {
      return NextResponse.json(
        { error: "Prohibited: AI identity statement cannot be exempted under any circumstances. Only recording notice exemption may be requested." },
        { status: 400 }
      );
    }

    // 2. Validate input (SEC-005, API-002)
    if (!jurisdiction || typeof jurisdiction !== "string" || jurisdiction.trim().length === 0) {
      return NextResponse.json(
        { error: "Jurisdiction is required (e.g., 'US-TX', 'US-NY', 'IN-DL')" },
        { status: 400 }
      );
    }

    const cleanJur = jurisdiction.trim().toUpperCase();
    const isIndiaOrEU = (
      cleanJur.startsWith("IN") ||
      cleanJur === "INDIA" ||
      cleanJur.startsWith("EU") ||
      cleanJur === "EUROPE" ||
      ["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", 
       "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", 
       "SE", "SI", "SK", "GB", "UK"].some((c) => cleanJur === c || cleanJur.startsWith(`${c}-`))
    );

    // Disable by default for India and EU callers; unlock only through configuration marked 'lawyer confirmed'
    if (isIndiaOrEU) {
      if (lawyer_confirmed !== true || !lawyer_name || typeof lawyer_name !== "string" || lawyer_name.trim().length < 3) {
        return NextResponse.json(
          {
            error: "Recording notice exemption is disabled by default for callers in India and the European Union [CONFIRM WITH A LAWYER: Digital Personal Data Protection Act 2023 Sec 6 / EU GDPR Art 7]. To unlock, you must provide verified legal counsel confirmation ('lawyer_confirmed: true', 'lawyer_name', and bar/registration details).",
            jurisdiction: cleanJur,
            requires_lawyer_confirmation: true,
          },
          { status: 403 }
        );
      }
    }

    if (!reason || typeof reason !== "string" || reason.trim().length < 10) {
      return NextResponse.json(
        { error: "A valid legal or business rationale of at least 10 characters is required" },
        { status: 400 }
      );
    }

    if (legal_confirmation_checked !== true) {
      return NextResponse.json(
        { error: "Owner must explicitly confirm the legal acknowledgment checkbox" },
        { status: 400 }
      );
    }

    // 3. Verify agent ownership
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, user_id, disclosure_config")
      .eq("id", agentId)
      .eq("user_id", user.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: "Agent not found or unauthorized" }, { status: 404 });
    }

    // 4. Capture audit metadata
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // 5. Insert immutable audit log entry (SEC-004)
    const { error: logError } = await supabase
      .from("call_disclosure_opt_out_acknowledgments")
      .insert({
        agent_id: agentId,
        user_id: user.id,
        jurisdiction: jurisdiction.trim(),
        reason: reason.trim(),
        ip_address: ipAddress.split(",")[0].trim(),
        user_agent: userAgent,
        legal_confirmation_checked: true,
      });

    if (logError) {
      console.error("[Disclosure Opt-Out] Failed to record acknowledgment:", logError);
      return NextResponse.json({ error: "Failed to record compliance acknowledgment" }, { status: 500 });
    }

    // 6. Update agent's disclosure config (AI identity is NEVER exempted)
    const currentConfig = agent.disclosure_config || {};
    const updatedConfig = {
      ...currentConfig,
      ai_identity_enabled: true, // Permanent: AI identity disclosure can NEVER be disabled
      recording_notice_exempt: true,
      exemption_details: {
        jurisdiction: cleanJur,
        reason: reason.trim(),
        lawyer_confirmed: isIndiaOrEU ? true : Boolean(lawyer_confirmed),
        lawyer_name: lawyer_name || null,
        lawyer_bar_or_registration_number: lawyer_bar_or_registration_number || null,
        acknowledged_at: new Date().toISOString(),
      },
    };

    const { error: updateError } = await supabase
      .from("agents")
      .update({ disclosure_config: updatedConfig })
      .eq("id", agentId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[Disclosure Opt-Out] Failed to update agent config:", updateError);
      return NextResponse.json({ error: "Failed to update agent disclosure configuration" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Exemption acknowledgment successfully logged and applied.",
      disclosure_config: updatedConfig,
    });
  } catch (err: any) {
    console.error("[Disclosure Opt-Out] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
