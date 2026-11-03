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
    const nowIso = new Date().toISOString()

    // 3. Write immutable compliance audit log before deletion (Preserved for regulatory compliance)
    try {
      await adminClient.from('audit_logs').insert({
        user_id: userId,
        user_email: userEmail,
        user_role: 'client',
        action: 'gdpr.dpdp.account_deletion_executed',
        resource_type: 'profile',
        resource_id: userId,
        new_values: {
          deletion_timestamp: nowIso,
          compliance_notice: 'Personal data purged. Statutory audit logs, consent records, and tax invoices retained under Indian GST and DPDP statutory mandate.'
        },
        created_at: nowIso
      })
    } catch (auditErr) {
      console.warn('[delete-account] Could not write pre-deletion audit log:', auditErr)
    }

    // 4. Purge personal and operational customer data
    // (Note: audit_logs, consent_records, invoices, and transaction logs are NOT deleted per compliance mandate)
    await Promise.allSettled([
      // Appointments & Callbacks
      adminClient.from('appointments').delete().eq('user_id', userId),
      adminClient.from('callbacks').delete().eq('user_id', userId),
      // Leads & Customers
      adminClient.from('leads').delete().eq('user_id', userId),
      adminClient.from('customers').delete().eq('user_id', userId),
      // Campaigns & Contacts
      adminClient.from('campaign_contacts').delete().eq('user_id', userId),
      adminClient.from('campaigns').delete().eq('user_id', userId),
      // Operations Catalog
      adminClient.from('business_operations_catalog').delete().eq('user_id', userId),
      // Integrations & Connections
      adminClient.from('integrations').delete().eq('user_id', userId),
      adminClient.from('telegram_connections').delete().eq('user_id', userId),
      adminClient.from('voice_library').delete().eq('user_id', userId),
      adminClient.from('api_keys').delete().eq('user_id', userId),
      // Unlink phone numbers back to pool
      adminClient.from('phone_numbers').update({ assigned_agent_id: null, status: 'available', user_id: null }).eq('user_id', userId),
      adminClient.from('subscriptions').delete().eq('user_id', userId),
    ])

    // Delete agents
    await adminClient.from('agents').delete().eq('user_id', userId)

    // 5. Purge PII in profiles table while keeping root reference for statutory invoice integrity
    await adminClient.from('profiles').update({
      full_name: 'Deleted User',
      phone: null,
      company_name: null,
      street: null,
      city: null,
      state: null,
      gst_number: null,
      is_deleted: true,
      deleted_at: nowIso,
      updated_at: nowIso
    }).eq('id', userId)

    // 6. Delete the auth user permanently using the Admin API (TRI-001)
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId)
    if (deleteAuthError) {
      console.error('[delete-account] Auth user deletion failed:', deleteAuthError.message)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    console.info(`[gdpr] Account permanently deleted for ${userEmail} at ${nowIso}. Statutory logs retained.`)

    return NextResponse.json({ success: true, message: 'Account and personal data permanently purged.' })
  } catch (error: any) {
    // SEC-007: Generic error message to client
    console.error('[delete-account] Unhandled error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
