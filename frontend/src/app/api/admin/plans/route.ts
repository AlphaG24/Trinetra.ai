import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return createAdminClient(url, serviceKey)
}

async function verifyAdminAuth() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { authorized: false, error: 'Unauthorized', status: 401, user: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { authorized: false, error: 'Forbidden: Admin role required', status: 403, user: null }
  }

  return { authorized: true, user, profile }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const adminSupabase = getAdminClient()
    const { data: plans, error } = await adminSupabase
      .from('plans')
      .select('*')
      .eq('is_archived', false)
      .order('display_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ plans })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const {
      name,
      slug,
      description,
      price_monthly,
      price_annual,
      max_agents = 1,
      included_voice_minutes = 500,
      included_chat_conversations = 1000,
      included_social_posts = 30,
      overage_voice_per_minute = 1000,
      is_popular = false,
      is_active = true,
      badge_text = null,
      display_order = 10,
      features = {}
    } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'Plan name and slug are required' }, { status: 400 })
    }

    const adminSupabase = getAdminClient()

    // Check slug collision
    const { data: existing } = await adminSupabase
      .from('plans')
      .select('id')
      .eq('slug', slug)
      .eq('is_archived', false)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: `A plan with slug "${slug}" already exists` }, { status: 409 })
    }

    const newPlanPayload = {
      name,
      slug: slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-'),
      description: description || '',
      price_monthly: Math.round(Number(price_monthly) || 0),
      price_annual: Math.round(Number(price_annual) || 0),
      max_agents: Number(max_agents) || 1,
      included_voice_minutes: Number(included_voice_minutes) || 0,
      included_chat_conversations: Number(included_chat_conversations) || 0,
      included_social_posts: Number(included_social_posts) || 0,
      overage_voice_per_minute: Math.round(Number(overage_voice_per_minute) || 1000),
      is_popular: Boolean(is_popular),
      is_active: Boolean(is_active),
      is_archived: false,
      badge_text: badge_text || null,
      display_order: Number(display_order) || 10,
      features: features && typeof features === 'object' ? features : {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: plan, error } = await adminSupabase
      .from('plans')
      .insert(newPlanPayload)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Audit log
    await adminSupabase.from('audit_logs').insert({
      action: 'admin.plan_created',
      user_id: auth.user?.id,
      user_email: auth.profile?.email,
      details: { plan_id: plan.id, name: plan.name, slug: plan.slug, price_monthly: plan.price_monthly }
    })

    return NextResponse.json({ success: true, plan })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 })
    }

    const adminSupabase = getAdminClient()

    const sanitizedUpdates: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    if (updates.name !== undefined) sanitizedUpdates.name = updates.name
    if (updates.slug !== undefined) sanitizedUpdates.slug = updates.slug.toLowerCase().trim()
    if (updates.description !== undefined) sanitizedUpdates.description = updates.description
    if (updates.price_monthly !== undefined) sanitizedUpdates.price_monthly = Math.round(Number(updates.price_monthly))
    if (updates.price_annual !== undefined) sanitizedUpdates.price_annual = Math.round(Number(updates.price_annual))
    if (updates.max_agents !== undefined) sanitizedUpdates.max_agents = Number(updates.max_agents)
    if (updates.included_voice_minutes !== undefined) sanitizedUpdates.included_voice_minutes = Number(updates.included_voice_minutes)
    if (updates.overage_voice_per_minute !== undefined) sanitizedUpdates.overage_voice_per_minute = Math.round(Number(updates.overage_voice_per_minute))
    if (updates.is_popular !== undefined) sanitizedUpdates.is_popular = Boolean(updates.is_popular)
    if (updates.is_active !== undefined) sanitizedUpdates.is_active = Boolean(updates.is_active)
    if (updates.badge_text !== undefined) sanitizedUpdates.badge_text = updates.badge_text || null
    if (updates.display_order !== undefined) sanitizedUpdates.display_order = Number(updates.display_order)
    if (updates.features !== undefined) sanitizedUpdates.features = updates.features

    const { data: updatedPlan, error } = await adminSupabase
      .from('plans')
      .update(sanitizedUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Audit log
    await adminSupabase.from('audit_logs').insert({
      action: updates.is_active !== undefined && Object.keys(updates).length === 1 ? 'admin.plan_status_toggled' : 'admin.plan_updated',
      user_id: auth.user?.id,
      user_email: auth.profile?.email,
      details: { plan_id: id, updates: sanitizedUpdates }
    })

    return NextResponse.json({ success: true, plan: updatedPlan })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 })
    }

    const adminSupabase = getAdminClient()

    // Soft archive the plan
    const { error } = await adminSupabase
      .from('plans')
      .update({ is_archived: true, is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Audit log
    await adminSupabase.from('audit_logs').insert({
      action: 'admin.plan_archived',
      user_id: auth.user?.id,
      user_email: auth.profile?.email,
      details: { plan_id: id }
    })

    return NextResponse.json({ success: true, message: 'Plan successfully archived' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
