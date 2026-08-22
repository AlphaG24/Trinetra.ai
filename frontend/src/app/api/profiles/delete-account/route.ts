import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabase = await createClient()

    // 1. Authenticate user (SEC-003: use getUser, not getSession)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id
    const userEmail = user.email

    // 2. Build an admin client using service role key (server-side only — TRI-001)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[delete-account] Missing Supabase env config')
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey)

    // 3. Write a final audit log before deleting (best effort)
    try {
      await supabase.from('audit_logs').insert({
        user_id: userId,
        user_email: userEmail,
        user_role: 'client',
        action: 'gdpr.account_deletion_requested',
        resource_type: 'profile',
        resource_id: userId,
        new_values: { deletion_timestamp: new Date().toISOString() },
      })
    } catch (auditErr) {
      console.warn('[delete-account] Could not write pre-deletion audit log:', auditErr)
    }

    // 4. Delete all user-owned data from each table
    // Order matters: delete from leaf tables before parent tables to avoid FK violations
    await Promise.allSettled([
      adminClient.from('consent_records').delete().eq('user_id', userId),
      adminClient.from('integrations').delete().eq('user_id', userId),
      adminClient.from('voice_calls').delete().eq('user_id', userId),
      adminClient.from('subscriptions').delete().eq('user_id', userId),
    ])

    // Delete agents after calls (calls may reference agents)
    await adminClient.from('agents').delete().eq('user_id', userId)

    // Delete profile last (root anchor)
    await adminClient.from('profiles').delete().eq('id', userId)

    // 5. Delete the auth user permanently using the Admin API (TRI-001)
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId)
    if (deleteAuthError) {
      console.error('[delete-account] Auth user deletion failed:', deleteAuthError.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    console.info(`[gdpr] Account permanently deleted for ${userEmail} at ${new Date().toISOString()}`)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    // SEC-007: Generic error message to client
    console.error('[delete-account] Unhandled error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
