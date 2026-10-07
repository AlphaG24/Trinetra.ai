import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { plan } = await request.json()
    
    if (plan === 'trial') {
      return NextResponse.json({
        error: 'The ₹99 7-Day All-Access Trial requires completed checkout via Razorpay. Direct plan activation is prohibited.'
      }, { status: 402 })
    }
    
    return NextResponse.json({ error: 'Invalid plan or payment required' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
