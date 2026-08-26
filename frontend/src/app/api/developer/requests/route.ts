import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { authenticated, profile, supabase } = await authenticateRequest()
    if (!authenticated || !profile || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['developer_tester', 'admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Query requests
    let query = supabase
      .from('developer_requests')
      .select('*')
      .order('created_at', { ascending: false })

    // If developer_tester, only return their own requests
    if (profile.role === 'developer_tester') {
      query = query.eq('developer_id', profile.id)
    }

    const { data: requests, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: requests || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { authenticated, profile, supabase } = await authenticateRequest()
    if (!authenticated || !profile || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only developer_testers can submit new requests
    if (profile.role !== 'developer_tester') {
      return NextResponse.json({ error: 'Only developer tester accounts can submit requests.' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
    }

    const { request_type, request_data } = body

    if (!request_type || !request_data) {
      return NextResponse.json({ error: 'Missing request_type or request_data.' }, { status: 400 })
    }

    const validTypes = ['set_homepage_agent', 'bypass_limits', 'custom_voice_activation']
    if (!validTypes.includes(request_type)) {
      return NextResponse.json({ error: 'Invalid request_type.' }, { status: 400 })
    }

    // Insert request
    const { data: devRequest, error } = await supabase
      .from('developer_requests')
      .insert({
        developer_id: profile.id,
        request_type,
        request_data,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log request submission
    try {
      await supabase.from('activity_log').insert({
        user_id: profile.id,
        organization_id: profile.organization_id,
        activity_type: 'developer_request_submitted',
        title: 'Developer Request Submitted',
        description: `Submitted a request of type '${request_type}' for approval`
      })
    } catch (logErr) {
      console.warn('Failed to log request activity:', logErr)
    }

    return NextResponse.json({ success: true, data: devRequest }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
