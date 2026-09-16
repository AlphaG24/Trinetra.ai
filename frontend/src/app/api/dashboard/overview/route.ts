import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { cached } from '@/lib/redis'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cacheKey = `dashboard:overview:${user.id}`

    const result = await cached(cacheKey, async () => {
      // 1. Profile & Agents
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle()
        
      const orgId = profile?.organization_id

      const { data: userAgents } = await supabase
        .from('agents')
        .select('id, name, agent_type, status, last_active_at, updated_at, health_score')
        .eq('user_id', user.id)
        
      const agents = userAgents || []
      const agentIds = agents.map(a => a.id)

      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Build Queries
      let callsQuery = supabase
        .from('voice_calls')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString())
        
      if (orgId) {
        callsQuery = callsQuery.eq('organization_id', orgId)
      } else {
        callsQuery = callsQuery.eq('user_id', user.id)
      }

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

      let activeToolsQuery = supabase
        .from('agents')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'live')
        
      if (orgId) {
        activeToolsQuery = activeToolsQuery.eq('organization_id', orgId)
      } else {
        activeToolsQuery = activeToolsQuery.eq('user_id', user.id)
      }

      const totalLeadsQuery = supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        
      const convertedLeadsQuery = supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'converted')

      // 2. Activity Query
      const activityQuery = supabase
        .from('activity_log')
        .select('id, activity_type, channel, title, description, reference_id, reference_type, metadata, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      // 3. Tools calls for today
      const toolsCallsQuery = supabase
        .from('voice_calls')
        .select('agent_id')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())

      // Exec parallel
      const [
        callsRes,
        interactionsRes,
        activeToolsRes,
        totalLeadsRes,
        convertedLeadsRes,
        activityRes,
        toolsCallsRes
      ] = await Promise.all([
        callsQuery,
        interactionsQuery ? interactionsQuery : Promise.resolve({ count: 0 }),
        activeToolsQuery,
        totalLeadsQuery,
        convertedLeadsQuery,
        activityQuery,
        toolsCallsQuery
      ])

      // Compile Stats
      const totalInteractions = (callsRes.count || 0) + (interactionsRes.count || 0)
      const activeToolsCount = activeToolsRes.count || 0
      const leadsGenerated = totalLeadsRes.count || 0
      const convertedLeads = convertedLeadsRes.count || 0
      const conversionRate = leadsGenerated > 0 ? Math.round((convertedLeads / leadsGenerated) * 100) : 0

      const stats = {
        totalInteractions,
        activeTools: activeToolsCount,
        leadsGenerated,
        conversionRate
      }

      // Compile Activities
      const activity = activityRes.data || []

      // Compile Tools Health
      const callsTodayMap: Record<string, number> = {}
      toolsCallsRes.data?.forEach((c: any) => {
        if (c.agent_id) callsTodayMap[c.agent_id] = (callsTodayMap[c.agent_id] || 0) + 1
      })

      const tools = agents.map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        agent_type: agent.agent_type || 'voice',
        status: agent.status || 'draft',
        calls_today: callsTodayMap[agent.id] || 0,
        last_active_at: agent.last_active_at || agent.updated_at || new Date().toISOString(),
        health_score: agent.health_score !== null && agent.health_score !== undefined ? agent.health_score : 100
      }))

      return { stats, activity, tools }
    }, 30) // 30s TTL

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[/api/dashboard/overview] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
