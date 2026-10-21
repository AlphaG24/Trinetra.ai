import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { safeApiHandler } from '@/utils/apiAuth'

export const GET = safeApiHandler(async (request: NextRequest) => {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const perPage = parseInt(searchParams.get('per_page') || '25', 10)
  const sentiment = searchParams.get('sentiment') || 'all'
  const search = (searchParams.get('search') || '').trim()
  const callId = searchParams.get('call_id')

  const admin = createAdminClient()

  // 1. Fetch user's profile to find organization_id and role
  const { data: profile } = await admin
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle()

  const isPrivileged = ['developer_tester', 'admin', 'super_admin'].includes(profile?.role || '')

  // If specific call requested for transcript modal
  if (callId) {
    let callQuery = admin
      .from('voice_calls')
      .select('id, transcript, call_summary, recording_url, caller_name, caller_phone, duration_seconds, sentiment, outcome, created_at')
      .eq('id', callId)

    if (!isPrivileged) {
      if (profile?.organization_id) {
        callQuery = callQuery.or(`user_id.eq.${user.id},organization_id.eq.${profile.organization_id}`)
      } else {
        callQuery = callQuery.eq('user_id', user.id)
      }
    }

    const { data: singleCall, error: singleErr } = await callQuery.maybeSingle()
    if (singleErr) {
      return NextResponse.json({ error: singleErr.message }, { status: 500 })
    }
    return NextResponse.json({ call: singleCall })
  }

  // Build paginated query
  let query = admin
    .from('voice_calls')
    .select('id, created_at, duration_seconds, sentiment, outcome, caller_name, caller_phone, recording_url, transcript, agent_id', { count: 'exact' })

  if (!isPrivileged) {
    if (profile?.organization_id) {
      query = query.or(`user_id.eq.${user.id},organization_id.eq.${profile.organization_id}`)
    } else {
      query = query.eq('user_id', user.id)
    }
  }

  if (sentiment && sentiment !== 'all') {
    query = query.eq('sentiment', sentiment)
  }

  if (search) {
    query = query.or(`caller_name.ilike.%${search}%,caller_phone.ilike.%${search}%`)
  }

  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const { data: calls, count, error: queryError } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (queryError) {
    console.error('[/api/dashboard/calls GET] Query error:', queryError)
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  return NextResponse.json({
    calls: calls || [],
    total: count || 0,
    page,
    perPage
  })
})
