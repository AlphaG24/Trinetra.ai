import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { safeApiHandler } from '@/utils/apiAuth'

async function ensureOrganization(userId: string, email: string, fullName: string, currentOrgId: string | null) {
  if (currentOrgId) return currentOrgId

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const orgName = `${fullName || email.split('@')[0] || 'My'}'s Company`
  const orgSlug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') + '-' + Math.floor(1000 + Math.random() * 9000)

  const { data: newOrg, error: orgError } = await supabaseAdmin
    .from('organizations')
    .insert({
      name: orgName,
      slug: orgSlug,
    })
    .select('id')
    .single()

  if (orgError || !newOrg) {
    throw new Error('Failed to auto-create organization: ' + orgError?.message)
  }

  const { error: profileUpdateError } = await supabaseAdmin
    .from('profiles')
    .update({ organization_id: newOrg.id })
    .eq('id', userId)

  if (profileUpdateError) {
    throw new Error('Failed to link organization to profile: ' + profileUpdateError.message)
  }

  return newOrg.id
}

export const GET = safeApiHandler(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user profile to find organization_id and role
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('organization_id, role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profileErr) {
    console.error('[/api/support/tickets GET] Profile query error:', profileErr)
    return NextResponse.json({ error: 'Failed to load user profile' }, { status: 500 })
  }

  if (!profile) {
    return NextResponse.json({ error: 'User profile not found. Please complete onboarding first.' }, { status: 404 })
  }

  const isAdmin = profile.role === 'admin' || profile.role === 'super_admin'

  // Auto-archive resolved/closed tickets older than 30 days on fetch
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    await supabase
      .from('support_tickets')
      .update({ archived: true, archived_at: new Date().toISOString() })
      .in('status', ['resolved', 'closed'])
      .lt('resolved_at', thirtyDaysAgo)
      .eq('archived', false)
  } catch (err) {
    console.error('Failed to auto-archive old support tickets:', err)
  }

  let query = supabase.from('support_tickets').select('*').eq('archived', false)
  if (!isAdmin) {
    let orgId = profile.organization_id
    if (!orgId) {
      try {
        orgId = await ensureOrganization(user.id, user.email || '', profile.full_name || '', profile.organization_id)
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
      }
    }
    query = query.eq('organization_id', orgId)
  }

  const { data: tickets, error: ticketsErr } = await query.order('created_at', { ascending: false })

  if (ticketsErr) {
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
  }

  return NextResponse.json(tickets)
})

export const POST = safeApiHandler(async (req: Request) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profileErr) {
    console.error('[/api/support/tickets POST] Profile query error:', profileErr)
    return NextResponse.json({ error: 'Failed to load user profile' }, { status: 500 })
  }

  if (!profile) {
    return NextResponse.json({ error: 'User profile not found. Please complete onboarding first.' }, { status: 404 })
  }

  let orgId = profile.organization_id
  if (!orgId) {
    try {
      orgId = await ensureOrganization(user.id, user.email || '', profile.full_name || '', profile.organization_id)
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  }

  const body = await req.json()
  const { subject, category, priority, message } = body

  if (!subject || !category || !message) {
    return NextResponse.json({ error: 'Missing required fields: subject, category, message' }, { status: 400 })
  }

  // Validate category and priority check constraints
  const allowedCategories = ['agent_issue', 'billing', 'feature_request', 'bug_report', 'general', 'account', 'onboarding']
  const allowedPriorities = ['low', 'medium', 'high', 'urgent']

  const normCategory = category.toLowerCase().replace(' ', '_')
  const normPriority = (priority || 'medium').toLowerCase()

  if (!allowedCategories.includes(normCategory)) {
    return NextResponse.json({ error: `Invalid category. Must be one of: ${allowedCategories.join(', ')}` }, { status: 400 })
  }

  if (!allowedPriorities.includes(normPriority)) {
    return NextResponse.json({ error: `Invalid priority. Must be one of: ${allowedPriorities.join(', ')}` }, { status: 400 })
  }

  const firstMessage = {
    sender: 'client',
    sender_name: profile.full_name || 'Client Member',
    message,
    timestamp: new Date().toISOString()
  }

  const { data: ticket, error: ticketErr } = await supabase
    .from('support_tickets')
    .insert({
      organization_id: orgId,
      submitted_by: user.id,
      subject,
      category: normCategory,
      priority: normPriority,
      status: 'open',
      messages: [firstMessage]
    })
    .select()
    .single()

  if (ticketErr || !ticket) {
    return NextResponse.json({ error: 'Failed to create support ticket: ' + (ticketErr?.message || 'Unknown error') }, { status: 500 })
  }

  // Get Formspree Form ID from system_config table
  const getFormspreeId = async () => {
    try {
      const { data: configData } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'formspree_form_id')
        .single()
      return configData?.config_value || 'mjgnkbay'
    } catch (err) {
      console.error('Failed to load formspree_form_id from system_config:', err)
      return 'mjgnkbay'
    }
  }

  const formspreeId = process.env.FORMSPREE_FORM_ID || await getFormspreeId()
  if (formspreeId) {
    fetch(`https://formspree.io/f/${formspreeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticket_number: ticket.ticket_number,
        subject: ticket.subject,
        category: ticket.category,
        user_email: user.email,
        message: message
      })
    }).catch(console.error)
  }

  return NextResponse.json(ticket)
})
