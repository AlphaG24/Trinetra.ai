import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Get profile organization info
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    const orgId = profile?.organization_id

    // Fetch user agents first to fallback on scoping
    const { data: userAgents } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
    
    const agentIds = (userAgents || []).map(a => a.id)

    // Calculate start of current month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // 2. Fetch Total Interactions (this month)
    // A: Voice Calls
    let callsQuery = supabase
      .from('voice_calls')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())
    
    if (orgId) {
      callsQuery = callsQuery.eq('organization_id', orgId)
    } else {
      callsQuery = callsQuery.eq('user_id', user.id)
    }

    // B: Text Interactions
    let interactionsQuery: any = null
    
    if (orgId || agentIds.length > 0) {
      interactionsQuery = supabase
        .from('interactions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString())
      
      if (orgId) {
        interactionsQuery = interactionsQuery.eq('organization_id', orgId)
      } else {
        interactionsQuery = interactionsQuery.in('agent_id', agentIds)
      }
    }

    // 3. Fetch Active Tools (status = 'live')
    let activeToolsQuery = supabase
      .from('agents')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'live')
    
    if (orgId) {
      activeToolsQuery = activeToolsQuery.eq('organization_id', orgId)
    } else {
      activeToolsQuery = activeToolsQuery.eq('user_id', user.id)
    }

    // 4. Fetch Leads Generated & Converted
    const totalLeadsQuery = supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const convertedLeadsQuery = supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'converted')

    // Execute queries in parallel
    const [
      callsRes,
      interactionsRes,
      activeToolsRes,
      totalLeadsRes,
      convertedLeadsRes
    ] = await Promise.all([
      callsQuery,
      interactionsQuery ? interactionsQuery : Promise.resolve({ count: 0 }),
      activeToolsQuery,
      totalLeadsQuery,
      convertedLeadsQuery
    ])

    const totalCalls = callsRes.count || 0
    const totalText = interactionsRes.count || 0
    const totalInteractions = totalCalls + totalText

    const activeTools = activeToolsRes.count || 0
    const leadsGenerated = totalLeadsRes.count || 0
    const convertedLeads = convertedLeadsRes.count || 0
    const conversionRate = leadsGenerated > 0 
      ? Math.round((convertedLeads / leadsGenerated) * 100) 
      : 0

    return NextResponse.json({
      totalInteractions,
      activeTools,
      leadsGenerated,
      conversionRate
    })
  } catch (err: any) {
    console.error('[/api/dashboard/stats] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
