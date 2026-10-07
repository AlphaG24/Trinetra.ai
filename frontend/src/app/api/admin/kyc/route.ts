import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 })
    }

    const admin = getAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .single()

    const role = profile?.role || 'customer'
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 })
    }

    // Master Plan Section 18.4 & 18.5: Developer/tester accounts forbidden from viewing KYC
    if (role === 'developer_tester') {
      return NextResponse.json({
        error: 'Developer/tester accounts are strictly forbidden from viewing customer KYC documents.',
      }, { status: 403 })
    }

    // Step-up verification token check
    const authHeader = req.headers.get('x-admin-step-up-token')
    if (!authHeader) {
      return NextResponse.json({
        error: 'Step-up re-authentication required to access customer KYC records.',
        requires_step_up: true,
        action: 'kyc_view',
      }, { status: 403 })
    }

    // Fetch all KYC documents with audit logging
    const { data: docs, error: docsErr } = await admin
      .from('kyc_documents')
      .select(`
        id,
        organization_id,
        user_id,
        document_type,
        id_number_masked,
        mime_type,
        file_size_bytes,
        status,
        rejection_reason,
        upload_consent_given,
        upload_consent_at,
        created_at,
        verified_at,
        verified_by_admin_id
      `)
      .order('created_at', { ascending: false })

    if (docsErr) {
      return NextResponse.json({ error: docsErr.message }, { status: 500 })
    }

    // Fetch org and user profile names
    const orgIds = [...new Set((docs || []).map(d => d.organization_id).filter(Boolean))]
    const userIds = [...new Set((docs || []).map(d => d.user_id).filter(Boolean))]

    let orgsMap: Record<string, string> = {}
    if (orgIds.length > 0) {
      const { data: orgs } = await admin.from('organizations').select('id, name').in('id', orgIds)
      orgs?.forEach(o => { orgsMap[o.id] = o.name })
    }

    let usersMap: Record<string, { email: string; name: string }> = {}
    if (userIds.length > 0) {
      const { data: profs } = await admin.from('profiles').select('id, email, full_name').in('id', userIds)
      profs?.forEach(p => { usersMap[p.id] = { email: p.email || 'N/A', name: p.full_name || 'Customer' } })
    }

    const enrichedDocs = (docs || []).map(d => ({
      ...d,
      organization_name: orgsMap[d.organization_id] || 'Default Workspace',
      user_email: usersMap[d.user_id]?.email || 'N/A',
      user_name: usersMap[d.user_id]?.name || 'Customer',
    }))

    // Audit log this view action per Master Plan Section 18.4
    try {
      await admin.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        user_role: role,
        action: 'admin.kyc_vault_viewed',
        resource_type: 'kyc_documents',
        details: { count: enrichedDocs.length },
        created_at: new Date().toISOString(),
      })
    } catch (auditErr) {
      console.warn('[Audit Log] Failed to log kyc vault view:', auditErr)
    }

    return NextResponse.json({
      success: true,
      documents: enrichedDocs,
    })
  } catch (err: any) {
    console.error('Admin KYC GET error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
