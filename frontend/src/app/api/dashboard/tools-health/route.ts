import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name, agent_type, status, last_active_at, updated_at, health_score')
      .eq('user_id', user.id)

    if (agentsError) {
      console.error('[/api/dashboard/tools-health] Supabase error:', agentsError)
      return NextResponse.json({ error: 'Failed to fetch tools' }, { status: 400 })
    }

    // Calculate start of today in local time / UTC
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Fetch voice calls for today
    const { data: calls } = await supabase
      .from('voice_calls')
      .select('agent_id')
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString())

    const callsTodayMap: Record<string, number> = {}
    calls?.forEach((c: any) => {
      if (c.agent_id) {
        callsTodayMap[c.agent_id] = (callsTodayMap[c.agent_id] || 0) + 1
      }
    })

    const tools = (agents || []).map((agent: any) => ({
      id: agent.id,
      name: agent.name,
      agent_type: agent.agent_type || 'voice',
      status: agent.status || 'draft',
      calls_today: callsTodayMap[agent.id] || 0,
      last_active_at: agent.last_active_at || agent.updated_at || new Date().toISOString(),
      health_score: agent.health_score !== null && agent.health_score !== undefined ? agent.health_score : 100
    }))

    return NextResponse.json({ tools })
  } catch (err: any) {
    console.error('[/api/dashboard/tools-health] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
