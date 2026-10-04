import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = getAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    const orgId = profile?.organization_id
    if (!orgId) {
      return NextResponse.json({ error: 'No organization linked to profile' }, { status: 400 })
    }

    // Fetch or provision wallet
    const { data: wallet } = await adminClient
      .from('wallets')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle()

    const walletData = wallet || {
      organization_id: orgId,
      balance_paisa: 0,
      currency: 'INR',
      spend_limit_paisa: 250000,
      current_spend_paisa: 0,
      reliability_score: 85,
      emergency_minutes_available: 0,
      emergency_minutes_claimed_at: null,
      last_topup_at: null,
    }

    return NextResponse.json({
      success: true,
      wallet: {
        ...walletData,
        balance_inr: (walletData.balance_paisa || 0) / 100,
        spend_limit_inr: (walletData.spend_limit_paisa || 250000) / 100,
        current_spend_inr: (walletData.current_spend_paisa || 0) / 100,
      },
    })
  } catch (error: any) {
    console.error('Wallet GET error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = getAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    const orgId = profile?.organization_id
    if (!orgId) {
      return NextResponse.json({ error: 'No organization linked to profile' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const { action } = body

    if (action === 'claim_emergency_minutes') {
      const { data: wallet } = await adminClient
        .from('wallets')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle()

      const reliabilityScore = wallet?.reliability_score ?? 85
      if (reliabilityScore <= 80) {
        return NextResponse.json({
          error: `Reliability Score must exceed 80 to unlock emergency minutes (current: ${reliabilityScore}).`,
        }, { status: 403 })
      }

      // Check 30-day cooldown
      if (wallet?.emergency_minutes_claimed_at) {
        const lastClaimed = new Date(wallet.emergency_minutes_claimed_at).getTime()
        const daysSince = (Date.now() - lastClaimed) / (1000 * 60 * 60 * 24)
        if (daysSince < 30) {
          return NextResponse.json({
            error: `Emergency minutes can only be claimed once every 30 days. Please wait ${Math.ceil(30 - daysSince)} more days.`,
          }, { status: 429 })
        }
      }

      const nowIso = new Date().toISOString()
      await adminClient.from('wallets').upsert({
        organization_id: orgId,
        emergency_minutes_available: 50,
        emergency_minutes_claimed_at: nowIso,
        updated_at: nowIso,
      }, { onConflict: 'organization_id' })

      return NextResponse.json({
        success: true,
        message: '50 emergency minutes successfully claimed.',
        emergency_minutes_available: 50,
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Wallet POST error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
