import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Authenticate User
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Authorize Admin Role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 })
    }

    // 3. Fetch Consent Records with Profile Info
    // Note: Since Supabase RLS policies might block fetching user profiles or consent records, 
    // the system role handles it, but since admins have full access under policies:
    const { data: records, error: recordsErr } = await supabase
      .from('consent_records')
      .select(`
        id,
        user_id,
        consent_type,
        consent_version,
        status,
        purpose_text,
        data_categories,
        ip_address,
        user_agent,
        consent_token,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (recordsErr) throw recordsErr

    // Fetch profile mapping to display name/email
    const userIds = [...new Set(records?.map(r => r.user_id) || [])]
    let profilesMap: Record<string, { full_name: string; email: string }> = {}

    if (userIds.length > 0) {
      const { data: profiles, error: profsErr } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)

      if (!profsErr && profiles) {
        profiles.forEach(p => {
          profilesMap[p.id] = {
            full_name: p.full_name || 'Unnamed User',
            email: p.email || 'N/A'
          }
        })
      }
    }

    const enrichedRecords = (records || []).map(r => ({
      ...r,
      user_name: profilesMap[r.user_id]?.full_name || 'System Account',
      user_email: profilesMap[r.user_id]?.email || 'N/A'
    }))

    return NextResponse.json({ records: enrichedRecords })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
