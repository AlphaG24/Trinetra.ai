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

// GET: List all numbers in pool
export async function GET() {
  try {
    const { authenticated, profile } = await authenticateRequest();

    if (!authenticated || !profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "admin" && profile.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const adminClient = getAdminClient();
    const { data: poolNumbers, error } = await adminClient
      .from("phone_number_pool")
      .select(`
        *,
        assigned_organization:organizations(id, name, slug),
        assigned_agent:agents(id, name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Admin Phone Numbers] Fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch phone number pool" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: poolNumbers || []
    });
  } catch (err: any) {
    console.error("[Admin Phone Numbers] GET Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Add number(s) to pool (Single or Array from CSV)
export async function POST(request: Request) {
  try {
    const { authenticated, profile } = await authenticateRequest();

    if (!authenticated || !profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "admin" && profile.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Support single item or array of items (CSV import)
    const numbersInput = Array.isArray(body.numbers)
      ? body.numbers
      : Array.isArray(body)
      ? body
      : [body];

    if (numbersInput.length === 0) {
      return NextResponse.json({ error: "No numbers provided" }, { status: 400 });
    }

    const rowsToInsert = [];
    for (const num of numbersInput) {
      if (!num.phone_number) {
        continue;
      }

      // Format clean phone number
      const cleanPhone = String(num.phone_number).trim();

      rowsToInsert.push({
        phone_number: cleanPhone,
        country: num.country || "IN",
        city: num.city || "Mumbai",
        did_type: num.did_type || "mobile",
        provider: num.provider || "voicelink",
        monthly_cost_paisa: num.monthly_cost_paisa ? parseInt(num.monthly_cost_paisa, 10) : 10000,
        retail_price_paisa: num.retail_price_paisa ? parseInt(num.retail_price_paisa, 10) : 29900,
        status: "available"
      });
    }

    if (rowsToInsert.length === 0) {
      return NextResponse.json({ error: "No valid phone numbers to add" }, { status: 400 });
    }

    const adminClient = getAdminClient();
    const { data: inserted, error } = await adminClient
      .from("phone_number_pool")
      .upsert(rowsToInsert, { onConflict: "phone_number" })
      .select();

    if (error) {
      console.error("[Admin Phone Numbers] Insert error:", error);
      return NextResponse.json({ error: "Failed to insert numbers into pool" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: inserted?.length || 0,
      data: inserted
    });
  } catch (err: any) {
    console.error("[Admin Phone Numbers] POST Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: Update number details (e.g. retail price, status, city, did_type)
export async function PATCH(request: Request) {
  try {
    const { authenticated, profile } = await authenticateRequest();

    if (!authenticated || !profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "admin" && profile.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.id) {
      return NextResponse.json({ error: "Missing number ID" }, { status: 400 });
    }

    const { id, retail_price_paisa, monthly_cost_paisa, city, did_type, provider, status } = body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (retail_price_paisa !== undefined) updates.retail_price_paisa = parseInt(retail_price_paisa, 10);
    if (monthly_cost_paisa !== undefined) updates.monthly_cost_paisa = parseInt(monthly_cost_paisa, 10);
    if (city !== undefined) updates.city = city;
    if (did_type !== undefined) updates.did_type = did_type;
    if (provider !== undefined) updates.provider = provider;
    if (status !== undefined) updates.status = status;

    const adminClient = getAdminClient();
    const { data: updated, error } = await adminClient
      .from("phone_number_pool")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Admin Phone Numbers] Update error:", error);
      return NextResponse.json({ error: "Failed to update phone number" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (err: any) {
    console.error("[Admin Phone Numbers] PATCH Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Remove unassigned number from pool
export async function DELETE(request: Request) {
  try {
    const { authenticated, profile } = await authenticateRequest();

    if (!authenticated || !profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "admin" && profile.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing number ID parameter" }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // Verify status before deleting
    const { data: existing } = await adminClient
      .from("phone_number_pool")
      .select("status")
      .eq("id", id)
      .single();

    if (existing && existing.status === "assigned") {
      return NextResponse.json({ error: "Cannot delete an assigned phone number" }, { status: 400 });
    }

    const { error } = await adminClient
      .from("phone_number_pool")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Admin Phone Numbers] Delete error:", error);
      return NextResponse.json({ error: "Failed to remove phone number" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Phone number removed from pool"
    });
  } catch (err: any) {
    console.error("[Admin Phone Numbers] DELETE Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
