import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Run all queries in parallel for performance
    const [
      agentsResult,
      callsResult,
      leadsResult,
      recentCallsResult,
    ] = await Promise.all([
      // Active agents count
      supabase.from('agents').select('id, name, status', { count: 'exact' }).eq('user_id', user.id),
      // Call logs for today + volume chart
      supabase.from('agent_call_logs')
        .select('id, duration_seconds, sentiment, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200),
      // Leads count
      supabase.from('leads').select('id, status, created_at', { count: 'exact' }).eq('user_id', user.id),
      // Recent 5 calls for activity feed
      supabase.from('agent_call_logs')
        .select('id, duration_seconds, sentiment, created_at, caller_number')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const agents = agentsResult.data || []
    const calls = callsResult.data || []
    const leads = leadsResult.data || []
    const recentCalls = recentCallsResult.data || []

    // KPI: Active agents
    const activeAgents = agents.filter((a: any) => a.status === 'active').length

    // KPI: Calls today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const callsToday = calls.filter((c: any) => new Date(c.created_at) >= today).length

    // KPI: New leads (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const newLeads = leads.filter((l: any) => new Date(l.created_at) >= sevenDaysAgo).length

    // Call volume chart — last 7 days
    const callVolumeData = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const dayLabel = date.toLocaleDateString('en-IN', { weekday: 'short' })
      const dayCount = calls.filter((c: any) => {
        const d = new Date(c.created_at)
        return d >= date && d < nextDate
      }).length

      callVolumeData.push({ day: dayLabel, calls: dayCount })
    }

    // Sentiment distribution
    const sentimentMap: Record<string, number> = { positive: 0, neutral: 0, negative: 0 }
    calls.forEach((c: any) => {
      const s = c.sentiment?.toLowerCase()
      if (s === 'positive') sentimentMap.positive++
      else if (s === 'negative') sentimentMap.negative++
      else sentimentMap.neutral++
    })

    const totalSentiment = Object.values(sentimentMap).reduce((a, b) => a + b, 0)
    const sentimentData = [
      { name: 'Positive', value: sentimentMap.positive, color: '#10B981' },
      { name: 'Neutral', value: sentimentMap.neutral, color: '#6B7280' },
      { name: 'Negative', value: sentimentMap.negative, color: '#EF4444' },
    ]

    // Recent activity feed
    const recentActivity = recentCalls.map((c: any) => ({
      id: c.id,
      type: 'call',
      duration: c.duration_seconds,
      sentiment: c.sentiment,
      caller: c.caller_number || 'Unknown',
      createdAt: c.created_at,
    }))

    return NextResponse.json({
      kpis: {
        activeAgents,
        callsToday,
        newLeads,
        totalCalls: calls.length,
        totalLeads: leads.length,
      },
      callVolumeData,
      sentimentData,
      recentActivity,
    })
  } catch (err: any) {
    console.error('[/api/analytics] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
