import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { safeApiHandler } from '@/utils/apiAuth'
import { createAdminClient } from '@/utils/supabase/admin'

export const GET = safeApiHandler(async () => {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle()

  const admin = createAdminClient()

  // Strict User ID scoping: only show agents created by this account ID
  const { data: agents, error: queryError } = await admin
    .from('agents')
    .select('*')
    .eq('user_id', user.id)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })

  if (queryError) {
    console.error('[/api/dashboard/agents GET] Query error:', queryError)
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  return NextResponse.json({ agents: agents || [] })
})
