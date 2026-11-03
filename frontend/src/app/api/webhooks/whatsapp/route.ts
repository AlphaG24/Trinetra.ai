import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Verification token configured in Meta App Dashboard under WhatsApp > Configuration
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'vaakriti_whatsapp_secret'

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function parsePaymentInfo(text: string): { isPayment: boolean; amount: number | null; utr: string | null } {
  if (!text) return { isPayment: false, amount: null, utr: null }

  const paymentKeywords = /\b(paid|payment|paytm|gpay|phonepe|google\s*pay|upi|utr|receipt|invoice|bheja|kar\s*diya|transferred|advance|rupaye|rs\.?|inr|screenshot|screen\s*shot)\b/i
  const isPayment = paymentKeywords.test(text)
  if (!isPayment) return { isPayment: false, amount: null, utr: null }

  // Extract amount
  let amount: number | null = null
  const amountMatch = text.match(/(?:(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?))|([\d,]+(?:\.\d+)?)\s*(?:rs|rupees|rupaye|inr|bheje|diye|paid)/i)
  if (amountMatch) {
    const rawVal = (amountMatch[1] || amountMatch[2] || '').replace(/,/g, '')
    const parsed = parseFloat(rawVal)
    if (!isNaN(parsed) && parsed > 0) {
      amount = parsed
    }
  }

  // Extract UTR / Txn ID
  let utr: string | null = null
  const utrMatch = text.match(/(?:utr|txn|transaction|ref|reference|id)[\s:#-]*([A-Za-z0-9]{8,24})/i)
  if (utrMatch) {
    utr = utrMatch[1]
  }

  return { isPayment: true, amount, utr }
}

async function processInboundMessage(fromNumber: string, textBody: string, msgObj: any) {
  const adminClient = getAdminClient()
  const cleanPhone = fromNumber.replace(/\D/g, '').slice(-10)
  if (!cleanPhone || cleanPhone.length < 10) return

  const paymentInfo = parsePaymentInfo(textBody)
  const isMediaReceipt = Boolean(msgObj?.image || msgObj?.document)

  if (paymentInfo.isPayment || isMediaReceipt) {
    console.log(`[WhatsApp Inbound] Payment/Receipt detected from +${fromNumber}:`, {
      amount: paymentInfo.amount,
      utr: paymentInfo.utr,
      isMediaReceipt
    })

    // 1. Match phone number to contact / lead / customer
    let matchedBusinessId: string | null = null
    let matchedLeadId: string | null = null
    let matchedCustomerName: string = 'Valued Client'
    let isCampaignContact = false

    // Check campaign_contacts
    const { data: campContact } = await adminClient
      .from('campaign_contacts')
      .select('id, campaign_id, full_name, phone_number, organization_id, user_id')
      .ilike('phone_number', `%${cleanPhone}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (campContact) {
      matchedBusinessId = campContact.organization_id || campContact.user_id
      matchedLeadId = campContact.id
      matchedCustomerName = campContact.full_name || matchedCustomerName
      isCampaignContact = true
    }

    if (!matchedBusinessId) {
      // Check customers
      const { data: customer } = await adminClient
        .from('customers')
        .select('id, full_name, phone_number, organization_id, user_id')
        .ilike('phone_number', `%${cleanPhone}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (customer) {
        matchedBusinessId = customer.organization_id || customer.user_id
        matchedLeadId = customer.id
        matchedCustomerName = customer.full_name || matchedCustomerName
      }
    }

    if (!matchedBusinessId) {
      // Check leads
      const { data: lead } = await adminClient
        .from('leads')
        .select('id, first_name, last_name, phone, organization_id, user_id')
        .ilike('phone', `%${cleanPhone}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lead) {
        matchedBusinessId = lead.organization_id || lead.user_id
        matchedLeadId = lead.id
        matchedCustomerName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || matchedCustomerName
      }
    }

    if (!matchedBusinessId) {
      const { data: voiceCall } = await adminClient
        .from('voice_calls')
        .select('user_id, organization_id')
        .ilike('to_number', `%${cleanPhone}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (voiceCall) {
        matchedBusinessId = voiceCall.organization_id || voiceCall.user_id
      }
    }

    if (matchedBusinessId) {
      // 2. Check for open revenue_event for this business & lead
      let openEvent: any = null
      if (matchedLeadId) {
        const { data: ev } = await adminClient
          .from('revenue_events')
          .select('*')
          .eq('business_id', matchedBusinessId)
          .eq('lead_id', matchedLeadId)
          .eq('deal_status', 'open')
          .limit(1)
          .maybeSingle()
        openEvent = ev
      }

      const confirmedWonAmount = paymentInfo.amount || (openEvent?.quoted_amount ? Number(openEvent.quoted_amount) : 0)
      const nowIso = new Date().toISOString()

      if (openEvent) {
        // Update open deal to won
        const { data: updatedEv, error: updateErr } = await adminClient
          .from('revenue_events')
          .update({
            deal_status: 'won',
            won_amount: confirmedWonAmount,
            confirmed_by: 'payment',
            confirmed_at: nowIso,
            metadata: {
              ...(openEvent.metadata || {}),
              whatsapp_payment: true,
              payment_text: textBody,
              utr: paymentInfo.utr,
              receipt_received_at: nowIso
            },
            updated_at: nowIso
          })
          .eq('id', openEvent.id)
          .select()
          .single()

        if (!updateErr && updatedEv) {
          await adminClient.from('revenue_audit_logs').insert({
            revenue_event_id: openEvent.id,
            business_id: matchedBusinessId,
            action: 'whatsapp_receipt_confirmed',
            previous_status: 'open',
            new_status: 'won',
            previous_won_amount: openEvent.won_amount || 0,
            new_won_amount: confirmedWonAmount,
            changed_by: `whatsapp:${fromNumber}`,
            metadata: { utr: paymentInfo.utr, text: textBody }
          })
          console.log(`[WhatsApp Inbound] Updated existing revenue event ${openEvent.id} to WON!`)
        }
      } else {
        // Create new revenue event for Cash-to-Call collection
        const newEventRecord = {
          business_id: matchedBusinessId,
          lead_id: matchedLeadId || null,
          quoted_amount: confirmedWonAmount,
          won_amount: confirmedWonAmount,
          currency: 'INR',
          deal_status: 'won',
          price_type: 'one_time',
          service: isCampaignContact ? 'Campaign Deal Conversion' : 'Inbound Voice / WhatsApp Deal',
          confidence: 0.95,
          confirmed_by: 'payment',
          confirmed_at: nowIso,
          source: isCampaignContact ? 'campaign' : 'inbound',
          extracted_quote_text: textBody,
          metadata: {
            whatsapp_from: fromNumber,
            whatsapp_payment: true,
            utr: paymentInfo.utr,
            has_media_receipt: isMediaReceipt,
            customer_name: matchedCustomerName,
            receipt_received_at: nowIso
          },
          created_at: nowIso,
          updated_at: nowIso
        }

        const { data: insertedEv, error: insertErr } = await adminClient
          .from('revenue_events')
          .insert(newEventRecord)
          .select()
          .single()

        if (!insertErr && insertedEv) {
          await adminClient.from('revenue_audit_logs').insert({
            revenue_event_id: insertedEv.id,
            business_id: matchedBusinessId,
            action: 'whatsapp_receipt_captured',
            previous_status: null,
            new_status: 'won',
            previous_won_amount: null,
            new_won_amount: confirmedWonAmount,
            changed_by: `whatsapp:${fromNumber}`,
            metadata: { utr: paymentInfo.utr, text: textBody }
          })
          console.log(`[WhatsApp Inbound] Created new revenue event ${insertedEv.id} for Cash-to-Call!`)
        }
      }

      // 3. Auto-reply receipt acknowledgement to customer on WhatsApp
      const phoneId = process.env.WHATSAPP_PHONE_ID || process.env.META_WHATSAPP_PHONE_ID
      const waToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_TOKEN
      if (phoneId && waToken) {
        try {
          const ackMsg = `Namaste ${matchedCustomerName}! 🙏\n\n` +
            `We have successfully received your payment details` +
            (paymentInfo.utr ? ` (Ref/UTR: ${paymentInfo.utr})` : '') +
            `. Your receipt has been logged and our team is finalizing your confirmation.\n\n` +
            `Thank you for your business!`

          await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${waToken}`
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: fromNumber,
              type: 'text',
              text: { preview_url: false, body: ackMsg }
            })
          })
        } catch (ackErr: any) {
          console.warn('[WhatsApp Inbound] Ack send error:', ackErr.message)
        }
      }
    }
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WhatsApp Webhook] Verification successful from Meta.')
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  console.warn('[WhatsApp Webhook] Verification failed: Token mismatch or invalid mode.', { mode, token })
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Handle incoming messages and status callbacks from Meta WhatsApp Cloud API
    if (body.object === 'whatsapp_business_account') {
      const entries = body.entry || []
      for (const entry of entries) {
        const changes = entry.changes || []
        for (const change of changes) {
          const value = change.value || {}

          // 1. Message delivery status updates (sent, delivered, read, failed)
          if (value.statuses) {
            for (const status of value.statuses) {
              console.log(`[WhatsApp Status] Message ID ${status.id} -> ${status.status} (recipient: ${status.recipient_id})`)
            }
          }

          // 2. Inbound customer replies
          if (value.messages) {
            for (const msg of value.messages) {
              const fromNumber = msg.from
              const textBody = msg.text?.body || msg.caption || msg.type || ''
              console.log(`[WhatsApp Inbound] Received from +${fromNumber}: "${textBody}"`)
              await processInboundMessage(fromNumber, textBody, msg)
            }
          }
        }
      }
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    return NextResponse.json({ status: 'ignored' }, { status: 200 })
  } catch (error: any) {
    console.error('[WhatsApp Webhook Error]', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
