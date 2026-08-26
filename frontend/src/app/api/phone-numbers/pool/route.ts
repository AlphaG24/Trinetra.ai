import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { authenticated, profile, supabase } = await authenticateRequest()
    if (!authenticated || !profile || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Retrieve all available numbers from the pool
    const { data: availableNumbers, error } = await supabase
      .from('phone_number_pool')
      .select('*')
      .eq('status', 'available')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: availableNumbers || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
