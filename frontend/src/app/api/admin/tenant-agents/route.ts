import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-helpers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function checkIsAdmin(user: any, profile: any): boolean {
  const userEmail = (user?.email || profile?.email || '').toLowerCase().trim()
  const isSuperAdminByEmail = 
    userEmail === 'raghav00424@gmail.com' || 
    userEmail === 'raghav@trinetra.ai' || 
    (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').includes(userEmail)
  
  const role = (profile?.role || user?.app_metadata?.role || user?.user_metadata?.role || '').toLowerCase().trim()
  return isSuperAdminByEmail || role === 'admin' || role === 'super_admin'
}

export async function GET() {
  try {
    const { authenticated, user, profile, error: authError } = await authenticateRequest()

    if (!authenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized: ' + (authError || 'Session required') }, { status: 401 })
    }

    if (!checkIsAdmin(user, profile)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const adminClient = getAdminClient()

    // 1. Fetch all organizations
    const { data: orgs, error: orgsErr } = await adminClient
      .from('organizations')
      .select('id, name, legal_name, primary_email, created_at')
      .order('created_at', { ascending: false })

    if (orgsErr) {
      return NextResponse.json({ error: orgsErr.message }, { status: 500 })
    }

    // 2. Fetch all profiles, agents, knowledge docs, and phone numbers in parallel
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

    // Construct enriched tenant models
    const enrichedTenants = (orgs || []).map(org => {
      const orgProfiles = profilesByOrg[org.id] || []
      const primaryProfile = orgProfiles[0] || null
      const orgAgents = agentsByOrg[org.id] || []
      const orgPhones = phonesByOrg[org.id] || []

      return {
        id: org.id,
        name: org.name || primaryProfile?.company_name || 'Unnamed Organization',
        legal_name: org.legal_name || null,
        primary_email: org.primary_email || primaryProfile?.email || null,
        company_name: primaryProfile?.company_name || org.name || null,
        business_type: primaryProfile?.business_type || null,
        business_description: primaryProfile?.business_description || null,
        user_name: primaryProfile?.full_name || null,
        user_id: primaryProfile?.id || null,
        created_at: org.created_at,
        agents: orgAgents,
        phone_numbers: orgPhones
      }
    })

    return NextResponse.json({
      success: true,
      tenants: enrichedTenants,
      count: enrichedTenants.length
    })
  } catch (err: any) {
    console.error('[Tenant Voice Agents API] Error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { authenticated, user, profile, error: authError } = await authenticateRequest()

    if (!authenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized: ' + (authError || 'Session required') }, { status: 401 })
    }

    if (!checkIsAdmin(user, profile)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { agent_id, sarvam_agent_id, phone_number, organization_id, agent_name } = body

    if (!agent_id) {
      return NextResponse.json({ error: 'agent_id is required' }, { status: 400 })
    }

    const adminClient = getAdminClient()

    // 1. Update agent record
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

    // 2. Update phone number assignment if provided
    if (phone_number) {
      const cleanPhone = phone_number.replace('+', '').trim()
      const last10 = cleanPhone.slice(-10)

      await adminClient
        .from('phone_numbers')
        .update({
          assigned_agent_id: agent_id,
          assigned_org_id: organization_id || null,
          organization_id: organization_id || null,
          is_assigned: true,
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .or(`phone_number.eq.${cleanPhone},phone_number.eq.+91${last10},phone_number.eq.${last10}`)
    }

    // 3. Register deployment carrier link with backend telephony service
    if (sarvam_agent_id && phone_number) {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        await fetch(`${backendUrl}/api/sarvam/link-deployment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sarvam_app_id: sarvam_agent_id.trim(),
            phone_number: phone_number.trim(),
            organization_id: organization_id || null,
            agent_id: agent_id
          })
        }).catch(err => console.warn('[Sarvam Telephony Link] Backend link notice:', err.message))
      } catch (linkErr: any) {
        console.warn('[Sarvam Telephony Link] Backend dispatch warning:', linkErr)
      }
    }

    // 4. Audit Log
    try {
      await adminClient.from('activity_log').insert({
        user_id: user.id,
        action: 'admin_linked_sarvam_agent',
        details: {
          agent_id,
          sarvam_agent_id,
          phone_number,
          organization_id,
          agent_name
        },
        ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1'
      })
    } catch (auditErr) {
      console.warn('[Tenant Voice Agents API] Audit log notice:', auditErr)
    }

    return NextResponse.json({
      success: true,
      message: `Agent ${agent_name || agent_id} successfully linked to Sarvam App ${sarvam_agent_id || 'unlinked'}`
    })
  } catch (err: any) {
    console.error('[Tenant Voice Agents API] POST Error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
