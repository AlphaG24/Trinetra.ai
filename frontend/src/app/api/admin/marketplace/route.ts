import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Service role client — bypasses RLS for admin write operations
function getServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Utility to authorize admin/super_admin (uses user-scoped client for auth check only)
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

export async function GET() {
  try {
    const { error, status } = await checkAdminAuth()
    if (error) return NextResponse.json({ error }, { status })

    const adminClient = getServiceClient()
    const { data: services, error: fetchErr } = await adminClient
      .from('platform_services')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchErr) throw fetchErr

    return NextResponse.json({ services: services || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { error, status } = await checkAdminAuth()
    if (error) return NextResponse.json({ error }, { status })

    const body = await req.json()
    const { 
      name, 
      slug, 
      description, 
      type, 
      icon_url, 
      subdomain_url, 
      is_active, 
      is_visible_in_marketplace, 
      is_demo_allowed, 
      monthly_reset_enabled,
      marketplace_metadata 
    } = body

    if (!name || !slug || !type) {
      return NextResponse.json({ error: 'Missing required fields: name, slug, and type are mandatory.' }, { status: 400 })
    }

    const adminClient = getServiceClient()
    const { data, error: insertErr } = await adminClient
      .from('platform_services')
      .insert([{
        name,
        slug,
        description,
        type,
        icon_url,
        subdomain_url,
        is_active: is_active ?? true,
        is_visible_in_marketplace: is_visible_in_marketplace ?? true,
        is_demo_allowed: is_demo_allowed ?? true,
        monthly_reset_enabled: monthly_reset_enabled ?? true,
        ui_config: {},
        marketplace_metadata: marketplace_metadata || {}
      }])
      .select()
      .single()

    if (insertErr) throw insertErr

    return NextResponse.json({ success: true, service: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { error, status } = await checkAdminAuth()
    if (error) return NextResponse.json({ error }, { status })

    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing service id for update' }, { status: 400 })
    }

    const adminClient = getServiceClient()
    const { data, error: updateErr } = await adminClient
      .from('platform_services')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateErr) {
      console.error('[Admin Marketplace PUT] Supabase error:', updateErr.message)
      throw updateErr
    }

    return NextResponse.json({ success: true, service: data })
  } catch (error: any) {
    console.error('[Admin Marketplace PUT] Error:', error.message)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { error, status } = await checkAdminAuth()
    if (error) return NextResponse.json({ error }, { status })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing service id for deletion' }, { status: 400 })
    }

    const adminClient = getServiceClient()
    const { error: deleteErr } = await adminClient
      .from('platform_services')
      .delete()
      .eq('id', id)

    if (deleteErr) throw deleteErr

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
