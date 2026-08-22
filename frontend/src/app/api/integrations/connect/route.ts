import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { agent_id, integration_type_id, config } = await req.json()
    if (!agent_id || !integration_type_id || !config) {
      return NextResponse.json({ error: 'Missing parameters: agent_id, integration_type_id, config' }, { status: 400 })
    }

    // Get organization_id from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return NextResponse.json({ error: 'Failed to retrieve profile organization context' }, { status: 400 })
    }

    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'
    const res = await fetch(`${fastApiUrl}/api/integrations/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id,
        org_id: profile.organization_id,
        integration_type_id,
        config
      })
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Backend service returned ${res.status}` }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
