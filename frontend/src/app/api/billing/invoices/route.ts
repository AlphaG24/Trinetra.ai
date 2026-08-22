import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    console.log('[INVOICES API] User ID:', user.id)
    console.log('[INVOICES API] Org ID:', profile?.organization_id)

    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', profile?.organization_id || '')
      .order('created_at', { ascending: false })

    console.log('[INVOICES API] Invoices found:', invoices?.length)

    return NextResponse.json({ invoices: invoices || [] })
  } catch (error: any) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}