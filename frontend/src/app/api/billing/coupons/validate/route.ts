import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { validateCoupon } from '@/lib/coupons'

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const body = await request.json()
    const { code, subtotal } = body as { code: string; subtotal: number }

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 })
    }

    if (typeof subtotal !== 'number' || subtotal < 0) {
      return NextResponse.json({ error: 'Valid cart subtotal is required' }, { status: 400 })
    }

    const adminClient = getAdminClient()
    const result = await validateCoupon(adminClient, code, subtotal, user?.id)

    if (!result.isValid) {
      return NextResponse.json({
        isValid: false,
        error: result.error || 'Invalid coupon code'
      }, { status: 400 })
    }

    return NextResponse.json({
      isValid: true,
      coupon: {
        code: result.coupon!.code,
        title: result.coupon!.title,
        discount_type: result.coupon!.discount_type,
        discount_value: result.coupon!.discount_value,
        max_discount_inr: result.coupon!.max_discount_inr
      },
      discountAmountRupees: result.discountAmountRupees,
      discountAmountPaisa: result.discountAmountPaisa
    })
  } catch (error: any) {
    console.error('[Validate Coupon API] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
