import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-helpers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { authenticated, profile, supabase } = await authenticateRequest()
    if (!authenticated || !profile || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin or super_admin can resolve developer requests
    if (!['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
    }

    const { requestId, status, adminNotes } = body

    if (!requestId || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Missing or invalid parameters.' }, { status: 400 })
    }

    // Query request details
    const { data: devRequest, error: queryError } = await supabase
      .from('developer_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (queryError || !devRequest) {
      return NextResponse.json({ error: 'Request not found.' }, { status: 404 })
    }

    if (devRequest.status !== 'pending') {
      return NextResponse.json({ error: 'This request has already been resolved.' }, { status: 400 })
    }

    // Initialize Service Role Client for bypassing RLS to update system_config
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // If approved, execute the corresponding actions
    if (status === 'approved') {
      const { request_type, request_data, developer_id } = devRequest

      if (request_type === 'set_homepage_agent') {
        const { agent_id } = request_data

        // 1. Update homepage_demo_agent_id config
        const { error: configError } = await supabaseAdmin
          .from('system_config')
          .upsert({
            config_key: 'homepage_demo_agent_id',
            config_value: String(agent_id),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'config_key'
          })

        if (configError) {
          console.error('[Admin Request Approval] Config error:', configError)
          return NextResponse.json({ error: `Approval failed: ${configError.message}` }, { status: 500 })
        }

        // 2. Mark agent is_demo status
        await supabaseAdmin
          .from('agents')
          .update({ is_demo: true })
          .eq('id', agent_id)

      } else if (request_type === 'bypass_limits') {
        const { limit_type, value } = request_data
        const increment = Number(value) || 1

        // Retrieve current developer profile
        const { data: devProfile } = await supabaseAdmin
          .from('profiles')
          .select('additional_agents, additional_phone_numbers')
          .eq('id', developer_id)
          .single()

        if (devProfile) {
          const updates: Record<string, number> = {}
          if (limit_type === 'agents') {
            updates.additional_agents = (devProfile.additional_agents || 0) + increment
          } else if (limit_type === 'phone_numbers') {
            updates.additional_phone_numbers = (devProfile.additional_phone_numbers || 0) + increment
          }

          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update(updates)
            .eq('id', developer_id)

          if (profileError) {
            console.error('[Admin Request Approval] Profile error:', profileError)
            return NextResponse.json({ error: `Approval failed: ${profileError.message}` }, { status: 500 })
          }
        }
      }
    }

    // Update request row status in database
    const { data: resolvedRequest, error: updateError } = await supabase
      .from('developer_requests')
      .update({
        status,
        admin_notes: adminNotes || '',
        resolved_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log resolution to activity_log
    try {
      await supabase.from('activity_log').insert({
        user_id: profile.id,
        organization_id: profile.organization_id,
        activity_type: 'developer_request_resolved',
        title: `Developer Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        description: `Resolved request ${requestId} with status: ${status}`
      })
    } catch (logErr) {
      console.warn('Failed to log request resolution:', logErr)
    }

    return NextResponse.json({ success: true, data: resolvedRequest })

  } catch (error: any) {
    console.error('[Admin Request Resolution API Error]:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
