import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getAllCoupons, saveCoupon } from '@/lib/coupons'

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function checkAdminAuth() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized', status: 401, user: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { error: 'Forbidden: Admin role required', status: 403, user: null }
  }

  return { user, error: null, status: 200 }
}

export async function GET() {
  try {
    const { error, status } = await checkAdminAuth()
    if (error) return NextResponse.json({ error }, { status })

    const adminClient = getAdminClient()
    const coupons = await getAllCoupons(adminClient)

    return NextResponse.json({ coupons })
  } catch (error: any) {
    console.error('[Admin Coupons GET] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { error, status } = await checkAdminAuth()
    if (error) return NextResponse.json({ error }, { status })

    const body = await req.json()
    const {
      code,
      title,
      description,
      discount_type,
      discount_value,
      max_discount_inr,
      min_order_inr,
      is_public_offer,
      is_active,
      first_purchase_only,
      max_uses,
      max_uses_per_user,
      expires_at
    } = body

    if (!code || !title || !discount_type || discount_value === undefined) {
      return NextResponse.json({ error: 'Code, title, discount type, and discount value are required' }, { status: 400 })
    }

    const adminClient = getAdminClient()
    const saved = await saveCoupon(adminClient, {
      code: code.trim().toUpperCase(),
      title: title.trim(),
      description: description?.trim() || '',
      discount_type: discount_type === 'flat' ? 'flat' : 'percentage',
      discount_value: parseFloat(discount_value),
      max_discount_inr: max_discount_inr ? parseFloat(max_discount_inr) : null,
      min_order_inr: min_order_inr ? parseFloat(min_order_inr) : 0,
      is_public_offer: Boolean(is_public_offer),
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      first_purchase_only: Boolean(first_purchase_only),
      max_uses: max_uses ? parseInt(max_uses, 10) : null,
      max_uses_per_user: max_uses_per_user ? parseInt(max_uses_per_user, 10) : 1,
      expires_at: expires_at ? new Date(expires_at).toISOString() : null,
      used_count: 0
    })

    return NextResponse.json({ coupon: saved, message: 'Coupon created successfully' }, { status: 201 })
  } catch (error: any) {
    console.error('[Admin Coupons POST] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to save coupon' }, { status: 500 })
  }
}
