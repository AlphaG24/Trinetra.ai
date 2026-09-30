import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { eventId, leadId, dealStatus, wonAmount } = body

    if ((!eventId || typeof eventId !== 'string') && (!leadId || typeof leadId !== 'string')) {
      return NextResponse.json({ error: 'Missing eventId or leadId' }, { status: 400 })
    }

    if (!dealStatus || !['won', 'lost', 'open'].includes(dealStatus)) {
      return NextResponse.json({ error: 'dealStatus must be "won", "lost", or "open"' }, { status: 400 })
    }

    // 1. Fetch current event to verify tenant ownership
    let currentEvent: any = null
    if (eventId) {
      const { data, error: fetchErr } = await supabase
        .from('revenue_events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle()
      if (!fetchErr && data) currentEvent = data
    }

    if (!currentEvent && leadId) {
      const { data, error: fetchErr } = await supabase
        .from('revenue_events')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!fetchErr && data) currentEvent = data
    }

    // If still no event, check if lead exists and belongs to user to create on-demand
    if (!currentEvent && leadId) {
      const { data: leadRecord } = await supabase
        .from('leads')
        .select('id, user_id, call_id')
        .eq('id', leadId)
        .maybeSingle()

      if (leadRecord && leadRecord.user_id === user.id) {
        // Create initial revenue event
        const { data: newEv, error: createErr } = await supabase
          .from('revenue_events')
          .insert({
            lead_id: leadId,
            call_id: leadRecord.call_id || null,
            business_id: user.id,
            deal_status: dealStatus,
            source: 'inbound',
            currency: 'INR'
          })
          .select()
          .single()

        if (!createErr && newEv) {
          currentEvent = newEv
        }
      }
    }

    if (!currentEvent) {
      return NextResponse.json({ error: 'Revenue event or associated lead not found' }, { status: 404 })
    }

    // Multi-tenant security check
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle()

    const isOwner = currentEvent.business_id === user.id || currentEvent.business_id === profile?.organization_id
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const prevStatus = currentEvent.deal_status
    const prevWon = currentEvent.won_amount

    // Resolve wonAmount
    let finalWon: number | null = null
    if (dealStatus === 'won') {
      if (wonAmount !== undefined && wonAmount !== null && !isNaN(Number(wonAmount))) {
        finalWon = Number(wonAmount)
      } else {
        finalWon = Number(currentEvent.quoted_amount) || 0
      }
    }

    const nowIso = new Date().toISOString()
    const updateData: any = {
      deal_status: dealStatus,
      won_amount: finalWon,
      confirmed_by: 'owner',
      confirmed_at: nowIso,
      updated_at: nowIso
    }

    const { data: updated, error: updErr } = await supabase
      .from('revenue_events')
      .update(updateData)
      .eq('id', currentEvent.id)
      .select()
      .single()

    if (updErr) {
      console.error('[Revenue Confirm Error]', updErr)
      return NextResponse.json({ error: 'Failed to update deal status' }, { status: 500 })
    }

    // 2. Insert into append-only audit trail
    await supabase.from('revenue_audit_logs').insert({
      revenue_event_id: currentEvent.id,
      business_id: currentEvent.business_id,
      action: `deal_status_changed_to_${dealStatus}`,
      previous_status: prevStatus,
      new_status: dealStatus,
      previous_won_amount: prevWon,
      new_won_amount: finalWon,
      changed_by: user.email || 'Dashboard Owner',
      metadata: {
        confirmed_by: 'owner',
        user_id: user.id
      }
    })

    return NextResponse.json({ success: true, event: updated })
  } catch (error: any) {
    console.error('[Revenue Confirm API Error]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
