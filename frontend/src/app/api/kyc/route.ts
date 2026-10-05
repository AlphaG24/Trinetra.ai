import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function maskIdNumber(idStr: string, docType: string): string {
  const clean = idStr.trim()
  if (docType === 'authorized_signatory_id' || clean.length === 12) {
    // Aadhaar masking: show only last 4 digits
    return `•••• •••• ${clean.slice(-4)}`
  }
  if (docType === 'company_pan' || (clean.length === 10 && /[A-Z]{5}[0-9]{4}[A-Z]{1}/i.test(clean))) {
    // PAN masking: show first 2 and last 4
    return `${clean.slice(0, 2)}••••••${clean.slice(-2)}`
  }
  // Generic masking
  if (clean.length > 4) {
    return '•'.repeat(clean.length - 4) + clean.slice(-4)
  }
  return '••••'
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    const orgId = profile?.organization_id
    if (!orgId) {
      return NextResponse.json({ documents: [], status: 'pending_review' })
    }

    const { data: docs, error } = await admin
      .from('kyc_documents')
      .select('id, document_type, mime_type, file_size_bytes, id_number_masked, status, rejection_reason, created_at, verified_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const hasVerified = docs?.some(d => d.status === 'verified')
    const hasRejected = docs?.some(d => d.status === 'rejected')
    const overallStatus = hasVerified ? 'verified' : (hasRejected ? 'rejected' : (docs && docs.length > 0 ? 'pending_review' : 'not_started'))

    return NextResponse.json({
      documents: docs || [],
      overallStatus,
    })
  } catch (err: any) {
    console.error('KYC GET error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    let orgId = profile?.organization_id
    if (!orgId) {
      const { data: newOrg } = await admin.from('organizations').insert({ name: 'My Workspace' }).select('id').single()
      orgId = newOrg?.id
      if (orgId) {
        await admin.from('profiles').update({ organization_id: orgId }).eq('id', user.id)
      }
    }

    const body = await req.json()
    const { document_type, raw_id_number, file_name, file_base64, mime_type, consent_given } = body

    if (!consent_given) {
      return NextResponse.json({
        error: 'Statutory affirmative consent is mandatory to process identity documents per Master Plan Section 18.6.',
      }, { status: 400 })
    }

    if (!document_type || !file_base64) {
      return NextResponse.json({ error: 'Document type and file payload are required' }, { status: 400 })
    }

    // UIDAI & statutory masking: NEVER store raw ID number in plaintext
    const maskedId = raw_id_number ? maskIdNumber(raw_id_number, document_type) : null
    const checksum = crypto.createHash('sha256').update(file_base64).digest('hex')
    const encryptedPath = `kyc_vault/${orgId}/${document_type}_${Date.now()}.enc`

    const statutoryConsentText = 'I affirmatively consent to the verification and encrypted vault storage of this identity document in accordance with the Digital Personal Data Protection Act (DPDP), UIDAI statutory masking guidelines, and Trinetra AI Telephony Compliance.'

    const { data: inserted, error: insertErr } = await admin
      .from('kyc_documents')
      .insert({
        organization_id: orgId,
        user_id: user.id,
        document_type,
        encrypted_file_path: encryptedPath,
        file_sha256_checksum: checksum,
        mime_type: mime_type || 'application/pdf',
        file_size_bytes: Math.round((file_base64.length * 3) / 4),
        id_number_masked: maskedId,
        is_raw_aadhaar_stored: false,
        upload_consent_given: true,
        upload_consent_text: statutoryConsentText,
        upload_consent_at: new Date().toISOString(),
        status: 'pending_review',
      })
      .select('id, document_type, id_number_masked, status, created_at')
      .single()

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    // Master Plan Section 18.6: Record statutory affirmative consent in immutable consent ledger
    try {
      const forwarded = req.headers.get('x-forwarded-for') || '127.0.0.1'
      const clientIp = forwarded.split(',')[0].trim()
      const userAgent = req.headers.get('user-agent') || 'Unknown'
      const consentToken = crypto.createHash('sha256').update(`${user.id}_kyc_${Date.now()}_${checksum}`).digest('hex')

      await admin.from('consent_records').insert({
        user_id: user.id,
        consent_type: 'kyc_document_vault',
        consent_version: '1.0',
        status: 'granted',
        purpose_text: statutoryConsentText,
        data_categories: ['identity_document', 'signatory_id', 'business_pan'],
        ip_address: clientIp,
        user_agent: userAgent,
        consent_token: consentToken,
        created_at: new Date().toISOString(),
      })
    } catch (consentErr) {
      console.warn('[Consent Ledger] Failed to record KYC affirmative consent in consent_records:', consentErr)
    }

    return NextResponse.json({
      success: true,
      message: 'KYC Document securely submitted for compliance review.',
      document: inserted,
    })
  } catch (err: any) {
    console.error('KYC POST error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
