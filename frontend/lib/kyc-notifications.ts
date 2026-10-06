import { createClient as createAdminClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const DOCUMENT_LABELS: Record<string, string> = {
  company_pan: 'Company / Business PAN Card',
  gstin_certificate: 'GSTIN Registration Certificate (REG-06)',
  authorized_signatory_id: 'Authorized Signatory ID (e-Aadhaar / Passport)',
  incorporation_cert: 'Certificate of Incorporation (MCA)',
  utility_bill: 'Business Utility Bill',
}

function normalizePhone(phone: string): string {
  if (!phone) return ''
  const cleaned = phone.replace(/[^\d+]/g, '').trim()
  if (cleaned.startsWith('+')) return cleaned
  const digits = cleaned.replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
  return `+${digits}`
}

function decryptToken(text: string): string {
  try {
    const seed = process.env.ENCRYPTION_SECRET_SEED || process.env.SUPABASE_SERVICE_ROLE_KEY || 'trinetra-dev-local-encryption-seed'
    const encKey = crypto.createHash('sha256').update(seed).digest()
    const textParts = text.split(':')
    const iv = Buffer.from(textParts.shift() || '', 'hex')
    const encryptedText = Buffer.from(textParts.join(':'), 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', encKey, iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
  } catch (e) {
    return ''
  }
}

async function getTwilioCredentials(adminClient: any, organizationId?: string | null) {
  try {
    let query = adminClient.from('integrations').select('*')
    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }
    const { data } = await query.limit(1)
    if (data && data.length > 0) {
      const rawToken = data[0].whatsapp_access_token
      if (rawToken) {
        const dec = decryptToken(rawToken)
        if (dec && dec.startsWith('{')) {
          const parsed = JSON.parse(dec)
          if (parsed.twilio_sid && parsed.auth_token) {
            return {
              sid: parsed.twilio_sid,
              token: parsed.auth_token,
              from: parsed.phone_number || '+14155238886',
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[KYC Notification] Could not fetch Twilio credentials from integrations:', err)
  }

  // Fallback to server env vars if configured
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    return {
      sid: process.env.TWILIO_ACCOUNT_SID,
      token: process.env.TWILIO_AUTH_TOKEN,
      from: process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886',
    }
  }

  return null
}

export interface KYCNotificationParams {
  documentId: string
  status: 'verified' | 'rejected'
  rejectionReason?: string | null
  adminUserId?: string
}

export async function dispatchKYCReviewNotification({
  documentId,
  status,
  rejectionReason,
  adminUserId,
}: KYCNotificationParams) {
  const adminClient = getAdminClient()
  const results = {
    dashboard: false,
    email: false,
    whatsapp: false,
  }

  try {
    // 1. Fetch document record
    const { data: doc, error: docErr } = await adminClient
      .from('kyc_documents')
      .select('id, user_id, organization_id, document_type, id_number_masked, status, rejection_reason')
      .eq('id', documentId)
      .single()

    if (docErr || !doc) {
      console.error('[KYC Notification] Document not found:', documentId)
      return results
    }

    const docTitle = DOCUMENT_LABELS[doc.document_type] || doc.document_type.replace(/_/g, ' ')
    const reasonText = rejectionReason || doc.rejection_reason || 'Document does not meet statutory verification requirements.'
    const isApproved = status === 'verified'

    // 2. Fetch User Profile & Org details
    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, email, full_name, phone, organization_id')
      .eq('id', doc.user_id)
      .maybeSingle()

    let orgName = 'Workspace'
    if (doc.organization_id) {
      const { data: org } = await adminClient
        .from('organizations')
        .select('name')
        .eq('id', doc.organization_id)
        .maybeSingle()
      if (org?.name) orgName = org.name
    }

    const userName = profile?.full_name || (profile?.email ? profile.email.split('@')[0] : 'Valued User')
    const userEmail = profile?.email
    const userPhone = profile?.phone ? normalizePhone(profile.phone) : ''
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trinetraedu-ai.com'
    const kycPortalUrl = `${baseUrl}/dashboard/settings/kyc`

    // =========================================================================
    // CHANNEL 1: In-App Dashboard Notification
    // =========================================================================
    try {
      const notifTitle = isApproved
        ? '✅ KYC Verification Approved'
        : '❌ KYC Verification Rejected'

      const notifMessage = isApproved
        ? `Your ${docTitle} has been verified and approved by compliance. Your organization (${orgName}) is now cleared for virtual phone number procurement and outbound voice calling.`
        : `Your ${docTitle} was declined during review. Reason: "${reasonText}". Please upload an updated copy to complete statutory verification.`

      // Database check constraint allows: 'info', 'success', 'warning', 'error', 'system', 'welcome'
      // Use 'success' / 'warning' for type to adhere to constraint, and record 'kyc_verified' / 'kyc_rejected' in metadata.category
      const { error: notifErr } = await adminClient.from('notifications').insert({
        user_id: doc.user_id,
        title: notifTitle,
        message: notifMessage,
        type: isApproved ? 'success' : 'warning',
        action_url: '/dashboard/settings/kyc',
        action_text: isApproved ? 'View Verification Status' : 'Re-upload Document',
        is_read: false,
        metadata: {
          category: isApproved ? 'kyc_verified' : 'kyc_rejected',
          document_id: doc.id,
          document_type: doc.document_type,
          status,
          rejection_reason: isApproved ? null : reasonText,
          verified_by: adminUserId || null,
        },
      })

      if (!notifErr) {
        results.dashboard = true
        console.log(`[KYC Notification] In-app dashboard notification created for user ${doc.user_id}`)
      } else {
        console.error('[KYC Notification] Failed to insert dashboard notification:', notifErr)
      }
    } catch (dashErr) {
      console.error('[KYC Notification] Error in dashboard notification:', dashErr)
    }

    // =========================================================================
    // CHANNEL 2: Email Notification (via Resend)
    // =========================================================================
    const resendKey = process.env.RESEND_API_KEY || process.env.RESEND_PRIVATE_KEY
    if (resendKey && userEmail) {
      try {
        const emailSubject = isApproved
          ? `✅ KYC Verified: Your Trinetra AI Account is Approved for Calling`
          : `Action Required: KYC Verification Update for ${orgName} | Trinetra AI`

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background-color: #121217; border: 1px solid #27272a; border-radius: 16px; padding: 32px; }
    .logo { font-size: 20px; font-weight: 800; color: #a78bfa; letter-spacing: -0.5px; margin-bottom: 24px; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
    .badge-approved { background-color: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-rejected { background-color: rgba(244, 63, 94, 0.15); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.3); }
    h2 { margin: 0 0 12px 0; font-size: 20px; color: #ffffff; }
    p { margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa; }
    .card { background-color: #18181f; border: 1px solid #27272a; border-radius: 12px; padding: 18px; margin: 20px 0; }
    .card-row { display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; border-bottom: 1px solid #27272a; }
    .card-row:last-child { border-bottom: none; }
    .card-label { color: #71717a; font-weight: 500; }
    .card-val { color: #f4f4f5; font-weight: 600; }
    .rejection-box { background-color: rgba(244, 63, 94, 0.08); border: 1px solid rgba(244, 63, 94, 0.25); border-radius: 10px; padding: 16px; margin: 20px 0; }
    .rejection-title { color: #f43f5e; font-size: 13px; font-weight: 700; margin-bottom: 6px; }
    .rejection-text { color: #fda4af; font-size: 13px; line-height: 1.5; margin: 0; }
    .btn { display: inline-block; background-color: #7c3aed; color: #ffffff !important; padding: 12px 24px; border-radius: 10px; font-size: 13px; font-weight: 700; text-decoration: none; margin-top: 12px; }
    .footer { border-top: 1px solid #27272a; padding-top: 20px; margin-top: 28px; font-size: 11px; color: #71717a; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">⚡ TRINETRA AI</div>
    <div class="badge ${isApproved ? 'badge-approved' : 'badge-rejected'}">
      ${isApproved ? 'Verification Approved' : 'Action Required — Verification Declined'}
    </div>
    <h2>${isApproved ? 'Your KYC Document Has Been Approved!' : 'KYC Document Verification Update'}</h2>
    <p>Hello ${userName},</p>
    <p>
      ${
        isApproved
          ? `We are pleased to inform you that your statutory identity document has been reviewed and verified by our compliance team in compliance with Telecom Regulatory Authority (TRAI) and DPDP statutory standards.`
          : `Our statutory compliance team reviewed your submitted identity document for <strong>${orgName}</strong>, but unfortunately it could not be approved at this time.`
      }
    </p>

    <div class="card">
      <div class="card-row">
        <span class="card-label">Document Category</span>
        <span class="card-val">${docTitle}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Organization</span>
        <span class="card-val">${orgName}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Masked Identifier</span>
        <span class="card-val">${doc.id_number_masked || '•••• •••• ••••'}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Review Status</span>
        <span class="card-val" style="color: ${isApproved ? '#10b981' : '#f43f5e'};">${isApproved ? 'Verified' : 'Rejected'}</span>
      </div>
    </div>

    ${
      !isApproved
        ? `
    <div class="rejection-box">
      <div class="rejection-title">⚠️ Reason for Rejection:</div>
      <p class="rejection-text">${reasonText}</p>
    </div>
    <p>
      Please upload a fresh, clear, and unblurred copy of your statutory document. Ensure that the name on the ID matches the registered entity signatory.
    </p>
    `
        : `
    <p>
      🎉 Your organization now has full permissions to purchase virtual DID numbers, connect telephony trunks, and run automated outbound voice campaigns.
    </p>
    `
    }

    <a href="${kycPortalUrl}" class="btn">
      ${isApproved ? 'Open Calling Dashboard →' : 'Re-upload KYC Document →'}
    </a>

    <div class="footer">
      This is an automated statutory notification from Trinetra AI Compliance. All documents are stored in an AES-256 encrypted vault pursuant to the Digital Personal Data Protection (DPDP) Act and Department of Telecommunications (DoT) regulations.<br><br>
      © ${new Date().getFullYear()} Trinetra AI Technologies. All rights reserved.
    </div>
  </div>
</body>
</html>
`

        const emailPlainText = isApproved
          ? `Hello ${userName},\n\nYour KYC document (${docTitle}) for organization "${orgName}" has been officially verified and approved.\n\nYou can now provision dedicated phone numbers and run live outbound voice calls.\n\nAccess your dashboard: ${kycPortalUrl}\n\nTrinetra AI Compliance Team`
          : `Hello ${userName},\n\nYour KYC document (${docTitle}) for organization "${orgName}" could not be approved.\n\nReason: ${reasonText}\n\nPlease visit ${kycPortalUrl} to review guidelines and upload an updated document.\n\nTrinetra AI Compliance Team`

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Trinetra AI Compliance <alerts@trinetraedu-ai.com>',
            to: [userEmail],
            subject: emailSubject,
            html: emailHtml,
            text: emailPlainText,
          }),
        })

        if (emailRes.ok) {
          results.email = true
          console.log(`[KYC Notification] Verification email sent to ${userEmail} (status: ${status})`)
        } else {
          const errData = await emailRes.text()
          console.warn('[KYC Notification] Resend email API responded with error:', errData)
        }
      } catch (emailErr) {
        console.error('[KYC Notification] Failed to send email via Resend:', emailErr)
      }
    } else {
      console.log('[KYC Notification] Resend API key or user email missing, skipping email.')
    }

    // =========================================================================
    // CHANNEL 3: WhatsApp Notification (via Twilio WhatsApp)
    // =========================================================================
    if (userPhone && userPhone.length >= 10) {
      try {
        const twilioCreds = await getTwilioCredentials(adminClient, doc.organization_id)
        if (twilioCreds) {
          const waBody = isApproved
            ? `✅ *KYC Verification Approved* | *Trinetra AI*\n\n` +
              `Hello ${userName},\n` +
              `Great news! Your statutory document (*${docTitle}*) for *${orgName}* has been verified and approved by our compliance team.\n\n` +
              `🎉 Your workspace is now unlocked for dedicated virtual phone number allocation and outbound AI voice calling.\n\n` +
              `👉 Open your dashboard: ${kycPortalUrl}\n\n` +
              `Warm regards,\n*Trinetra AI Compliance Team*`
            : `❌ *KYC Verification Update* | *Trinetra AI*\n\n` +
              `Hello ${userName},\n` +
              `Your submitted document (*${docTitle}*) for *${orgName}* could not be approved during compliance review.\n\n` +
              `📋 *Reason for Rejection:*\n` +
              `_${reasonText}_\n\n` +
              `⚠️ *Action Required:*\n` +
              `Please upload an updated, readable copy of your document to continue verification.\n\n` +
              `👉 Re-upload document: ${kycPortalUrl}\n\n` +
              `Need help? Reply directly to this message.\n\n` +
              `Warm regards,\n*Trinetra AI Compliance Team*`

          const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioCreds.sid}/Messages.json`
          const params = new URLSearchParams()
          params.append('From', twilioCreds.from.startsWith('whatsapp:') ? twilioCreds.from : `whatsapp:${twilioCreds.from}`)
          params.append('To', `whatsapp:${userPhone}`)
          params.append('Body', waBody)

          const waRes = await fetch(url, {
            method: 'POST',
            headers: {
              Authorization: 'Basic ' + Buffer.from(`${twilioCreds.sid}:${twilioCreds.token}`).toString('base64'),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          })

          if (waRes.ok) {
            results.whatsapp = true
            console.log(`[KYC Notification] WhatsApp notification sent to ${userPhone}`)
          } else {
            const waErrText = await waRes.text()
            console.warn('[KYC Notification] Twilio WhatsApp API responded with status:', waRes.status, waErrText)
          }
        } else {
          console.log('[KYC Notification] Twilio WhatsApp credentials not configured, skipping WhatsApp dispatch.')
        }
      } catch (waErr) {
        console.warn('[KYC Notification] Failed to dispatch WhatsApp notification:', waErr)
      }
    } else {
      console.log('[KYC Notification] User profile has no registered phone number, skipping WhatsApp dispatch.')
    }
  } catch (err) {
    console.error('[KYC Notification] Unexpected error in dispatchKYCReviewNotification:', err)
  }

  return results
}
