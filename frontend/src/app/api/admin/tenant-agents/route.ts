import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Authenticate User
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Authorize Admin / Super Admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const adminClient = getAdminClient()

    // 3. Fetch all organizations
    const { data: orgs, error: orgsErr } = await adminClient
      .from('organizations')
      .select('id, name, legal_name, primary_email, created_at')
      .order('created_at', { ascending: false })

    if (orgsErr) {
      return NextResponse.json({ error: orgsErr.message }, { status: 500 })
    }

    // 4. Fetch all profiles, agents, knowledge docs, and phone numbers
    const [profilesRes, agentsRes, kbRes, phoneRes] = await Promise.all([
      adminClient.from('profiles').select('id, organization_id, full_name, email, company_name, business_type, business_description'),
      adminClient.from('agents').select('id, organization_id, user_id, name, phone_number, sarvam_agent_id, greeting_message, voice_id, language, system_prompt, status, created_at'),
      adminClient.from('agent_knowledge').select('id, agent_id, name, content_excerpt, file_url, status, created_at').order('created_at', { ascending: false }),
      adminClient.from('phone_numbers').select('id, phone_number, assigned_org_id, assigned_agent_id, organization_id, provider, status')
    ])

    const profilesByOrg: Record<string, any[]> = {}
    profilesRes.data?.forEach(p => {
      if (p.organization_id) {
        if (!profilesByOrg[p.organization_id]) profilesByOrg[p.organization_id] = []
        profilesByOrg[p.organization_id].push(p)
      }
    })

    const kbByAgent: Record<string, any[]> = {}
    kbRes.data?.forEach(k => {
      if (k.agent_id) {
        if (!kbByAgent[k.agent_id]) kbByAgent[k.agent_id] = []
        kbByAgent[k.agent_id].push(k)
      }
    })

    const phonesByOrg: Record<string, any[]> = {}
    phoneRes.data?.forEach(ph => {
      const orgId = ph.assigned_org_id || ph.organization_id
      if (orgId) {
        if (!phonesByOrg[orgId]) phonesByOrg[orgId] = []
        phonesByOrg[orgId].push(ph)
      }
    })

    const agentsByOrg: Record<string, any[]> = {}
    agentsRes.data?.forEach(ag => {
      if (ag.organization_id) {
        if (!agentsByOrg[ag.organization_id]) agentsByOrg[ag.organization_id] = []
        agentsByOrg[ag.organization_id].push({
          ...ag,
          knowledge_docs: kbByAgent[ag.id] || []
        })
      }
    })

    // 5. Structure payload per organization
    const tenants = (orgs || []).map(org => {
      const orgProfiles = profilesByOrg[org.id] || []
      const primaryProfile = orgProfiles[0] || {}
      const orgAgents = agentsByOrg[org.id] || []
      const orgPhones = phonesByOrg[org.id] || []

      return {
        id: org.id,
        name: org.name || primaryProfile.company_name || 'Unnamed Org',
        legal_name: org.legal_name,
        primary_email: org.primary_email || primaryProfile.email,
        company_name: primaryProfile.company_name || org.name,
        business_type: primaryProfile.business_type || 'General',
        business_description: primaryProfile.business_description || '',
        user_name: primaryProfile.full_name || '',
        user_id: primaryProfile.id,
        created_at: org.created_at,
        agents: orgAgents,
        phone_numbers: orgPhones
      }
    })

    return NextResponse.json({ success: true, tenants })
  } catch (err: any) {
    console.error('[Admin Tenant Agents GET Error]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate User
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Authorize Admin / Super Admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { agent_id, sarvam_agent_id, phone_number, organization_id, agent_name } = body

    if (!agent_id) {
      return NextResponse.json({ error: 'agent_id is required' }, { status: 400 })
    }

    const adminClient = getAdminClient()

    // 3. Update agent record
    const agentUpdates: Record<string, any> = {
      updated_at: new Date().toISOString()
    }
    if (sarvam_agent_id !== undefined) {
      agentUpdates.sarvam_agent_id = sarvam_agent_id ? sarvam_agent_id.trim() : null
    }
    if (phone_number !== undefined) {
      agentUpdates.phone_number = phone_number ? phone_number.trim() : null
    }

    const { error: agentUpdateErr } = await adminClient
      .from('agents')
      .update(agentUpdates)
      .eq('id', agent_id)

    if (agentUpdateErr) {
      return NextResponse.json({ error: `Agent update error: ${agentUpdateErr.message}` }, { status: 500 })
    }

    // 4. Update phone number assignment if provided
    if (phone_number) {
      const cleanPhone = phone_number.replace('+', '').trim()
      const last10 = cleanPhone.slice(-10)

      await adminClient
        .from('phone_numbers')
        .update({
          assigned_agent_id: agent_id,
          assigned_org_id: organization_id || null,
          is_assigned: true,
          updated_at: new Date().toISOString()
        })
        .or(`phone_number.eq.${phone_number},phone_number.eq.+${cleanPhone},phone_number.eq.${cleanPhone},phone_number.eq.${last10}`)
    }

    // 5. If both sarvam_agent_id and phone_number are present, trigger Sarvam telephony deployment link
    let telephonyNotice = null
    if (sarvam_agent_id && phone_number) {
      try {
        const backendUrl = process.env.INTERNAL_BACKEND_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'
        const linkRes = await fetch(`${backendUrl}/api/sarvam/link-deployment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_id,
            phone_number,
            name: `${agent_name || 'Agent'} Line`
          })
        })
        const linkJson = await linkRes.json()
        telephonyNotice = linkJson
      } catch (linkErr: any) {
        console.warn('[Sarvam Telephony Link Notice]', linkErr.message)
      }
    }

    // 6. Log admin activity
    await adminClient.from('activity_log').insert({
      user_id: user.id,
      organization_id: organization_id || null,
      activity_type: 'agent_sarvam_linked',
      title: 'Sarvam Voice Agent Linked',
      description: `Linked Sarvam App ID '${sarvam_agent_id || 'none'}' and phone '${phone_number || 'none'}' to agent ${agent_id}`
    })

    return NextResponse.json({
      success: true,
      message: 'Agent voice configuration and Sarvam assignment updated successfully.',
      telephony: telephonyNotice
    })
  } catch (err: any) {
    console.error('[Admin Tenant Agents POST Error]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
