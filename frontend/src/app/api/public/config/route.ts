import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Query all public settings from system_config table
    const { data: configs, error } = await supabaseAdmin
      .from('system_config')
      .select('config_key, config_value')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const publicKeys = [
      "free_demo_minutes", "trial_price_paisa", "trial_days", 
      "trial_minutes", "starter_price_paisa", "starter_minutes", 
      "professional_price_paisa", "professional_minutes",
      "enterprise_price_paisa", "enterprise_minutes",
      "max_agents_free", "max_agents_starter", "max_agents_professional",
      "inbound_number_cost_paisa", "overage_per_minute_paisa"
    ]

    const configMap: Record<string, string> = {}
    configs?.forEach(item => {
      if (publicKeys.includes(item.config_key)) {
        configMap[item.config_key] = item.config_value
      }
    })

    return NextResponse.json({ configs: configMap })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
