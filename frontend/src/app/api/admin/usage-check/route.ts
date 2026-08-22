import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { sendEmailTemplate } from '@/lib/email'

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET: Triggers usage check and sends email warnings
export async function GET() {
  try {
    console.log('[Usage Monitor] Starting scanning...')
    const adminClient = getAdminClient()

    // 1. Fetch all active profiles
    const { data: profiles, error: err } = await adminClient
      .from('profiles')
      .select('*')
      .eq('is_active', true)

    if (err || !profiles) {
      console.error('[Usage Monitor] Error loading profiles:', err)
      return NextResponse.json({ error: 'Failed to load profiles' }, { status: 500 })
    }

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const startOfMonthIso = startOfMonth.toISOString()

    let emailsSent = 0

    for (const profile of profiles) {
      if (!profile.email) continue

      const isFree = profile.plan_tier === 'free' || profile.plan_tier === 'free_demo'
      const used = isFree ? (profile.demo_minutes_used || 0) : (profile.paid_minutes_used || 0)
      const limit = isFree ? (profile.demo_minutes_limit || 10) : (profile.paid_minutes_limit || 0)

      if (limit === 0) continue

      const percent = Math.round((used / limit) * 100)

      if (percent >= 100) {
        // Check if quota_exceeded notification already sent this month
        const { data: existing } = await adminClient
          .from('notifications')
          .select('id')
          .eq('organization_id', profile.organization_id)
          .eq('type', 'quota_exceeded')
          .gte('created_at', startOfMonthIso)

        if (existing && existing.length > 0) {
          // Already sent this month
          continue
        }

        // Send Paused Alert
        console.log(`[Usage Monitor] User ${profile.email} reached 100% quota (${used}/${limit}). Sending paused email...`)
        const success = await sendEmailTemplate({
          to: profile.email,
          subject: '🛑 Action Required: Trinetra AI calls quota exceeded',
          templateName: 'agent-paused',
          variables: {
            recipient_name: profile.full_name || 'there',
            limit_minutes: String(limit),
            billing_url: 'https://trinetraedu-ai.com/dashboard/billing'
          }
        })

        if (success) {
          emailsSent++
          // Save notification
          await adminClient.from('notifications').insert({
            organization_id: profile.organization_id || null,
            title: '🛑 Calls Quota Exceeded - Agents Paused',
            message: `Your voice agents have been paused because your call minutes quota (${used}/${limit} mins) has been fully exhausted.`,
            type: 'quota_exceeded'
          })
        }

      } else if (percent >= 80) {
        // Check if usage_warning notification already sent this month
        const { data: existing } = await adminClient
          .from('notifications')
          .select('id')
          .eq('organization_id', profile.organization_id)
          .eq('type', 'usage_warning')
          .gte('created_at', startOfMonthIso)

        if (existing && existing.length > 0) {
          // Already sent this month
          continue
        }

        // Send Usage Warning Alert
        console.log(`[Usage Monitor] User ${profile.email} reached 80% quota (${used}/${limit}). Sending warning email...`)
        const success = await sendEmailTemplate({
          to: profile.email,
          subject: '⚠️ Usage Alert: 80% Trinetra AI call minutes quota reached',
          templateName: 'usage-warning',
          variables: {
            recipient_name: profile.full_name || 'there',
            used_minutes: String(used),
            limit_minutes: String(limit),
            billing_url: 'https://trinetraedu-ai.com/dashboard/billing'
          }
        })

        if (success) {
          emailsSent++
          // Save notification
          await adminClient.from('notifications').insert({
            organization_id: profile.organization_id || null,
            title: `⚠️ Calls Quota Warning (${percent}% used)`,
            message: `Your account has used ${percent}% of your monthly call minutes quota (${used}/${limit} mins).`,
            type: 'usage_warning'
          })
        }
      }
    }

    return NextResponse.json({ success: true, emails_sent: emailsSent })
  } catch (error: any) {
    console.error('[Usage Monitor] Catch Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
