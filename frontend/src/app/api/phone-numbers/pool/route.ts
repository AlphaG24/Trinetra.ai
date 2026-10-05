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

    // Retrieve only genuine unallocated, active inventory numbers from the pool
    // Master Plan Section 18.7: Exclude any numbers owned by tenants, in grace_period, or in hold_period
    const { data: availableNumbers, error } = await adminClient
      .from('phone_numbers')
      .select('*')
      .eq('is_assigned', false)
      .eq('status', 'active')
      .is('organization_id', null)
      .is('assigned_org_id', null)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter out any numbers whose pack validity has expired without renewal
    const now = new Date()
    const validPoolNumbers = (availableNumbers || []).filter((num: any) => {
      if (num.renewal_date && new Date(num.renewal_date) < now) return false;
      if (num.provisioned_at) {
        const provDate = new Date(num.provisioned_at);
        const validityDays = num.validity_days || 30;
        const expiryDate = new Date(provDate.getTime() + validityDays * 24 * 60 * 60 * 1000);
        if (now > expiryDate) return false;
      }
      return true;
    });

    return NextResponse.json({ success: true, data: validPoolNumbers })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
