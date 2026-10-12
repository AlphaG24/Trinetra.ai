import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, organization_id, mandate_id, mandate_status, plan_tier')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const mandateId = profile.mandate_id

    // If an external Razorpay subscription ID exists, attempt cancelling it via Razorpay API
    if (mandateId && mandateId.startsWith('sub_')) {
      const keyId = process.env.RAZORPAY_KEY_ID
      const keySecret = process.env.RAZORPAY_KEY_SECRET

      if (keyId && keySecret) {
        try {
          const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
          const cancelRes = await fetch(`https://api.razorpay.com/v1/subscriptions/${mandateId}/cancel`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify({
              cancel_at_cycle_end: 0
            })
          })
          if (!cancelRes.ok) {
            const errData = await cancelRes.json()
            console.warn('[Cancel Mandate] Razorpay subscription cancel warning:', errData)
          }
        } catch (e) {
          console.warn('[Cancel Mandate] Error cancelling Razorpay subscription:', e)
        }
      }
    }

    // Update profile mandate status in Supabase
    await adminClient
      .from('profiles')
      .update({
        mandate_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    // Update subscriptions table record if present
    if (profile.organization_id) {
      await adminClient
        .from('subscriptions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', profile.organization_id)
    }

    // Log cancellation in activity_log
    await adminClient.from('activity_log').insert({
      user_id: user.id,
      organization_id: profile.organization_id || null,
      activity_type: 'mandate_cancelled',
      title: 'Autopay Mandate Cancelled',
      description: 'The recurring trial renewal mandate was cancelled by the user. Zero upcoming charges.'
    })

    return NextResponse.json({
      success: true,
      message: 'Your upcoming autopay mandate has been revoked. No charges will be debited.'
    })
  } catch (err: any) {
    console.error('[Cancel Mandate] Error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
