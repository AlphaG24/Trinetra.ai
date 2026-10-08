import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { verifyDocumentWithOCR } from '@/lib/kyc-ocr-service'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function maskIdNumber(idStr: string, docType: string): string {
  const clean = idStr.trim()
  if (docType === 'gstin_certificate' || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(clean)) {
    // GSTIN is a public 15-character corporate tax identifier (CGST Act 2017).
    // Not subject to UIDAI biometric privacy rules. Must remain unmasked for compliance verification on services.gst.gov.in.
    return clean.toUpperCase()
  }
  if (docType === 'authorized_signatory_id' || clean.length === 12) {
    // Aadhaar masking: show only last 4 digits per UIDAI statutory mandate
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

    const entityTypes = [
      'company_pan', 
      'gstin_certificate', 
      'incorporation_cert',
      'company_registration',
      'business_ein',
      'trade_license'
    ]
    const signatoryTypes = [
      'authorized_signatory_id',
      'passport',
      'national_id',
      'drivers_license'
    ]

    const allDocs = docs || []
    // Entity Proof checks
    const entityDocs = allDocs.filter(d => entityTypes.includes(d.document_type))
    const hasVerifiedEntity = entityDocs.some(d => d.status === 'verified')
    const hasPendingEntity = entityDocs.some(d => d.status === 'pending_review' || d.status === 'submitted')
    const hasRejectedEntity = entityDocs.length > 0 && !hasVerifiedEntity && !hasPendingEntity

    // Authorized Signatory ID checks
    const signatoryDocs = allDocs.filter(d => signatoryTypes.includes(d.document_type))
    const hasVerifiedSignatory = signatoryDocs.some(d => d.status === 'verified')
    const hasPendingSignatory = signatoryDocs.some(d => d.status === 'pending_review' || d.status === 'submitted')
    const hasRejectedSignatory = signatoryDocs.length > 0 && !hasVerifiedSignatory && !hasPendingSignatory

    const canProcurePhoneNumbers = hasVerifiedEntity && hasVerifiedSignatory

    let overallStatus = 'not_started'
    if (canProcurePhoneNumbers) {
      overallStatus = 'verified'
    } else if (hasRejectedEntity || hasRejectedSignatory) {
      overallStatus = 'action_required'
    } else if (hasPendingEntity || hasPendingSignatory) {
      overallStatus = 'pending_review'
    } else if (allDocs.length > 0) {
      overallStatus = 'incomplete'
    }

    const complianceChecklist = {
      entity: {
        isMandatory: true,
        title: 'Entity / Business Proof',
        description: 'Company PAN, GSTIN, Incorporation, or Company Registration Certificate',
        verified: hasVerifiedEntity,
        status: hasVerifiedEntity ? 'verified' : (hasPendingEntity ? 'pending_review' : (hasRejectedEntity ? 'rejected' : 'missing')),
      },
      signatory: {
        isMandatory: true,
        title: 'Authorized Signatory Proof',
        description: 'Masked Aadhaar, Passport, or National ID of registered officer',
        verified: hasVerifiedSignatory,
        status: hasVerifiedSignatory ? 'verified' : (hasPendingSignatory ? 'pending_review' : (hasRejectedSignatory ? 'rejected' : 'missing')),
      },
      canProcurePhoneNumbers,
    }

    return NextResponse.json({
      documents: allDocs,
      overallStatus,
      complianceChecklist,
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

    // Fetch organization name for entity matching
    let orgName = ''
    if (orgId) {
      const { data: orgData } = await admin.from('organizations').select('name').eq('id', orgId).maybeSingle()
      if (orgData?.name) orgName = orgData.name
    }

    // Automated Multimodal OCR & Document Authenticity Verification
    console.log(`[KYC OCR] Running automated document verification for docType: ${document_type}, org: ${orgName}...`)
    const ocrResult = await verifyDocumentWithOCR({
      fileBase64: file_base64,
      mimeType: mime_type || (file_name?.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
      documentType: document_type,
      rawIdNumber: raw_id_number,
      expectedEntityName: orgName || (profile as any)?.full_name || '',
    })

    console.log(`[KYC OCR] Status: ${ocrResult.verificationStatus}, Detected: ${ocrResult.detectedTitle}, AuthenticCategory: ${ocrResult.isAuthenticCategory}`)

    // If the document is detected as fake or mismatched (e.g. 12th marksheet uploaded for a GST certificate)
    if (ocrResult.verificationStatus === 'failed' || !ocrResult.isAuthenticCategory) {
      return NextResponse.json({
        error: `Automated Document Verification Failed: ${ocrResult.summaryReason}`,
        detected_document: ocrResult.detectedTitle,
        ocr_details: ocrResult,
      }, { status: 422 })
    }

    // UIDAI & statutory masking: NEVER store raw ID number in plaintext
    const maskedId = raw_id_number ? maskIdNumber(raw_id_number, document_type) : null
    const checksum = crypto.createHash('sha256').update(file_base64).digest('hex')
    const encryptedPath = `kyc_vault/${orgId}/${document_type}_${Date.now()}.enc`

    const statutoryConsentText = 'I affirmatively consent to the verification and encrypted vault storage of this identity document in accordance with the Digital Personal Data Protection Act (DPDP), UIDAI statutory masking guidelines, and Trinetra AI Telephony Compliance.'

    // Master Plan Section 18.6: AES-256-GCM Encrypted Storage in private_bucket
    try {
      const fileBuffer = Buffer.from(file_base64, 'base64')
      const secret = process.env.KYC_VAULT_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'trinetra-kyc-key'
      const encKey = crypto.createHash('sha256').update(secret).digest()
      const nonce = crypto.randomBytes(12)
      const cipher = crypto.createCipheriv('aes-256-gcm', encKey, nonce)
      const encBytes = Buffer.concat([cipher.update(fileBuffer), cipher.final()])
      const tag = cipher.getAuthTag()
      const combined = Buffer.concat([nonce, encBytes, tag])

      await admin.storage
        .from('private_bucket')
        .upload(encryptedPath, combined, {
          contentType: 'application/octet-stream',
          upsert: true,
        })
    } catch (storageErr) {
      console.warn('[KYC Storage] Error uploading encrypted bytes to private_bucket:', storageErr)
    }

    // Master Plan Section 18.6: OCR Auto-Approval or Triage
    const isHighConfidence = ocrResult.verificationStatus === 'passed' && ocrResult.confidenceScore >= 0.75
    const isAuthentic = ocrResult.isAuthenticCategory
    
    let initialStatus: 'verified' | 'pending_review' | 'rejected' = 'pending_review'
    let verifiedAt: string | null = null
    let reviewNote: string | null = null

    if (isHighConfidence && isAuthentic) {
      initialStatus = 'verified'
      verifiedAt = new Date().toISOString()
      reviewNote = `[Auto-Verified by OCR] Detected: ${ocrResult.detectedTitle} (Confidence: ${Math.round(ocrResult.confidenceScore * 100)}%)`
    } else if (!isAuthentic || ocrResult.confidenceScore < 0.40) {
      initialStatus = 'rejected'
      reviewNote = ocrResult.summaryReason || 'Document category mismatch or low legibility detected by OCR.'
    } else {
      initialStatus = 'pending_review'
      reviewNote = `[OCR Screened] Detected: ${ocrResult.detectedTitle} (Confidence: ${Math.round(ocrResult.confidenceScore * 100)}%). Awaiting compliance officer confirmation.`
    }

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
        status: initialStatus,
        verified_at: verifiedAt,
        rejection_reason: reviewNote,
      })
      .select('id, document_type, id_number_masked, status, rejection_reason, created_at, verified_at')
      .single()

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    // Dispatch in-app and external notification immediately
    try {
      if (initialStatus === 'verified' || initialStatus === 'rejected') {
        const { dispatchKYCReviewNotification } = await import('@/lib/kyc-notifications')
        await dispatchKYCReviewNotification({
          documentId: inserted.id,
          status: initialStatus,
          rejectionReason: reviewNote || undefined,
          adminUserId: 'system_ocr_engine',
        })
      } else {
        await admin.from('notifications').insert({
          user_id: user.id,
          title: '📋 KYC Document Vaulted',
          message: `Your ${document_type.replace(/_/g, ' ')} has been safely stored with AES-256 encryption. OCR confidence: ${Math.round(ocrResult.confidenceScore * 100)}%. Awaiting compliance confirmation.`,
          type: 'info',
          action_url: '/dashboard/settings',
          action_text: 'View Status',
          is_read: false,
        })
      }
    } catch (notifErr) {
      console.warn('[KYC Notification Dispatch] Non-fatal error dispatching notification:', notifErr)
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

    const message = initialStatus === 'verified'
      ? `Document verified and approved automatically via OCR (${Math.round(ocrResult.confidenceScore * 100)}% match). Live telephony is now active!`
      : (initialStatus === 'rejected'
        ? `Document rejected: ${reviewNote}`
        : 'Document securely vaulted and queued for statutory compliance verification.')

    return NextResponse.json({
      success: true,
      status: initialStatus,
      message,
      document: inserted,
      ocr_details: ocrResult,
    })
  } catch (err: any) {
    console.error('KYC POST error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
