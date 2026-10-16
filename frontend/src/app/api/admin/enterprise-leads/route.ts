import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { error: 'Unauthorized', status: 401 }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { error: 'Forbidden: Admin access required', status: 403 }
  }

  return { user, profile }
}

export async function GET() {
  try {
    const auth = await verifyAdmin()
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const adminClient = getAdminClient()
    const allLeads: any[] = []

    // 1. Try enterprise_leads table
    const { data: entLeads } = await adminClient
      .from('enterprise_leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (entLeads && Array.isArray(entLeads)) {
      allLeads.push(...entLeads)
    }

    // 2. Query public.leads table where call_summary includes Enterprise
    const { data: generalLeads } = await adminClient
      .from('leads')
      .select('*')
      .ilike('call_summary', '%Enterprise%')
      .order('created_at', { ascending: false })

    if (generalLeads && Array.isArray(generalLeads)) {
      for (const gl of generalLeads) {
        // avoid duplicate if same id exists
        if (!allLeads.some(l => l.id === gl.id)) {
          allLeads.push({
            id: gl.id,
            work_email: gl.email,
            company_name: gl.company_name || gl.full_name,
            phone_number: gl.phone,
            infrastructure_needs: gl.call_summary || 'Custom Enterprise Setup',
            deployment_type: 'cloud',
            message: gl.call_summary || '',
            status: gl.status || 'new',
            created_at: gl.created_at
          })
        }
      }
    }

    // Sort descending by created_at
    allLeads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({ leads: allLeads })
  } catch (err: any) {
    console.error('[Admin Enterprise Leads GET] Exception:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await verifyAdmin()
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const { id, message, infrastructure_needs, deployment_type, status } = body

    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }

    const adminClient = getAdminClient()
    const updates: Record<string, any> = {}
    if (message !== undefined) updates.message = message
    if (infrastructure_needs !== undefined) updates.infrastructure_needs = infrastructure_needs
    if (deployment_type !== undefined) updates.deployment_type = deployment_type

    // Try updating enterprise_leads
    const { data: entData, error: entError } = await adminClient
      .from('enterprise_leads')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (entData) {
      return NextResponse.json({ success: true, lead: entData })
    }

    // Otherwise try updating public.leads
    const leadsUpdates: Record<string, any> = {}
    if (status !== undefined) leadsUpdates.status = status
    if (message !== undefined || infrastructure_needs !== undefined) {
      leadsUpdates.call_summary = `${infrastructure_needs || ''} - ${message || ''}`
    }

    const { data: leadData, error: leadError } = await adminClient
      .from('leads')
      .update(leadsUpdates)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (leadError) {
      return NextResponse.json({ error: leadError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, lead: leadData })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
