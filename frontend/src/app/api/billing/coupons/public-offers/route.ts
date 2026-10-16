import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getPublicOffers } from '@/lib/coupons'

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  try {
    const adminClient = getAdminClient()
    const offers = await getPublicOffers(adminClient)

    // Format safe client-facing offers
    const clientOffers = offers.map(o => ({
      id: o.id,
      code: o.code,
      title: o.title,
      description: o.description,
      discount_type: o.discount_type,
      discount_value: o.discount_value,
      max_discount_inr: o.max_discount_inr,
      min_order_inr: o.min_order_inr,
      expires_at: o.expires_at
    }))

    return NextResponse.json({ offers: clientOffers })
  } catch (error: any) {
    console.error('[Public Offers API] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to load offers' }, { status: 500 })
  }
}
