import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate super_admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(request.url)
    const provider = url.searchParams.get('provider')
    const status = url.searchParams.get('status')
    const city = url.searchParams.get('city')
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('phone_numbers')
      .select(`
        *,
        organizations:organizations!phone_numbers_assigned_org_id_fkey(name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (provider) {
      query = query.eq('provider', provider)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (city) {
      query = query.ilike('city', `%${city}%`)
    }

    const { data: numbers, count, error } = await query

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        numbers: numbers || [],
        total_count: count || 0,
        limit,
        offset
      }
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
