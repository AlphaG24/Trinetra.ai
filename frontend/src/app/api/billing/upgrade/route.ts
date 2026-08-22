import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { plan } = await request.json()
    
    if (plan === 'trial') {
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // Get trial config from system_config
      const { data: configs, error: configErr } = await supabaseAdmin
        .from('system_config')
        .select('config_key, config_value')

      if (configErr) {
        return NextResponse.json({ error: configErr.message }, { status: 500 })
      }

      const configMap: Record<string, string> = {}
      configs?.forEach(c => {
        configMap[c.config_key] = c.config_value
      })
      
      const trialMinutes = parseInt(configMap.trial_minutes || '100', 10)
      const trialDays = parseInt(configMap.trial_days || '7', 10)
      
      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({
          plan_tier: 'trial',
          demo_minutes_limit: trialMinutes,
          demo_minutes_used: 0,
          trial_started_at: new Date().toISOString(),
          trial_ends_at: new Date(Date.now() + trialDays * 86400000).toISOString()
        })
        .eq('id', user.id)

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 })
      }
      
      return NextResponse.json({ success: true, plan: 'trial' })
    }
    
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
