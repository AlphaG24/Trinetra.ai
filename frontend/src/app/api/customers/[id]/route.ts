import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authenticated, profile, error, supabase } = await authenticateRequest();
    if (!authenticated) {
      return NextResponse.json({ error }, { status: 401 });
    }
    if (!profile?.organization_id) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const payload = await request.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { full_name, email, company, tags, notes } = payload;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;
    if (company !== undefined) updates.company = company;
    if (tags !== undefined) updates.tags = tags;
    if (notes !== undefined) updates.notes = notes;

    const { data: customer, error: dbError } = await supabase
      .from("customer_contacts")
      .update(updates)
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .select()
      .single();

    if (dbError) {
      console.error('[API] Database Error updating customer:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

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
    const { authenticated, profile, error, supabase } = await authenticateRequest();
    if (!authenticated) {
      return NextResponse.json({ error }, { status: 401 });
    }
    if (!profile?.organization_id) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const { error: dbError } = await supabase
      .from("customer_contacts")
      .delete()
      .eq("id", id)
      .eq("organization_id", profile.organization_id);

    if (dbError) {
      console.error('[API] Database Error deleting customer:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('[API] Error in DELETE /api/customers/[id]:', err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
