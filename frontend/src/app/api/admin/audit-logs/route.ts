import { createClient } from '@/utils/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
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

    // 3. Parse Query Parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const action = searchParams.get('action')
    const userId = searchParams.get('user_id')
    const search = searchParams.get('search')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')

    const offset = (page - 1) * limit

    // 4. Build Query
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (action && action !== 'all') {
      query = query.eq('action', action)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    } else if (search) {
      query = query.or(`user_email.ilike.%${search}%,action.ilike.%${search}%,ip_address.ilike.%${search}%`)
    }

    if (fromDate) {
      query = query.gte('created_at', `${fromDate}T00:00:00Z`)
    }

    if (toDate) {
      query = query.lte('created_at', `${toDate}T23:59:59Z`)
    }

    const { data: logs, count, error: logsError } = await query

    if (logsError) {
      return NextResponse.json({ error: 'Failed to fetch audit logs: ' + logsError.message }, { status: 500 })
    }

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
