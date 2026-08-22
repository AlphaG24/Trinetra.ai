import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { safeApiHandler } from '@/utils/apiAuth'

export const POST = safeApiHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  
  // Authenticate user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Get request body
  const { message } = await req.json()
  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 })
  }
  
  // Get current ticket
  const { data: ticket, error: fetchErr } = await supabase
    .from('support_tickets')
    .select('messages')
    .eq('id', id)
    .single()
  
  if (fetchErr || !ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }
  
  // Add new message to messages array
  const newMessage = {
    id: crypto.randomUUID(),
    sender: 'user',
    sender_name: user.email || 'User',
    content: message.trim(),
    message: message.trim(), // for compatibility with legacy rendering
    created_at: new Date().toISOString(),
    timestamp: new Date().toISOString() // for compatibility with legacy rendering
  }
  
  const updatedMessages = [...(ticket.messages || []), newMessage]
  
  // Update ticket
  const { error: updateErr } = await supabase
    .from('support_tickets')
    .update({ messages: updatedMessages })
    .eq('id', id)
  
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }
  
  return NextResponse.json({ success: true, message: newMessage })
})
