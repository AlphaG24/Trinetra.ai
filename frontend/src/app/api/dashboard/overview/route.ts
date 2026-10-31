import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cached } from '@/lib/redis'

export async function GET() {
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    const hasAuthCookie = allCookies.some(c => c.name.includes('auth-token') || c.name.startsWith('sb-'))
    if (!hasAuthCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    let user: any = null
    try {
      const authPromise = supabase.auth.getUser().catch(() => ({ data: { user: null } }))
      const timeoutPromise = new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error('Auth timeout')), 3000)
      )
      const authRes = await Promise.race([authPromise, timeoutPromise])
      user = authRes?.data?.user ?? null
    } catch {
      user = null
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const cacheKey = `dashboard:overview:${user.id}`

    const result = await cached(cacheKey, async () => {
      // 1. Profile & Agents
      const { data: profile } = await admin
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle()
        
      const orgId = profile?.organization_id

      const userEmail = (user.email || '').toLowerCase().trim()
      const isSuperAdmin = userEmail === 'raghav00424@gmail.com' || userEmail === 'raghav@trinetra.ai'
      const effectiveOrgId = orgId || (isSuperAdmin ? 'b1ddf1e9-abc1-4ff4-90f5-3ac66913738a' : null)

      let agentQuery = admin
        .from('agents')
        .select('id, name, agent_type, status, last_active_at, updated_at, health_score')
      if (effectiveOrgId) {
        agentQuery = agentQuery.or(`user_id.eq.${user.id},organization_id.eq.${effectiveOrgId}`)
      } else {
        agentQuery = agentQuery.eq('user_id', user.id)
      }

      const { data: userAgents } = await agentQuery
        
      const agents = userAgents || []
      const agentIds = agents.map(a => a.id)

      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      
      // IST midnight for "today" boundary (UTC+5:30)
      const nowUtc = new Date()
      const istOffsetMs = 5.5 * 60 * 60 * 1000
      const nowIst = new Date(nowUtc.getTime() + istOffsetMs)
      const today = new Date(
        Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate()) - istOffsetMs
      )

      // Build Queries
      let callsQuery = admin
        .from('voice_calls')
        .select('id', { count: 'estimated', head: true })
        .gte('created_at', startOfMonth.toISOString())
        
      if (effectiveOrgId) {
        callsQuery = callsQuery.or(`organization_id.eq.${effectiveOrgId},user_id.eq.${user.id}`)
      } else {
        callsQuery = callsQuery.eq('user_id', user.id)
      }

      let interactionsQuery: any = null
      if (effectiveOrgId || agentIds.length > 0) {
        interactionsQuery = admin
          .from('interactions')
          .select('id', { count: 'estimated', head: true })
          .gte('created_at', startOfMonth.toISOString())
          
        if (effectiveOrgId) {
          interactionsQuery = interactionsQuery.eq('organization_id', effectiveOrgId)
        } else {
          interactionsQuery = interactionsQuery.in('agent_id', agentIds)
        }
      }

      let activeToolsQuery = admin
        .from('agents')
        .select('id', { count: 'estimated', head: true })
        .in('status', ['live', 'active'])
        
      if (effectiveOrgId) {
        activeToolsQuery = activeToolsQuery.or(`organization_id.eq.${effectiveOrgId},user_id.eq.${user.id}`)
      } else {
        activeToolsQuery = activeToolsQuery.eq('user_id', user.id)
      }

      let totalLeadsQuery = admin
        .from('leads')
        .select('id', { count: 'estimated', head: true })
      if (effectiveOrgId) {
        totalLeadsQuery = totalLeadsQuery.or(`user_id.eq.${user.id},organization_id.eq.${effectiveOrgId}`)
      } else {
        totalLeadsQuery = totalLeadsQuery.eq('user_id', user.id)
      }
        
      let convertedLeadsQuery = admin
        .from('leads')
        .select('id', { count: 'estimated', head: true })
        .or('status.in.(converted,won,qualified),stage.in.(converted,won,qualified)')
      if (effectiveOrgId) {
        convertedLeadsQuery = convertedLeadsQuery.or(`user_id.eq.${user.id},organization_id.eq.${effectiveOrgId}`)
      } else {
        convertedLeadsQuery = convertedLeadsQuery.eq('user_id', user.id)
      }

      // 2. Activity Query (Strictly live activities from the last 6 hours, max 10)
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      const activityQuery = admin
        .from('activity_log')
        .select('id, activity_type, channel, title, description, reference_id, reference_type, metadata, created_at')
        .eq('user_id', user.id)
        .gte('created_at', sixHoursAgo)
        .order('created_at', { ascending: false })
        .limit(10)

      // 3. Tools calls for today
      let toolsCallsQuery = admin
        .from('voice_calls')
        .select('agent_id')
        .gte('created_at', today.toISOString())
      if (effectiveOrgId) {
        toolsCallsQuery = toolsCallsQuery.or(`user_id.eq.${user.id},organization_id.eq.${effectiveOrgId}`)
      } else {
        toolsCallsQuery = toolsCallsQuery.eq('user_id', user.id)
      }

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
        name: (agent.name || 'Agent')
          .replace(/^\[[^\]]+\]\s*/, '')
          .replace(/\s*-\s*Demo\s*$/i, '')
          .replace(/\s*-\s*Trial\s*$/i, '')
          .trim() || 'Agent',
        agent_type: agent.agent_type || 'voice',
        status: agent.status || 'draft',
        calls_today: callsTodayMap[agent.id] || 0,
        last_active_at: agent.last_active_at || agent.updated_at || new Date().toISOString(),
        health_score: agent.health_score !== null && agent.health_score !== undefined ? agent.health_score : 100
      }))

      return { stats, activity, tools }
    }, 60) // 60s TTL

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[/api/dashboard/overview] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
