import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rangeParam = searchParams.get('range') || 'this_month'
    
    // Resolve start and end date
    const now = new Date()
    let startDate: Date
    let endDate = now

    if (rangeParam === '7d' || rangeParam === '7') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (rangeParam === '30d' || rangeParam === '30') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    } else {
      // this_month default
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    // 1. Fetch user's organization if present
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, plan_tier')
      .eq('id', user.id)
      .maybeSingle()

    const orgId = profile?.organization_id
    const targetBusinessId = user.id

    // 2. Fetch revenue events for this business
    let revQuery = supabase
      .from('revenue_events')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (orgId) {
      revQuery = revQuery.or(`business_id.eq.${user.id},business_id.eq.${orgId}`)
    } else {
      revQuery = revQuery.eq('business_id', targetBusinessId)
    }

    const { data: events, error: revError } = await revQuery.order('created_at', { ascending: false })

    if (revError && revError.code !== 'PGRST116') {
      // Table might not be migrated on remote yet; handle gracefully
      console.warn('[Revenue API] Query error (table may not exist yet):', revError.message)
    }

    const safeEvents = events || []

    let estimatedPipeline = 0
    let confirmedRevenue = 0
    const revenueBySource: Record<string, number> = {
      inbound: 0,
      campaign: 0,
      callback: 0,
      reactivation: 0,
      referral: 0
    }
    const dealCounts = { open: 0, won: 0, lost: 0 }

    for (const ev of safeEvents) {
      const status = (ev.deal_status || 'open') as 'open' | 'won' | 'lost'
      if (dealCounts[status] !== undefined) {
        dealCounts[status]++
      }

      const src = (ev.source || 'inbound').toLowerCase()
      if (revenueBySource[src] === undefined) {
        revenueBySource[src] = 0
      }

      const qAmt = Number(ev.quoted_amount) || 0
      const wAmt = Number(ev.won_amount) || 0

      if (status === 'open') {
        estimatedPipeline += qAmt
      } else if (status === 'won') {
        const actual = wAmt > 0 ? wAmt : qAmt
        confirmedRevenue += actual
        revenueBySource[src] += actual
      }
    }

    // 3. Calculate amount paid by business to Trinetra
    let totalPaidToTrinetra = 0
    const { data: txs } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('status', 'success')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (txs && txs.length > 0) {
      totalPaidToTrinetra = txs.reduce((sum: number, tx: any) => sum + (Number(tx.amount) || 0), 0)
    } else {
      // Fallback estimate based on plan tier
      const tier = profile?.plan_tier || 'starter'
      const tierPrices: Record<string, number> = { starter: 999, pro: 2999, enterprise: 9999 }
      totalPaidToTrinetra = tierPrices[tier] || 999
    }

    const roiMultiplier = totalPaidToTrinetra > 0
      ? Number((confirmedRevenue / totalPaidToTrinetra).toFixed(1))
      : 0
    const roiPercentage = totalPaidToTrinetra > 0
      ? Number((((confirmedRevenue - totalPaidToTrinetra) / totalPaidToTrinetra) * 100).toFixed(1))
      : 0

    return NextResponse.json({
      estimatedPipeline: Math.round(estimatedPipeline),
      confirmedRevenue: Math.round(confirmedRevenue),
      totalPaidToTrinetra: Math.round(totalPaidToTrinetra),
      roiMultiplier,
      roiPercentage,
      revenueBySource,
      dealCounts,
      totalDeals: safeEvents.length,
      events: safeEvents.slice(0, 30),
      currency: 'INR',
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        range: rangeParam
      }
    })
  } catch (error: any) {
    console.error('[Revenue API Error]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
