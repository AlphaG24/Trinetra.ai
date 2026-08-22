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
    const dateFrom = url.searchParams.get('date_from')
    const dateTo = url.searchParams.get('date_to')
    const format = url.searchParams.get('format')
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    
    // Using phone_numbers as proxy for activity since there is a status column
    let query = supabase
      .from('phone_numbers')
      .select(`
        *,
        organizations(name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (provider && provider !== 'All') {
      query = query.eq('provider', provider.toLowerCase())
    }
    if (status && status !== 'All') {
      query = query.eq('status', status.toLowerCase())
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }
    
    if (format !== 'csv') {
      query = query.limit(limit)
    }

    const { data: activity, count, error } = await query

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (format === 'csv') {
      const headers = ['Date', 'Organization', 'Phone Number', 'DID Type', 'Provider', 'City', 'Status']
      const rows = (activity || []).map((item: any) => [
        new Date(item.created_at).toISOString(),
        item.organizations?.name || 'Unknown',
        item.phone_number,
        item.did_type,
        item.provider,
        item.city || 'N/A',
        item.status
      ])
      
      const escapeCsv = (field: string | null | undefined) => {
        if (field === null || field === undefined) return '""';
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }
      
      const csvContent = [
        headers.map(escapeCsv).join(','),
        ...rows.map(row => row.map(escapeCsv).join(','))
      ].join('\n')

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="telephony-activity-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        activity: activity || [],
        total_count: count || 0
      }
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
