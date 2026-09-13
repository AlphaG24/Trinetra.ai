import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Helper to get service role admin client
function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Helper to verify super admin role
async function checkSuperAdmin(supabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { isError: true, error: 'Unauthorized', status: 401 }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
    
  if (profile?.role !== 'super_admin') {
    return { isError: true, error: 'Forbidden: Super Admin access required', status: 403 }
  }
  
  return { isError: false, user }
}

// GET: Fetch all bundles (active and inactive)
export async function GET() {
  try {
    const supabase = await createClient()
    const adminCheck = await checkSuperAdmin(supabase)
    if (adminCheck.isError) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    const adminClient = getAdminClient()
    const { data: bundles, error } = await adminClient
      .from('product_bundles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Admin Bundles GET] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ bundles: bundles || [] })
  } catch (error: any) {
    console.error('[Admin Bundles GET] Catch Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST: Create a new bundle
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminCheck = await checkSuperAdmin(supabase)
    if (adminCheck.isError) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    const body = await request.json()
    const { name, description, products, individual_price_paisa, bundle_price_paisa, discount_percent, is_active, validity_days } = body

    if (!name || !products || individual_price_paisa === undefined || bundle_price_paisa === undefined) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const adminClient = getAdminClient()
    const { data: bundle, error } = await adminClient
      .from('product_bundles')
      .insert({
        name,
        description: description || '',
        products,
        individual_price_paisa,
        bundle_price_paisa,
        discount_percent: discount_percent || 0,
        validity_days: validity_days !== undefined ? parseInt(validity_days, 10) : 30,
        is_active: is_active !== undefined ? is_active : true
      })
      .select()
      .single()

    if (error) {
      console.error('[Admin Bundles POST] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, bundle })
  } catch (error: any) {
    console.error('[Admin Bundles POST] Catch Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PATCH: Update an existing bundle or toggle properties
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminCheck = await checkSuperAdmin(supabase)
    if (adminCheck.isError) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    const body = await request.json()
    const { id, name, description, products, individual_price_paisa, bundle_price_paisa, discount_percent, is_active, validity_days } = body

    if (!id) {
      return NextResponse.json({ error: 'Bundle ID is required' }, { status: 400 })
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (products !== undefined) updates.products = products
    if (individual_price_paisa !== undefined) updates.individual_price_paisa = individual_price_paisa
    if (bundle_price_paisa !== undefined) updates.bundle_price_paisa = bundle_price_paisa
    if (discount_percent !== undefined) updates.discount_percent = discount_percent
    if (validity_days !== undefined) updates.validity_days = parseInt(validity_days, 10)
    if (is_active !== undefined) updates.is_active = is_active

    const adminClient = getAdminClient()
    const { data: bundle, error } = await adminClient
      .from('product_bundles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Admin Bundles PATCH] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, bundle })
  } catch (error: any) {
    console.error('[Admin Bundles PATCH] Catch Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
