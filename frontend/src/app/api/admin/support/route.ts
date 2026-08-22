import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

function getServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function checkAdminAuth() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { error: 'Unauthorized', status: 401 }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { error: 'Forbidden: Admin role required', status: 403 }
  }

  return { user, profile }
}

export async function GET(request: NextRequest) {
  try {
    const { error, status } = await checkAdminAuth()
    if (error) return NextResponse.json({ error }, { status })

    const searchParams = request.nextUrl.searchParams
    const qStatus = searchParams.get('status')
    const qPriority = searchParams.get('priority')
    const qSearch = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const adminClient = getServiceClient()
    let query = adminClient
      .from('support_tickets')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })

    if (qStatus && qStatus !== 'all') {
      query = query.eq('status', qStatus)
    }
    
    if (qPriority && qPriority !== 'all') {
      query = query.eq('priority', qPriority)
    }

    if (qSearch) {
      query = query.or(`subject.ilike.%${qSearch}%,ticket_number.ilike.%${qSearch}%`)
    }

    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data, count, error: dbError } = await query

    if (dbError) throw dbError

    return NextResponse.json({
      tickets: data,
      total: count,
      page,
      totalPages: count ? Math.ceil(count / limit) : 0
    })
  } catch (err: any) {
    console.error('[Admin Support GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { error, status } = await checkAdminAuth()
    if (error) return NextResponse.json({ error }, { status })

    const body = await request.json()
    const { ticketIds, status: newStatus, priority: newPriority } = body

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return NextResponse.json({ error: 'No tickets specified' }, { status: 400 })
    }

    const adminClient = getServiceClient()
    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() }
    
    if (newStatus) updatePayload.status = newStatus
    if (newPriority) updatePayload.priority = newPriority

    const { data, error: dbError } = await adminClient
      .from('support_tickets')
      .update(updatePayload)
      .in('id', ticketIds)
      .select()

    if (dbError) throw dbError

    return NextResponse.json({ success: true, updated: data.length })
  } catch (err: any) {
    console.error('[Admin Support Bulk PATCH]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
