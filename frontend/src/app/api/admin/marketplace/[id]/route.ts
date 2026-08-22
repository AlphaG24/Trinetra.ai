import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

// Service role client — bypasses RLS for admin write operations
function getServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Utility to authorize admin/super_admin
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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error, status } = await checkAdminAuth()
    if (error) return NextResponse.json({ error }, { status })

    const adminClient = getServiceClient()
    const { data, error: dbError } = await adminClient
      .from('platform_services')
      .select('*')
      .eq('id', params.id)
      .single()

    if (dbError) throw dbError
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(data)
  } catch (err: any) {
    console.error(`[Admin Marketplace GET ${params.id}]`, err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error, status } = await checkAdminAuth()
    if (error) return NextResponse.json({ error }, { status })

    const body = await request.json()
    const adminClient = getServiceClient()

    const { data, error: dbError } = await adminClient
      .from('platform_services')
      .update(body)
      .eq('id', params.id)
      .select()
      .single()

    if (dbError) throw dbError

    return NextResponse.json({ success: true, service: data })
  } catch (err: any) {
    console.error(`[Admin Marketplace PATCH ${params.id}]`, err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error, status } = await checkAdminAuth()
    if (error) return NextResponse.json({ error }, { status })

    const adminClient = getServiceClient()
    
    // Soft delete by setting is_active to false
    const { error: dbError } = await adminClient
      .from('platform_services')
      .update({ is_active: false, is_visible_in_marketplace: false })
      .eq('id', params.id)

    if (dbError) throw dbError

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error(`[Admin Marketplace DELETE ${params.id}]`, err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
