import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { invalidateCache } from "@/lib/redis";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service credentials not configured");
  }
  return createAdminClient(url, key);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authenticated, profile, error } = await authenticateRequest();
    if (!authenticated || !profile) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { full_name, email, company, tags, notes, phone_number } = payload;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;
    if (company !== undefined) updates.company = company;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];
    if (notes !== undefined) updates.notes = notes;
    if (phone_number !== undefined) {
      let cleanPhone = String(phone_number).replace(/\D/g, "");
      if (cleanPhone.length > 10) {
        if (cleanPhone.startsWith("91") && cleanPhone.length === 12) {
          cleanPhone = cleanPhone.slice(2);
        } else if (cleanPhone.startsWith("0") && cleanPhone.length === 11) {
          cleanPhone = cleanPhone.slice(1);
        }
      }
      if (cleanPhone.length >= 10) {
        updates.phone_number = cleanPhone;
      }
    }

    const isSuperAdmin = profile.role === "super_admin" || profile.role === "admin";
    const supabaseAdmin = getAdminClient();

    let query = supabaseAdmin
      .from("customer_contacts")
      .update(updates)
      .eq("id", id);

    if (!isSuperAdmin && profile.organization_id) {
      query = query.eq("organization_id", profile.organization_id);
    }

    const { data: customer, error: dbError } = await query
      .select()
      .single();

    if (dbError) {
      console.error('[API] Database Error updating customer:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Invalidate customer list cache after update
    const orgId = profile.organization_id || '';
    await invalidateCache(`customers:${orgId}:*`);

    return NextResponse.json({ success: true, customer });

  } catch (err) {
    console.error('[API] Error in PATCH /api/customers/[id]:', err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authenticated, profile, error } = await authenticateRequest();
    if (!authenticated || !profile) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = profile.role === "super_admin" || profile.role === "admin";
    const supabaseAdmin = getAdminClient();

    let query = supabaseAdmin
      .from("customer_contacts")
      .delete()
      .eq("id", id);

    if (!isSuperAdmin && profile.organization_id) {
      query = query.eq("organization_id", profile.organization_id);
    }

    const { error: dbError } = await query;

    if (dbError) {
      console.error('[API] Database Error deleting customer:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Invalidate customer list cache after delete
    const orgId = profile.organization_id || '';
    await invalidateCache(`customers:${orgId}:*`);

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('[API] Error in DELETE /api/customers/[id]:', err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
