import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { safeApiHandler } from '@/utils/apiAuth'

// Common function to authorize admin access
async function authorizeAdmin(supabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { authorized: false, errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { authorized: false, errorResponse: NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 }) }
  }

  return { authorized: true, user }
}

export const GET = safeApiHandler(async (request: Request) => {
  const supabase = await createClient()
  const { authorized, errorResponse } = await authorizeAdmin(supabase)
  if (!authorized) return errorResponse!

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const search = searchParams.get('search') || ''
  const source = searchParams.get('source') || ''

  const offset = (page - 1) * limit

  let query = supabase
    .from('dnd_registry')
    .select('*', { count: 'exact' })
    .order('registered_at', { ascending: false })

  if (search) {
    query = query.ilike('phone_number', `%${search}%`)
  }
  if (source && source !== 'all') {
    query = query.eq('source', source)
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data: data || [],
    count: count || 0,
    page,
    limit
  })
})

export const POST = safeApiHandler(async (request: Request) => {
  const supabase = await createClient()
  const { authorized, errorResponse } = await authorizeAdmin(supabase)
  if (!authorized) return errorResponse!

  const body = await request.json()
  const { phone_numbers, source } = body

  if (!phone_numbers || !Array.isArray(phone_numbers) || phone_numbers.length === 0) {
    return NextResponse.json({ error: 'Phone numbers array is required' }, { status: 400 })
  }

  const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'
  const res = await fetch(`${fastApiUrl}/api/dnd/add?source=${encodeURIComponent(source || 'manual')}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(phone_numbers)
  })

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({ error: data.detail || 'Failed to add numbers to DND' }, { status: res.status })
  }

  return NextResponse.json(data)
})

export const DELETE = safeApiHandler(async (request: Request) => {
  const supabase = await createClient()
  const { authorized, errorResponse } = await authorizeAdmin(supabase)
  if (!authorized) return errorResponse!

  const { searchParams } = new URL(request.url)
  const source = searchParams.get('source') || ''
  const beforeDate = searchParams.get('before_date') || ''

  const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'
  let url = `${fastApiUrl}/api/dnd/bulk-delete?`
  if (source) url += `source=${encodeURIComponent(source)}&`
  if (beforeDate) url += `before_date=${encodeURIComponent(beforeDate)}&`

  const res = await fetch(url, { method: 'DELETE' })
  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({ error: data.detail || 'Failed to bulk delete DND numbers' }, { status: res.status })
  }

  return NextResponse.json(data)
})
