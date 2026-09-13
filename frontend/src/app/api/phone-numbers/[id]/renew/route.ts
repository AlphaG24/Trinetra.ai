import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: phone_number_id } = await params;
    const { authenticated, user, profile, error, supabase } = await authenticateRequest();

    if (!authenticated || !user || !profile) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    if (!profile.organization_id) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // 1. Fetch phone number from phone_numbers table
    const { data: phoneRow, error: phoneError } = await supabase
      .from("phone_numbers")
      .select("*")
      .eq("id", phone_number_id)
      .single();

    if (phoneError || !phoneRow) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 });
    }

    const ownsNumber =
      phoneRow.organization_id === profile.organization_id ||
      phoneRow.assigned_org_id === profile.organization_id;

    if (!ownsNumber) {
      return NextResponse.json({ error: "Forbidden: You do not own this phone number" }, { status: 403 });
    }

    // 2. Load system payment configuration for Razorpay
    const adminClient = getAdminClient();
    const { data: configs } = await adminClient.from("system_config").select("config_key, config_value");
    const config: Record<string, string> = {};
    configs?.forEach((c) => {
      config[c.config_key] = c.config_value;
    });

    const keyId = config.razorpay_test_key_id || config.razorpay_key_id || process.env.RAZORPAY_KEY_ID;
    const keySecret = config.razorpay_test_key_secret || config.razorpay_key_secret || process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: "Payment gateway is not configured" }, { status: 500 });
    }

    // 3. Price calculation (retail_price_paisa + 18% GST)
    const basePricePaisa = phoneRow.retail_price_paisa || 29900;
    const taxPaisa = Math.round(basePricePaisa * 0.18);
    const totalAmountPaisa = basePricePaisa + taxPaisa;

    // 4. Create Razorpay order for renewal
    const authHeader = btoa(`${keyId}:${keySecret}`);
    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authHeader}`
      },
      body: JSON.stringify({
        amount: totalAmountPaisa,
        currency: "INR",
        receipt: `num_renew_${user.id.substring(0, 6)}_${Date.now().toString().slice(-6)}`,
        notes: {
          user_id: user.id,
          organization_id: profile.organization_id,
          item_type: "number_renewal",
          number_id: phoneRow.id,
          phone_number: phoneRow.phone_number
        }
      })
    });

    const order = await orderRes.json();
    if (!orderRes.ok) {
      console.error("[Renew Phone Number] Razorpay order creation error:", order);
      return NextResponse.json({ error: "Failed to create renewal payment order" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        key: keyId,
        order_id: order.id,
        amount: totalAmountPaisa,
        currency: "INR",
        number_id: phoneRow.id,
        phone_number: phoneRow.phone_number,
        user_email: user.email || "",
        user_name: profile.full_name || user.email || ""
      }
    });

  } catch (err: any) {
    console.error("[Renew Phone Number] POST Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
