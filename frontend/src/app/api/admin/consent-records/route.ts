import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

// Service role client — bypasses RLS for admin read operations
function getServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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

    const adminClient = getServiceClient()

    // 4. Build Query
    let query = adminClient
      .from('consent_records')
      .select('*, user:profiles(full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (action && action !== 'all') {
      query = query.eq('consent_type', action)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (fromDate) {
      query = query.gte('created_at', new Date(fromDate).toISOString())
    }

    if (toDate) {
      // Add 1 day to include the end date fully
      const toDateObj = new Date(toDate)
      toDateObj.setDate(toDateObj.getDate() + 1)
      query = query.lt('created_at', toDateObj.toISOString())
    }

    // Handle search (this might require a more complex query depending on DB setup)
    if (search && search.trim()) {
      // In a real scenario, you might want to search by IP or user email
      query = query.or(`ip_address.ilike.%${search}%,user_agent.ilike.%${search}%`)
    }

    // 5. Execute Query
    const { data, error, count } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      records: data || [],
      total: count || 0,
      page,
      totalPages: count ? Math.ceil(count / limit) : 0
    })

  } catch (error: any) {
    console.error('Consent records API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch consent records' },
      { status: 500 }
    )
  }
}
