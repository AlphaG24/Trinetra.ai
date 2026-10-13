import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { saveCoupon, deleteCoupon, getAllCoupons } from '@/lib/coupons'

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
    return { error: 'Unauthorized', status: 401 }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { error: 'Forbidden: Admin role required', status: 403 }
  }

  return { user }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, status } = await checkAdminAuth()
    if (error) return NextResponse.json({ error }, { status })

    const { id } = await params
    const body = await req.json()
    const adminClient = getAdminClient()

    // Find existing coupon
    const coupons = await getAllCoupons(adminClient)
    const existing = coupons.find(c => c.id === id || c.code.toUpperCase() === id.trim().toUpperCase())
    if (!existing) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }

    const updated = await saveCoupon(adminClient, {
      ...existing,
      ...body,
      id
    })

    return NextResponse.json({ coupon: updated, message: 'Coupon updated successfully' })
  } catch (error: any) {
    console.error('[Admin Coupon PATCH] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update coupon' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, status } = await checkAdminAuth()
    if (error) return NextResponse.json({ error }, { status })

    const { id } = await params
    const adminClient = getAdminClient()
    await deleteCoupon(adminClient, id)

    return NextResponse.json({ message: 'Coupon deleted successfully' })
  } catch (error: any) {
    console.error('[Admin Coupon DELETE] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete coupon' }, { status: 500 })
  }
}
