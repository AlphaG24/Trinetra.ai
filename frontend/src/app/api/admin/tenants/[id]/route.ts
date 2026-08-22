import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // 1. Authenticate User
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Authorize Admin Role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 })
    }

    // 3. Fetch Tenant / Organization Detail
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*, business_description')
      .eq('id', id)
      .single()

    let tenantData = org

    // If org not found, check if ID corresponds to a profile ID
    if (!org) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*, business_description')
        .eq('id', id)
        .single()

      if (!userProfile) {
        return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
      }
      tenantData = userProfile
    }

    // 4. Fetch Active Agents
    const { data: agents } = await supabase
      .from('agents')
      .select('*')
      .or(`organization_id.eq.${id},user_id.eq.${id}`)

    // 5. Fetch Recent Calls & Metrics
    const { data: calls } = await supabase
      .from('voice_calls')
      .select('duration_seconds, is_lead, created_at')
      .or(`organization_id.eq.${id},user_id.eq.${id}`)

    const totalCalls = calls?.length || 0
    const totalMinutes = Math.ceil((calls?.reduce((acc, c) => acc + (c.duration_seconds || 0), 0) || 0) / 60)
    const totalLeads = calls?.filter(c => c.is_lead).length || 0

    return NextResponse.json({
      tenant: tenantData,
      agents: agents || [],
      metrics: {
        totalCalls,
        totalMinutes,
        totalLeads,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = await createClient()

    // 1. Authenticate User
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Authorize Admin Role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 })
    }

    // 3. Update Organization
    const updatePayload: Record<string, any> = {}
    if (body.status !== undefined) updatePayload.status = body.status
    if (body.admin_notes !== undefined) updatePayload.admin_notes = body.admin_notes
    if (body.demo_minutes_limit !== undefined) updatePayload.demo_minutes_limit = body.demo_minutes_limit

    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      // Fallback update profiles table
      await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', id)
    }

    // 4. Record Audit Log
    try {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        user_role: profile.role,
        action: 'admin.tenant_updated',
        resource_type: 'organization',
        resource_id: id,
        new_values: updatePayload,
      })
    } catch (auditErr) {
      console.warn('Audit log entry failed:', auditErr)
    }

    return NextResponse.json({ success: true, tenant: updatedOrg })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
