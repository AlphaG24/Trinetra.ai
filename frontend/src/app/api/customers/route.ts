import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service credentials not configured");
  }
  return createAdminClient(url, key);
}

export async function GET(request: Request) {
  try {
    const { authenticated, profile, error } = await authenticateRequest();
    if (!authenticated || !profile) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const tag = searchParams.get("tag");

    const isSuperAdmin = profile.role === "super_admin" || profile.role === "admin";
    const supabaseAdmin = getAdminClient();

    let query = supabaseAdmin
      .from("customer_contacts")
      .select("*");

    // Regular users are strictly scoped to their own organization.
    // Super admins can see all contacts, or optionally filter by requested organization_id.
    if (!isSuperAdmin) {
      if (!profile.organization_id) {
        return NextResponse.json({ success: true, customers: [] });
      }
      query = query.eq("organization_id", profile.organization_id);
    } else if (searchParams.get("organization_id")) {
      query = query.eq("organization_id", searchParams.get("organization_id")!);
    }

    if (tag && tag !== "all") {
      query = query.contains("tags", [tag]);
    }

    const { data: customers, error: dbError } = await query
      .order("created_at", { ascending: false });

    if (dbError) {
      console.error('[API] Database Error fetching customers:', dbError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    let filtered = customers || [];
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((c: any) => 
        c.full_name?.toLowerCase().includes(s) ||
        c.phone_number?.toLowerCase().includes(s) ||
        c.company?.toLowerCase().includes(s) ||
        c.notes?.toLowerCase().includes(s)
      );
    }

    return NextResponse.json({
      success: true,
      customers: filtered
    });

  } catch (err) {
    console.error('[API] Error in GET /api/customers:', err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { authenticated, profile, error } = await authenticateRequest();
    if (!authenticated || !profile) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const targetOrgId = profile.organization_id || "b1ddf1e9-abc1-4ff4-90f5-3ac66913738a";

    const payload = await request.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();

    // 1. Bulk Upsert Mode
    if (payload.contacts && Array.isArray(payload.contacts)) {
      const contactsToUpsert = payload.contacts.map((c: any) => {
        let phone = String(c.phone_number || c.phone || "").replace(/\D/g, "");
        if (phone.length > 10) {
          if (phone.startsWith("91") && phone.length === 12) {
            phone = phone.slice(2);
          } else if (phone.startsWith("0") && phone.length === 11) {
            phone = phone.slice(1);
          }
        }
        return {
          organization_id: targetOrgId,
          phone_number: phone,
          full_name: c.full_name || c.name || "Unknown",
          email: c.email || null,
          company: c.company || null,
          tags: Array.isArray(c.tags) ? c.tags : (c.tags ? String(c.tags).split(",").map((t: string) => t.trim()) : []),
          notes: c.notes || null,
          import_source: c.import_source || "csv",
          updated_at: new Date().toISOString()
        };
      }).filter((c: any) => c.phone_number.length >= 10);

      if (contactsToUpsert.length === 0) {
        return NextResponse.json({ error: "No valid contacts found. Make sure phone numbers are at least 10 digits." }, { status: 400 });
      }

      const { data, error: upsertError } = await supabaseAdmin
        .from("customer_contacts")
        .upsert(contactsToUpsert, { onConflict: "organization_id,phone_number" })
        .select();

      if (upsertError) {
        console.error('[API] Database Error during bulk upsert:', upsertError);
        return NextResponse.json({ error: upsertError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, count: data?.length || 0 });
    }

    // 2. Single Contact Upsert Mode
    const { phone_number, full_name, email, company, tags, notes, import_source } = payload;
    
    let phone = String(phone_number || "").replace(/\D/g, "");
    if (phone.length > 10) {
      if (phone.startsWith("91") && phone.length === 12) {
        phone = phone.slice(2);
      } else if (phone.startsWith("0") && phone.length === 11) {
        phone = phone.slice(1);
      }
    }

    if (!phone || phone.length < 10) {
      return NextResponse.json({ error: "Invalid phone number. Must be at least 10 digits." }, { status: 400 });
    }

    const { data, error: dbError } = await supabaseAdmin
      .from("customer_contacts")
      .upsert({
        organization_id: targetOrgId,
        phone_number: phone,
        full_name: full_name || "Unknown",
        email: email || null,
        company: company || null,
        tags: Array.isArray(tags) ? tags : [],
        notes: notes || null,
        import_source: import_source || "manual",
        updated_at: new Date().toISOString()
      }, { onConflict: "organization_id,phone_number" })
      .select()
      .single();

    if (dbError) {
      console.error('[API] Database Error inserting customer:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, customer: data });

  } catch (err) {
    console.error('[API] Error in POST /api/customers:', err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
