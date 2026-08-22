import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch user's profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, organization_id, company_name, full_name')
      .eq('id', user.id)
      .maybeSingle()
      
    let orgId = profile?.organization_id

    // Auto-resolve or create organization if missing
    if (!orgId) {
      const { data: orgLookup } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (orgLookup) {
        orgId = orgLookup.id
      } else {
        const { data: newOrg } = await supabaseAdmin
          .from('organizations')
          .insert({
            name: profile?.company_name || `${profile?.full_name || 'User'}'s Organization`,
            owner_id: user.id
          })
          .select('id')
          .single()
        
        if (newOrg) {
          orgId = newOrg.id
        }
      }

      if (orgId) {
        await supabaseAdmin
          .from('profiles')
          .update({ organization_id: orgId })
          .eq('id', user.id)
      }
    }

    // Default fallback usage stats
    const defaultUsage = {
      success: true,
      data: {
        organization_id: orgId || user.id,
        minutes_used: 0,
        minutes_limit: 100,
        percentage_used: 0,
        agents_count: 0,
        agents_limit: 5,
        can_make_calls: true
      }
    }

    if (!orgId) {
      return NextResponse.json(defaultUsage)
    }

    const FASTAPI_URL = process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000'
    try {
      const res = await fetch(`${FASTAPI_URL}/api/usage/organization/${orgId}`, {
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json(data)
      }
    } catch (apiErr) {
      console.warn('[/api/usage GET] Backend unreachable, returning default usage:', apiErr)
    }

    return NextResponse.json(defaultUsage)
  } catch (error: any) {
    console.error('[/api/usage GET] Error:', error)
    return NextResponse.json({
      success: true,
      data: {
        minutes_used: 0,
        minutes_limit: 100,
        percentage_used: 0,
        agents_count: 0,
        agents_limit: 5,
        can_make_calls: true
      }
    })
  }
}
