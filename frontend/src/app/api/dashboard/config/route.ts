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

    // 2. Fetch User Profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // 2.5 Self-healing: check if trial has expired and auto-pause active agents
    const trialEndsAt = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null
    const isTrialExpired = profile.plan_tier === 'trial' && trialEndsAt && trialEndsAt < new Date()

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (isTrialExpired) {
      // Pause active agents in main table
      await supabaseAdmin
        .from('agents')
        .update({ status: 'paused' })
        .eq('user_id', user.id)
        .eq('status', 'active')
    }

    // 3. Fetch system configurations
    const { data: configs, error: configError } = await supabase
      .from('system_config')
      .select('config_key, config_value')

    if (configError) {
      return NextResponse.json({ error: configError.message }, { status: 500 })
    }

    // Filter out highly sensitive provider keys (like API secrets)
    const sensitiveKeys = [
      'VAPI_PRIVATE_KEY', 'VAPI_WEBHOOK_SECRET', 'DEEPGRAM_API_KEY', 
      'SARVAM_API_KEY', 'ELEVENLABS_API_KEY', 'GEMINI_API_KEY', 
      'OPENAI_API_KEY', 'TELEGRAM_BOT_TOKEN', 'RAZORPAY_KEY_SECRET'
    ]

    const configMap: Record<string, string> = {}
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
        plan_tier: profile.plan_tier || 'free',
        trial_ends_at: profile.trial_ends_at || null,
        paid_minutes_limit: profile.paid_minutes_limit || 0,
        paid_minutes_used: profile.paid_minutes_used || 0,
        demo_minutes_limit: profile.demo_minutes_limit || 0,
        demo_minutes_used: profile.demo_minutes_used || 0,
      },
      bundles: bundles || []
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
