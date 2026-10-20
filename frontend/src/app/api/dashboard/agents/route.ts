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

  const isPrivileged = ['developer_tester', 'admin', 'super_admin'].includes(profile?.role || '')

  // Use admin client to reliably retrieve user agents without client-side RLS friction
  const admin = createAdminClient()
  let query = admin.from('agents').select('*')

  if (!isPrivileged) {
    if (profile?.organization_id) {
      query = query.or(`user_id.eq.${user.id},organization_id.eq.${profile.organization_id}`)
    } else {
      query = query.eq('user_id', user.id)
    }
  }

  const { data: agents, error: queryError } = await query
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })

  if (queryError) {
    console.error('[/api/dashboard/agents GET] Query error:', queryError)
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  return NextResponse.json({ agents: agents || [] })
})
