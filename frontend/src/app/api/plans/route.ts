import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_archived', false)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[Plans API] Error fetching plans:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ plans: plans || [] })
  } catch (err: any) {
    console.error('[Plans API] Unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
