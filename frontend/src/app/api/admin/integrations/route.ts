import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Super Admin role required' }, { status: 403 })
    }

    // Retrieve all integration types and their joined agent connections to count them
    const { data, error } = await supabase
      .from('integration_types')
      .select('*, agent_integrations(id, is_connected)')
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const mappedData = data?.map(it => ({
      ...it,
      agent_count: it.agent_integrations?.filter((ai: any) => ai.is_connected).length || 0,
      agent_integrations: undefined // drop join details
    }))

    return NextResponse.json({ success: true, data: mappedData })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Super Admin role required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, slug, description, icon, category, setup_steps, required_fields, is_active } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('integration_types')
      .insert({
        name,
        slug,
        description,
        icon: icon || 'Puzzle',
        category: category || 'other',
        setup_steps: setup_steps || [],
        required_fields: required_fields || [],
        is_active: is_active ?? true
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
