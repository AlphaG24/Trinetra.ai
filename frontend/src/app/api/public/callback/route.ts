import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json().catch(() => null)
    if (!body || !body.phone_number) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 })
    }

    const { phone_number, language } = body

    // 1. Resolve the demo agent ID and organization ID
    // Check system_config table first
    const { data: configData } = await supabaseAdmin
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'homepage_demo_agent_id')
      .maybeSingle()

    let agentId = configData?.config_value
    let organizationId = null

    if (agentId) {
      // Fetch organization_id for this agent
      const { data: agent } = await supabaseAdmin
        .from('agents')
        .select('organization_id')
        .eq('id', agentId)
        .maybeSingle()
      organizationId = agent?.organization_id
    }

    // Fallback: If not configured, fetch the first active agent owned by a 'developer_tester' user
    if (!agentId || !organizationId) {
      const { data: developerProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, organization_id')
        .eq('role', 'developer_tester')
        .limit(1)

      if (developerProfiles && developerProfiles.length > 0) {
        organizationId = developerProfiles[0].organization_id
        
        // Find the first agent of this developer
        const { data: developerAgents } = await supabaseAdmin
          .from('agents')
          .select('id')
          .eq('organization_id', organizationId)
          .limit(1)
        
        if (developerAgents && developerAgents.length > 0) {
          agentId = developerAgents[0].id
        }
      }
    }

    // Second Fallback: Query any demo agent in the database
    if (!agentId || !organizationId) {
      const { data: fallbackAgents } = await supabaseAdmin
        .from('agents')
        .select('id, organization_id')
        .or('is_demo.eq.true,name.ilike.%demo%')
        .limit(1)

      if (fallbackAgents && fallbackAgents.length > 0) {
        agentId = fallbackAgents[0].id
        organizationId = fallbackAgents[0].organization_id
      }
    }

    if (!agentId || !organizationId) {
      return NextResponse.json({ 
        error: 'Demo voice agent is currently offline. Please try again later.' 
      }, { status: 503 })
    }

    // 2. Call FastAPI telephony backend to trigger outbound call
    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    const backendResponse = await fetch(`${fastApiUrl}/api/telephony/outbound-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({
        to_phone: phone_number,
        agent_id: agentId,
        organization_id: organizationId
      })
    })

    const backendData = await backendResponse.json().catch(() => ({ detail: 'Outbound trigger failed' }))

    if (!backendResponse.ok) {
      console.error('[Public Callback Error] Backend failed:', backendData)
      return NextResponse.json({ 
        error: backendData.detail || 'Failed to place callback connection.' 
      }, { status: backendResponse.status })
    }

    // Record public demo callback logs in a dedicated audit structure or callback table if necessary
    try {
      await supabaseAdmin.from('audit_logs').insert({
        action: 'public.demo_callback_triggered',
        resource_type: 'outbound_call',
        new_values: { phone_number, language, agent_id: agentId }
      })
    } catch (logErr) {
      console.warn('Non-critical: Failed to write public callback audit log:', logErr)
    }

    return NextResponse.json({ success: true, message: 'Callback dial session initiated.' })

  } catch (error: any) {
    console.error('[Public Callback API Exception]:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
