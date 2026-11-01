import { NextRequest, NextResponse } from 'next/server'

// Verification token configured in Meta App Dashboard under WhatsApp > Configuration
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'vaakriti_whatsapp_secret'

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
              const textBody = msg.text?.body || msg.type
              console.log(`[WhatsApp Inbound] Received from +${fromNumber}: "${textBody}"`)
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
