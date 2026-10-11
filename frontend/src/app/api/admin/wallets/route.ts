import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET: Return aggregated global wallet statistics
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminClient = getAdminClient()

    // 1. Fetch all wallets
    const { data: wallets, error: wErr } = await adminClient
      .from('wallets')
      .select('id, balance_paisa, current_spend_paisa, organization_id')

    if (wErr) {
      console.error('[admin/wallets GET] Error querying wallets:', wErr)
      return NextResponse.json({ error: wErr.message }, { status: 500 })
    }

    const totalWallets = wallets?.length || 0
    const totalBalancePaisa = wallets?.reduce((acc, w) => acc + (Number(w.balance_paisa) || 0), 0) || 0
    const totalSpendPaisa = wallets?.reduce((acc, w) => acc + (Number(w.current_spend_paisa) || 0), 0) || 0

    // 2. Fetch total active tenant count
    const { count: tenantCount } = await adminClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .neq('role', 'super_admin')

    return NextResponse.json({
      total_wallets: totalWallets,
      total_balance_paisa: totalBalancePaisa,
      total_spend_paisa: totalSpendPaisa,
      total_tenants: tenantCount || totalWallets
    })
  } catch (error: any) {
    console.error('[admin/wallets GET] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

// POST: Disburse global wallet credit to tenants
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin or Super Admin role required' }, { status: 403 })
    }

    const body = await request.json()
    const amountPaisa = Number(body.amount_paisa)

    if (isNaN(amountPaisa) || amountPaisa <= 0) {
      return NextResponse.json({ error: 'Please enter a valid credit amount greater than ₹0' }, { status: 400 })
    }

    const targetScope = body.target_scope || 'all' // 'all' | 'existing' | 'paid'
    const reason = body.reason?.trim() || `Global admin promotional grant of ₹${(amountPaisa / 100).toLocaleString('en-IN')}`

    const adminClient = getAdminClient()
    const nowIso = new Date().toISOString()

    let targetOrgIds: string[] = []

    if (targetScope === 'existing') {
      // All organizations that already have a wallet
      const { data: existingWallets } = await adminClient
        .from('wallets')
        .select('organization_id')

      targetOrgIds = (existingWallets || [])
        .map(w => w.organization_id)
        .filter((id): id is string => Boolean(id))
    } else if (targetScope === 'paid') {
      // Organizations with paid profiles (starter or professional)
      const { data: paidProfiles } = await adminClient
        .from('profiles')
        .select('organization_id')
        .in('plan_tier', ['starter', 'professional', 'enterprise'])

      targetOrgIds = Array.from(
        new Set(
          (paidProfiles || [])
            .map(p => p.organization_id)
            .filter((id): id is string => Boolean(id))
        )
      )
    } else {
      // 'all': All organizations or active profiles
      const { data: orgs } = await adminClient
        .from('organizations')
        .select('id')

      if (orgs && orgs.length > 0) {
        targetOrgIds = orgs.map(o => o.id)
      } else {
        // Fallback to profile organization_id or profile IDs
        const { data: profs } = await adminClient
          .from('profiles')
          .select('id, organization_id')
          .neq('role', 'super_admin')

        targetOrgIds = Array.from(
          new Set(
            (profs || [])
              .map(p => p.organization_id || p.id)
              .filter((id): id is string => Boolean(id))
          )
        )
      }
    }

    if (targetOrgIds.length === 0) {
      return NextResponse.json({
        success: true,
        credited_count: 0,
        total_disbursed_paisa: 0,
        message: 'No eligible tenant organizations found for selected target scope.'
      })
    }

    let creditedCount = 0

    // Process disbursement in batches
    for (const orgId of targetOrgIds) {
      try {
        const { data: currentWallet } = await adminClient
          .from('wallets')
          .select('id, balance_paisa')
          .eq('organization_id', orgId)
          .maybeSingle()

        let newBalance = amountPaisa

        if (currentWallet) {
          newBalance = (Number(currentWallet.balance_paisa) || 0) + amountPaisa
          await adminClient
            .from('wallets')
            .update({
              balance_paisa: newBalance,
              last_topup_at: nowIso,
              updated_at: nowIso
            })
            .eq('id', currentWallet.id)
        } else {
          await adminClient
            .from('wallets')
            .insert({
              organization_id: orgId,
              balance_paisa: amountPaisa,
              currency: 'INR',
              spend_limit_paisa: 250000,
              current_spend_paisa: 0,
              reliability_score: 85,
              emergency_minutes_available: 0,
              last_topup_at: nowIso,
              created_at: nowIso,
              updated_at: nowIso
            })
        }

        // Ledger transaction
        try {
          await adminClient
            .from('wallet_transactions')
            .insert({
              organization_id: orgId,
              amount_paisa: amountPaisa,
              type: 'admin_global_credit',
              reference_id: `global_adj_${Date.now()}_${creditedCount}`,
              balance_after_paisa: newBalance,
              description: reason,
              created_at: nowIso
            })
        } catch (txErr) {
          console.warn('[admin/wallets POST] Transaction logging skipped:', txErr)
        }

        creditedCount++
      } catch (itemErr) {
        console.warn(`[admin/wallets POST] Failed crediting org ${orgId}:`, itemErr)
      }
    }

    // Record Audit Log
    try {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        user_role: profile.role,
        action: 'admin.global_wallet_credit_disbursed',
        resource_type: 'wallets',
        new_values: {
          amount_paisa: amountPaisa,
          target_scope: targetScope,
          reason,
          credited_tenants: creditedCount,
          total_disbursed_paisa: creditedCount * amountPaisa
        }
      })
    } catch {}

    return NextResponse.json({
      success: true,
      credited_count: creditedCount,
      total_disbursed_paisa: creditedCount * amountPaisa,
      message: `Successfully credited ₹${(amountPaisa / 100).toLocaleString('en-IN')} to ${creditedCount} tenant wallets!`
    })
  } catch (error: any) {
    console.error('[admin/wallets POST] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
