import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

function getServiceClient() {
  return createAdminClient(
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
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { error: 'Forbidden: Admin role required', status: 403 }
  }

  return { user, profile }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error, status } = await checkAdminAuth()
    if (error) return NextResponse.json({ error }, { status })

    const adminClient = getServiceClient()
    const { data, error: dbError } = await adminClient
      .from('support_tickets')
      .select('*')
      .eq('id', params.id)
      .single()

    if (dbError) throw dbError
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(data)
  } catch (err: any) {
    console.error(`[Admin Support GET ${params.id}]`, err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error, status, profile } = await checkAdminAuth()
    if (error) return NextResponse.json({ error }, { status })

    const body = await request.json()
    const { message, isInternalNote } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const adminClient = getServiceClient()
    
    // First fetch the ticket to append the message
    const { data: ticket, error: fetchErr } = await adminClient
      .from('support_tickets')
      .select('messages, internal_notes')
      .eq('id', params.id)
      .single()
      
    if (fetchErr) throw fetchErr

    const now = new Date().toISOString()
    const updatePayload: Record<string, any> = { updated_at: now }
    
    if (isInternalNote) {
      const notes = Array.isArray(ticket.internal_notes) ? ticket.internal_notes : []
      notes.push({
        author: profile?.full_name || 'Admin',
        note: message,
        timestamp: now
      })
      updatePayload.internal_notes = notes
    } else {
      const msgs = Array.isArray(ticket.messages) ? ticket.messages : []
      msgs.push({
        sender: 'admin',
        sender_name: profile?.full_name || 'Trinetra Support',
        message: message,
        timestamp: now
      })
      updatePayload.messages = msgs
      // Automatically mark as "in_progress" or "open" if it was pending
      updatePayload.status = 'in_progress'
    }

    const { data, error: updateErr } = await adminClient
      .from('support_tickets')
      .update(updatePayload)
      .eq('id', params.id)
      .select()
      .single()

    if (updateErr) throw updateErr

    return NextResponse.json({ success: true, ticket: data })
  } catch (err: any) {
    console.error(`[Admin Support POST ${params.id}]`, err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
