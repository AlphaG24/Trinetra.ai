import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const range = parseInt(searchParams.get('range') || '30', 10)
    const agentId = searchParams.get('agent_id')

    // 1. Get profile organization info
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    const orgId = profile?.organization_id

    // Date limit
    const limitDate = new Date()
    limitDate.setDate(limitDate.getDate() - range)
    limitDate.setHours(0, 0, 0, 0)
    const dateLimitStr = limitDate.toISOString()

    // Query voice calls
    let callsQuery = supabase
      .from('voice_calls')
      .select('id, created_at, duration_seconds, sentiment, status, outcome, caller_phone, caller_name, agent_id, transcript, recording_url')
      .gte('created_at', dateLimitStr)

    callsQuery = callsQuery.or(`organization_id.eq.${orgId || user.id},user_id.eq.${user.id}`)

    if (agentId && agentId !== 'all') {
      callsQuery = callsQuery.eq('agent_id', agentId)
    }

    // Query leads
    let leadsQuery = supabase
      .from('leads')
      .select('id, created_at, status, lead_score, interest_level, agent_id')
      .gte('created_at', dateLimitStr)
      .eq('user_id', user.id)

    if (agentId && agentId !== 'all') {
      leadsQuery = leadsQuery.eq('agent_id', agentId)
    }

    // Query agents list to resolve agent names
    const { data: agents } = await supabase
      .from('agents')
      .select('id, name')

    const agentMap: Record<string, string> = (agents || []).reduce((acc: any, cur: any) => {
      acc[cur.id] = cur.name
      return acc
    }, {})

    // Execute queries parallel
    const [callsRes, leadsRes] = await Promise.all([
      callsQuery.order('created_at', { ascending: false }),
      leadsQuery.order('created_at', { ascending: false })
    ])

    const now = Date.now()
    const validCalls = (callsRes.data || []).filter((c: any) => {
      const isZeroDuration = !c.duration_seconds || c.duration_seconds === 0
      const hasTranscript = !!(c.transcript && (typeof c.transcript === 'string' ? c.transcript.trim().length > 0 : Array.isArray(c.transcript) && c.transcript.length > 0))
      const ageMs = now - new Date(c.created_at).getTime()
      
      // If still marked in_progress with 0s duration and older than 3 minutes, it never connected
      if (c.status === 'in_progress' && isZeroDuration && ageMs > 180000) {
        return false
      }
      // If failed with 0 duration and no transcript, it never connected
      if (c.status === 'failed' && isZeroDuration && !hasTranscript) {
        return false
      }
      return true
    })

    const calls = validCalls
    const leads = leadsRes.data || []

    // 2. Aggregate KPIs
    const totalCalls = calls.length
    const totalSeconds = calls.reduce((acc, call) => acc + (call.duration_seconds || 0), 0)
    const totalMinutes = Math.round(totalSeconds / 60)
    const avgDuration = totalCalls > 0 ? parseFloat(((totalSeconds / totalCalls) / 60).toFixed(2)) : 0
    const leadsGenerated = leads.length

    // 3. Compute Call Volume Chart Data (by date)
    // We want a complete sequence of dates in the range, mapping dates to count
    const dateCounts: Record<string, number> = {}
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      dateCounts[dateStr] = 0
    }

    calls.forEach((c) => {
      const dateStr = c.created_at.split('T')[0]
      if (dateCounts[dateStr] !== undefined) {
        dateCounts[dateStr]++
      }
    })

    const callVolume = Object.entries(dateCounts).map(([date, count]) => ({
      date,
      count,
    }))

    // 4. Compute Sentiment Chart Data
    let pos = 0, neu = 0, neg = 0
    calls.forEach((c) => {
      const s = (c.sentiment || '').toLowerCase()
      if (s === 'positive') pos++
      else if (s === 'negative') neg++
      else neu++
    })

    const sentiment = [
      { name: 'Positive', value: pos },
      { name: 'Neutral', value: neu },
      { name: 'Negative', value: neg },
    ]

    // 5. Compute Lead Funnel Chart Data
    // stages: New -> Contacted -> Qualified -> Hot -> Converted
    const funnelStages = { New: 0, Contacted: 0, Qualified: 0, Hot: 0, Converted: 0 }
    leads.forEach((l) => {
      const s = (l.status || '').toLowerCase()
      if (s === 'converted' || s === 'closed') funnelStages.Converted++
      else if (s === 'hot' || s === 'nurturing') funnelStages.Hot++
      else if (s === 'qualified' || s === 'verified') funnelStages.Qualified++
      else if (s === 'contacted' || s === 'engaged') funnelStages.Contacted++
      else funnelStages.New++
    })

    const leadFunnel = Object.entries(funnelStages).map(([stage, count]) => ({
      stage,
      count,
    }))

    // 6. Compute Calls by Agent
    const agentCounts: Record<string, number> = {}
    calls.forEach((c) => {
      const name = c.agent_id ? (agentMap[c.agent_id] || 'Unknown Agent') : 'Direct Dial'
      agentCounts[name] = (agentCounts[name] || 0) + 1
    })

    const callsByAgent = Object.entries(agentCounts).map(([agentName, count]) => ({
      agentName,
      count,
    }))

    // 7. Recent Calls list
    const recentCalls = calls.slice(0, 50).map((c: any) => ({
      id: c.id,
      created_at: c.created_at,
      agent_name: c.agent_id ? (agentMap[c.agent_id] || 'Unknown Agent') : 'Direct Dial',
      duration_seconds: c.duration_seconds || 0,
      sentiment: c.sentiment || 'Neutral',
      outcome: c.outcome || (c.status === 'completed' ? 'Completed' : c.status || 'Completed'),
      is_lead: c.outcome === 'Lead Captured' || c.outcome === 'Callback Scheduled' || leads.some((l: any) => l.call_id === c.id || (l.agent_id === c.agent_id && Math.abs(new Date(l.created_at).getTime() - new Date(c.created_at).getTime()) < 3600000)),
      caller_phone: c.caller_phone || 'Private',
      caller_name: c.caller_name || null,
      transcript: c.transcript || null,
      recording_url: c.recording_url || null,
    }))

    return NextResponse.json({
      kpis: { totalCalls, totalMinutes, avgDuration, leadsGenerated },
      callVolume,
      sentiment,
      leadFunnel,
      callsByAgent,
      recentCalls,
    })
  } catch (err: any) {
    console.error('[/api/dashboard/analytics GET] Exception:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
