import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

// GET: Retrieve non-custodial payout credentials for the caller's organization
export async function GET() {
  try {
    const { authenticated, user, profile, supabase, error } = await authenticateRequest();
    if (!authenticated || !user || !profile || !supabase) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const orgId = profile.organization_id;
    if (!orgId) {
      return NextResponse.json({ error: "No organization associated with this account." }, { status: 400 });
    }

    const { data, error: dbError } = await supabase
      .from("tenant_payout_credentials")
      .select(`
        id,
        organization_id,
        upi_id,
        payment_link_url,
        qr_code_url,
        bank_name,
        account_number_masked,
        ifsc_code,
        beneficiary_name,
        is_active,
        consent_attested,
        attested_at,
        created_at,
        updated_at
      `)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (dbError) {
      console.error("[GET /api/kyc/payout] DB Error:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      credentials: data || null
    });
  } catch (err: any) {
    console.error("[GET /api/kyc/payout] Exception:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// POST: Upsert non-custodial payout credentials
export async function POST(request: Request) {
  try {
    const { authenticated, user, profile, supabase, error } = await authenticateRequest();
    if (!authenticated || !user || !profile || !supabase) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const orgId = profile.organization_id;
    if (!orgId) {
      return NextResponse.json({ error: "No organization associated with this account." }, { status: 400 });
    }

    const body = await request.json();
    const {
      upi_id,
      payment_link_url,
      qr_code_url,
      bank_name,
      account_number,
      ifsc_code,
      beneficiary_name,
      is_active,
      consent_attested
    } = body;

    // Validate UPI ID format if provided (e.g., username@bank)
    if (upi_id && typeof upi_id === "string" && upi_id.trim()) {
      const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
      if (!upiRegex.test(upi_id.trim())) {
        return NextResponse.json({
          error: "Invalid UPI ID format. It must follow the standard VPA format (e.g. business@okhdfcbank or merchant@upi)."
        }, { status: 400 });
      }
    }

    // Validate Payment Link format if provided
    if (payment_link_url && typeof payment_link_url === "string" && payment_link_url.trim()) {
      if (!payment_link_url.trim().startsWith("https://")) {
        return NextResponse.json({
          error: "Payment Link must use a secure HTTPS protocol (e.g. https://rzp.io/l/...)."
        }, { status: 400 });
      }
    }

    // If enabling active in-call dispatches, consent attestation is required
    if (is_active && !consent_attested) {
      return NextResponse.json({
        error: "Affirmative consent attestation is required before enabling in-call payment requests."
      }, { status: 400 });
    }

    // Mask account number for safe display
    let maskedAccount = undefined;
    if (account_number && typeof account_number === "string" && account_number.trim()) {
      const cleanAcc = account_number.trim();
      const last4 = cleanAcc.slice(-4);
      maskedAccount = last4.padStart(cleanAcc.length, "•");
    }

    const payload: Record<string, any> = {
      organization_id: orgId,
      user_id: user.id,
      upi_id: upi_id ? upi_id.trim() : null,
      payment_link_url: payment_link_url ? payment_link_url.trim() : null,
      qr_code_url: qr_code_url ? qr_code_url.trim() : null,
      bank_name: bank_name ? bank_name.trim() : null,
      ifsc_code: ifsc_code ? ifsc_code.trim().toUpperCase() : null,
      beneficiary_name: beneficiary_name ? beneficiary_name.trim() : null,
      is_active: Boolean(is_active),
      consent_attested: Boolean(consent_attested),
      attested_at: consent_attested ? new Date().toISOString() : null,
      attestation_statement: consent_attested 
        ? "I confirm that these payment credentials belong to our verified legal entity and authorize Vaakriti AI to dispatch this link/QR upon caller request. [CONFIRM WITH A LAWYER]"
        : null,
      updated_at: new Date().toISOString()
    };

    if (maskedAccount) {
      payload.account_number_masked = maskedAccount;
      // In production with pgcrypto, account_number_encrypted would be encrypted
      payload.account_number_encrypted = maskedAccount;
    }

    // Upsert into tenant_payout_credentials
    const { data, error: upsertError } = await supabase
      .from("tenant_payout_credentials")
      .upsert(payload, { onConflict: "organization_id" })
      .select()
      .single();

    if (upsertError) {
      console.error("[POST /api/kyc/payout] Upsert Error:", upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    // Log compliance audit
    try {
      await supabase.from("audit_logs").insert({
        action: "payout_credentials.updated",
        organization_id: orgId,
        user_id: user.id,
        details: {
          has_upi: Boolean(upi_id),
          has_link: Boolean(payment_link_url),
          has_qr: Boolean(qr_code_url),
          has_bank: Boolean(bank_name),
          is_active: Boolean(is_active)
        }
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Non-custodial payout credentials saved successfully.",
      credentials: data
    });
  } catch (err: any) {
    console.error("[POST /api/kyc/payout] Exception:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

