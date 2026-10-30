import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/lib/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Verify admin role
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const userEmail = (user.email || '').toLowerCase().trim()
    const isSuperAdmin = userEmail === 'raghav00424@gmail.com' || userEmail === 'raghav@trinetra.ai'
    const isAdmin = isSuperAdmin || ['super_admin', 'admin', 'developer_tester'].includes(profile?.role || '')

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // 1. Fetch all revenue events
    const { data: events, error: evErr } = await admin
      .from('revenue_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (evErr) {
      console.error('[/api/admin/revenue] Query error:', evErr)
      return NextResponse.json({ error: evErr.message }, { status: 500 })
    }

    // 2. Fetch active payout vaults count
    const { count: activeVaultsCount } = await admin
      .from('tenant_payout_credentials')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('consent_attested', true)

    // 3. Fetch organizations map
    const { data: orgs } = await admin
      .from('organizations')
      .select('id, name')

    const orgMap: Record<string, string> = {}
    ;(orgs || []).forEach((o: any) => {
      orgMap[o.id] = o.name
    })

    // 4. Compute metrics
    let totalVerifiedGmv = 0
    let totalEstimatedPipeline = 0
    let totalWonDeals = 0
    let totalOpenQuotes = 0

    const enrichedEvents = (events || []).map((ev: any) => {
      const qAmt = Number(ev.quoted_amount) || 0
      const wAmt = Number(ev.won_amount) || 0

      if (ev.deal_status === 'won') {
        totalWonDeals += 1
        totalVerifiedGmv += wAmt > 0 ? wAmt : qAmt
      } else if (ev.deal_status === 'open') {
        totalOpenQuotes += 1
        totalEstimatedPipeline += qAmt
      }

      return {
        ...ev,
        organization: {
          name: orgMap[ev.business_id] || 'Purvi Roadlines'
        }
      }
    })

    const totalCommercialDeals = totalWonDeals + totalOpenQuotes
    const realizationRate = totalCommercialDeals > 0 ? (totalWonDeals / totalCommercialDeals) * 100 : 0

    return NextResponse.json({
      stats: {
        totalVerifiedGmv,
        totalEstimatedPipeline,
        totalWonDeals,
        totalOpenQuotes,
        realizationRate,
        activeVaultsCount: activeVaultsCount || 0
      },
      events: enrichedEvents
    })
  } catch (error: any) {
    console.error('[/api/admin/revenue GET] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

