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

export async function GET(request: Request) {
  try {
    const { authenticated, profile, user, error } = await authenticateRequest();
    if (!authenticated || !profile || !user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const isPrivileged = [
      'developer_tester', 'admin', 'super_admin'
    ].includes(profile.role || '') ||
      ['raghav00424@gmail.com', 'raghav@trinetra.ai'].includes((profile.email || '').toLowerCase().trim());

    const admin = getAdminClient();

    let query = admin
      .from("business_operations_catalog")
      .select("*")
      .order("created_at", { ascending: false });

    // Strict tenant isolation (SEC-004)
    if (!isPrivileged) {
      if (profile.organization_id) {
        query = query.or(`organization_id.eq.${profile.organization_id},user_id.eq.${user.id}`);
      } else {
        query = query.eq("user_id", user.id);
      }
    }

    if (category && category !== "all" && category !== "All") {
      query = query.eq("category", category.toLowerCase());
    }

    if (status && status !== "all" && status !== "All") {
      query = query.eq("status", status.toLowerCase());
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,identifier_code.ilike.%${search}%,route_origin.ilike.%${search}%,route_destination.ilike.%${search}%`);
    }

    const { data: items, error: dbError } = await query;

    if (dbError) {
      console.error("[API] Database Error fetching business operations catalog:", dbError);
      return NextResponse.json({ success: true, data: { items: [] } });
    }

    return NextResponse.json({
      success: true,
      data: {
        items: items || []
      }
    });
  } catch (err: any) {
    console.error("[API] Error in GET /api/business-catalog:", err);
    return NextResponse.json({ success: true, data: { items: [] } });
  }
}

export async function POST(request: Request) {
  try {
    const { authenticated, profile, user, error } = await authenticateRequest();
    if (!authenticated || !profile || !user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const {
      title,
      category = "general",
      identifier_code,
      route_origin,
      route_destination,
      available_units = 1,
      base_price_inr,
      minimum_price_inr,
      booking_slot_start,
      booking_slot_end,
      status = "available",
      metadata = {}
    } = payload;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Item title is required" }, { status: 400 });
    }

    const admin = getAdminClient();
    const orgId = profile.organization_id || null;

    const { data: newItem, error: insertError } = await admin
      .from("business_operations_catalog")
      .insert({
        user_id: user.id,
        organization_id: orgId,
        title: title.trim(),
        category: category.toLowerCase().trim(),
        identifier_code: identifier_code ? identifier_code.trim() : null,
        route_origin: route_origin ? route_origin.trim() : null,
        route_destination: route_destination ? route_destination.trim() : null,
        available_units: Number(available_units) || 1,
        base_price_inr: base_price_inr !== undefined && base_price_inr !== null ? Number(base_price_inr) : null,
        minimum_price_inr: minimum_price_inr !== undefined && minimum_price_inr !== null ? Number(minimum_price_inr) : null,
        booking_slot_start: booking_slot_start || null,
        booking_slot_end: booking_slot_end || null,
        status: status.toLowerCase().trim(),
        metadata: metadata || {}
      })
      .select()
      .single();

    if (insertError) {
      console.error("[API] Error inserting into business_operations_catalog:", insertError);
      return NextResponse.json({ error: "Failed to create catalog entry" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: newItem
    });
  } catch (err: any) {
    console.error("[API] Error in POST /api/business-catalog:", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { authenticated, profile, user, error } = await authenticateRequest();
    if (!authenticated || !profile || !user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json().catch(() => null);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Item ID is required for updates" }, { status: 400 });
    }

    const { id, ...fieldsToUpdate } = payload;
    const admin = getAdminClient();

    // Verify ownership or privileged status
    const isPrivileged = [
      'developer_tester', 'admin', 'super_admin'
    ].includes(profile.role || '') ||
      ['raghav00424@gmail.com', 'raghav@trinetra.ai'].includes((profile.email || '').toLowerCase().trim());

    let matchQuery = admin.from("business_operations_catalog").select("id, user_id, organization_id").eq("id", id);
    if (!isPrivileged) {
      if (profile.organization_id) {
        matchQuery = matchQuery.or(`organization_id.eq.${profile.organization_id},user_id.eq.${user.id}`);
      } else {
        matchQuery = matchQuery.eq("user_id", user.id);
      }
    }

    const { data: existing, error: fetchErr } = await matchQuery.single();
    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Catalog item not found or unauthorized" }, { status: 404 });
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (fieldsToUpdate.title !== undefined) updatePayload.title = fieldsToUpdate.title.trim();
    if (fieldsToUpdate.category !== undefined) updatePayload.category = fieldsToUpdate.category.toLowerCase().trim();
    if (fieldsToUpdate.identifier_code !== undefined) updatePayload.identifier_code = fieldsToUpdate.identifier_code?.trim() || null;
    if (fieldsToUpdate.route_origin !== undefined) updatePayload.route_origin = fieldsToUpdate.route_origin?.trim() || null;
    if (fieldsToUpdate.route_destination !== undefined) updatePayload.route_destination = fieldsToUpdate.route_destination?.trim() || null;
    if (fieldsToUpdate.available_units !== undefined) updatePayload.available_units = Number(fieldsToUpdate.available_units);
    if (fieldsToUpdate.base_price_inr !== undefined) updatePayload.base_price_inr = fieldsToUpdate.base_price_inr !== null ? Number(fieldsToUpdate.base_price_inr) : null;
    if (fieldsToUpdate.minimum_price_inr !== undefined) updatePayload.minimum_price_inr = fieldsToUpdate.minimum_price_inr !== null ? Number(fieldsToUpdate.minimum_price_inr) : null;
    if (fieldsToUpdate.booking_slot_start !== undefined) updatePayload.booking_slot_start = fieldsToUpdate.booking_slot_start;
    if (fieldsToUpdate.booking_slot_end !== undefined) updatePayload.booking_slot_end = fieldsToUpdate.booking_slot_end;
    if (fieldsToUpdate.status !== undefined) updatePayload.status = fieldsToUpdate.status.toLowerCase().trim();
    if (fieldsToUpdate.metadata !== undefined) updatePayload.metadata = fieldsToUpdate.metadata;

    const { data: updatedItem, error: updateErr } = await admin
      .from("business_operations_catalog")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      console.error("[API] Error updating business_operations_catalog:", updateErr);
      return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: updatedItem
    });
  } catch (err: any) {
    console.error("[API] Error in PUT /api/business-catalog:", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { authenticated, profile, user, error } = await authenticateRequest();
    if (!authenticated || !profile || !user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const isPrivileged = [
      'developer_tester', 'admin', 'super_admin'
    ].includes(profile.role || '') ||
      ['raghav00424@gmail.com', 'raghav@trinetra.ai'].includes((profile.email || '').toLowerCase().trim());

    const admin = getAdminClient();

    let deleteQuery = admin.from("business_operations_catalog").delete().eq("id", id);
    if (!isPrivileged) {
      if (profile.organization_id) {
        deleteQuery = deleteQuery.or(`organization_id.eq.${profile.organization_id},user_id.eq.${user.id}`);
      } else {
        deleteQuery = deleteQuery.eq("user_id", user.id);
      }
    }

    const { error: delError } = await deleteQuery;
    if (delError) {
      console.error("[API] Error deleting business_operations_catalog item:", delError);
      return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Item deleted successfully"
    });
  } catch (err: any) {
    console.error("[API] Error in DELETE /api/business-catalog:", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
