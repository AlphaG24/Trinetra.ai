import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Authenticate User
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 2. Fetch User Profile (with admin fallback to ensure reliable load)
    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      const { data: adminProf } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      
      profile = adminProf
    }

    if (!profile) {
      // Auto-heal fallback profile
      profile = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Partner',
        role: 'client',
        plan_tier: 'free',
        onboarding_complete: false,
        paid_minutes_limit: 0,
        paid_minutes_used: 0,
        demo_minutes_limit: 15,
        demo_minutes_used: 0
      }
    }

    // Resolve tenant organization billing model (P5: subscription | credit_based | outcome_based)
    let effectivePlanTier = profile.plan_tier || 'free'
    if (profile.organization_id) {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('metadata')
        .eq('id', profile.organization_id)
        .maybeSingle()

      if (org?.metadata?.billing_model) {
        effectivePlanTier = org.metadata.billing_model
        if (profile.plan_tier !== effectivePlanTier) {
          await supabaseAdmin
            .from('profiles')
            .update({ plan_tier: effectivePlanTier })
            .eq('id', user.id)
        }
      }
    }

    // 2.5 Self-healing: check if trial has expired and auto-pause active agents
    const trialEndsAt = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null
    const isTrialExpired = effectivePlanTier === 'trial' && trialEndsAt && trialEndsAt < new Date()

    if (isTrialExpired) {
      // Pause active agents in main table
      await supabaseAdmin
        .from('agents')
        .update({ status: 'paused' })
        .eq('user_id', user.id)
        .eq('status', 'active')

      // Ensure user is notified of plan/trial expiration (check last 7 days to avoid duplicate spam)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: existingNotif } = await supabaseAdmin
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'plan_expired')
        .gte('created_at', sevenDaysAgo)
        .limit(1)

      if (!existingNotif || existingNotif.length === 0) {
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: user.id,
            organization_id: profile.organization_id || null,
            title: '🛑 Agent Plan / Trial Expired',
            message: 'Your free trial or agent plan has expired. Your active agents have been safely paused. Upgrade your plan to continue uninterrupted.',
            type: 'plan_expired',
            action_url: '/dashboard/billing',
            action_text: 'Upgrade Plan',
            is_read: false
          })
      }
    }

    // 3. Fetch system configurations via admin client for high reliability
    const { data: configs } = await supabaseAdmin
      .from('system_config')
      .select('config_key, config_value')

    // Filter out highly sensitive provider keys
    const sensitiveKeys = [
      'VAPI_PRIVATE_KEY', 'VAPI_WEBHOOK_SECRET', 'DEEPGRAM_API_KEY', 
      'SARVAM_API_KEY', 'ELEVENLABS_API_KEY', 'GEMINI_API_KEY', 
      'OPENAI_API_KEY', 'TELEGRAM_BOT_TOKEN', 'RAZORPAY_KEY_SECRET'
    ]

    const configMap: Record<string, string> = {
      starter_price_paisa: '499900',
      pro_price_paisa: '1499900',
      starter_minutes: '500',
      pro_minutes: '2000',
      wallet_min_topup_paisa: '50000'
    }

    configs?.forEach(item => {
      if (!sensitiveKeys.includes(item.config_key)) {
        configMap[item.config_key] = item.config_value
      }
    })

    // 3.5 Fetch active bundles bypassing RLS
    const { data: bundles } = await supabaseAdmin
      .from('product_bundles')
      .select('*')
      .eq('is_active', true)

    return NextResponse.json({
      configs: configMap,
      user_limits: {
        plan_tier: effectivePlanTier,
        trial_ends_at: profile.trial_ends_at || null,
        paid_minutes_limit: profile.paid_minutes_limit || 0,
        paid_minutes_used: profile.paid_minutes_used || 0,
        demo_minutes_limit: profile.demo_minutes_limit || 0,
        demo_minutes_used: profile.demo_minutes_used || 0,
        mandate_status: profile.mandate_status || null,
        mandate_id: profile.mandate_id || null,
        mandate_renewal_date: profile.mandate_renewal_date || null,
        mandate_target_plan: profile.mandate_target_plan || null,
        mandate_target_price_paisa: profile.mandate_target_price_paisa || null,
        mandate_personalities: profile.mandate_personalities || null,
      },
      bundles: bundles || []
    })
  } catch (error: any) {
    return NextResponse.json({
      configs: {
        starter_price_paisa: '499900',
        pro_price_paisa: '1499900',
        starter_minutes: '500',
        pro_minutes: '2000',
      },
      user_limits: {
        plan_tier: 'free',
        paid_minutes_limit: 0,
        paid_minutes_used: 0,
        demo_minutes_limit: 15,
        demo_minutes_used: 0,
      },
      bundles: []
    })
  }
}
