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

export async function POST(request: Request) {
  try {
    const { authenticated, user, profile, error } = await authenticateRequest();

    if (!authenticated || !user || !profile) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    if (!profile.organization_id) {
      return NextResponse.json({ error: "User has no organization assigned" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.number_id) {
      return NextResponse.json({ error: "Missing number_id" }, { status: 400 });
    }

    const { number_id } = body;
    const adminClient = getAdminClient();

    // 1. Fetch phone number from phone_number_pool
    const { data: poolNumber, error: poolError } = await adminClient
      .from("phone_number_pool")
      .select("*")
      .eq("id", number_id)
      .single();

    if (poolError || !poolNumber) {
      return NextResponse.json({ error: "Selected phone number not found" }, { status: 404 });
    }

    if (poolNumber.status?.toLowerCase() !== "available" || poolNumber.is_assigned || poolNumber.assigned_organization_id) {
      return NextResponse.json({ error: "This phone number is already assigned to another organization" }, { status: 409 });
    }

    // 2. Load system payment configuration for Razorpay
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
    const basePricePaisa = poolNumber.retail_price_paisa || 29900;
    const taxPaisa = Math.round(basePricePaisa * 0.18);
    const totalAmountPaisa = basePricePaisa + taxPaisa;

    // 4. Create Razorpay order
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
        receipt: `num_pool_${user.id.substring(0, 6)}_${Date.now().toString().slice(-6)}`,
        notes: {
          user_id: user.id,
          organization_id: profile.organization_id,
          item_type: "number_pool",
          number_id: poolNumber.id,
          phone_number: poolNumber.phone_number
        }
      })
    });

    const order = await orderRes.json();
    if (!orderRes.ok) {
      console.error("[Purchase Number Pool] Razorpay order creation error:", order);
      return NextResponse.json({ error: "Failed to create payment order" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        key: keyId,
        order_id: order.id,
        amount: totalAmountPaisa,
        currency: "INR",
        number_id: poolNumber.id,
        phone_number: poolNumber.phone_number,
        user_email: user.email || "",
        user_name: profile.full_name || user.email || ""
      }
    });

  } catch (err: any) {
    console.error("[Purchase Number Pool] POST Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
