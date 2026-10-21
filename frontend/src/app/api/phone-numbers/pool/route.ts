import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-helpers'
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { authenticated, profile, supabase } = await authenticateRequest()
    if (!authenticated || !profile || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = getAdminClient();

    // Retrieve only genuine platform pool numbers
    // Master Plan Section 18.7: Exclude any numbers owned by tenants, in grace_period, or in hold_period
    const { data: numbers, error } = await adminClient
      .from('phone_numbers')
      .select('*')
      .eq('is_assigned', false)
      .in('status', ['active', 'released'])
      .is('organization_id', null)
      .is('assigned_org_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Strictly exclude any BYON, Exotel, or personal integration numbers from the public pool
    const availableNumbers = (numbers || []).filter((n: any) => {
      const isByon = 
        n.source === 'byon' || 
        n.provider === 'exotel' || 
        n.provider === 'byon' || 
        Boolean(n.metadata?.byon) ||
        Boolean(n.metadata?.is_byon);
      return !isByon;
    });

    // Unallocated inventory numbers in the platform pool are available for assignment
    return NextResponse.json({ success: true, data: availableNumbers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
