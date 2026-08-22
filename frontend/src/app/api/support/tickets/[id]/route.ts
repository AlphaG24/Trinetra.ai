import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { safeApiHandler } from '@/utils/apiAuth'

export const GET = safeApiHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Get user profile role and organization
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (profileErr) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
  }

  const { data: ticket, error: ticketErr } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .single()

  if (ticketErr || !ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  const isAdmin = profile.role === 'admin' || profile.role === 'super_admin'

  // If user is client, they can only view tickets belonging to their organization
  if (!isAdmin && ticket.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(ticket)
})

export const PUT = safeApiHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Verify that the user is an admin or super_admin
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profileErr || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 })
  }

  const body = await req.json()
  const { status, priority, assigned_to, resolution_notes, internal_note } = body

  // Fetch ticket first to append internal notes or messages
  const { data: ticket, error: fetchErr } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  const updateFields: Record<string, any> = {
    updated_at: new Date().toISOString()
  }

  if (status) {
    const allowedStatuses = ['open', 'in_progress', 'waiting_on_client', 'resolved', 'closed']
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    updateFields.status = status
    if (status === 'resolved' || status === 'closed') {
      updateFields.resolved_at = new Date().toISOString()
    }
  }

  if (priority) {
    const allowedPriorities = ['low', 'medium', 'high', 'urgent']
    if (!allowedPriorities.includes(priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
    }
    updateFields.priority = priority
  }

  if (assigned_to !== undefined) {
    updateFields.assigned_to = assigned_to
  }

  if (resolution_notes !== undefined) {
    updateFields.resolution_notes = resolution_notes
  }

  if (internal_note) {
    const currentNotes = ticket.internal_notes || []
    const newNoteObj = {
      author: profile.full_name || 'Admin',
      note: internal_note,
      timestamp: new Date().toISOString()
    }
    updateFields.internal_notes = [...currentNotes, newNoteObj]
  }

  const { data: updatedTicket, error: updateErr } = await supabase
    .from('support_tickets')
    .update(updateFields)
    .eq('id', id)
    .select()
    .single()

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to update ticket: ' + updateErr.message }, { status: 500 })
  }

  return NextResponse.json(updatedTicket)
})
