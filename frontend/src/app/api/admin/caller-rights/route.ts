import { requireAdmin, safeApiHandler } from '@/utils/apiAuth'
import { NextResponse } from 'next/server'

const FASTAPI_URL = process.env.FASTAPI_URL || process.env.INTERNAL_BACKEND_URL || process.env.BACKEND_URL || 'http://127.0.0.1:8000'

/**
 * Statutory Caller Rights Admin API Route (DPDP Act 2023 Sec 11/12 & GDPR Art 15, 17, 20).
 * Handles search, machine-readable export, and right-to-erasure.
 * Protected by requireAdmin() (SEC-003, SEC-006, API-001).
 */
export const POST = safeApiHandler(async (request: Request) => {
  const authRes = await requireAdmin()
  if (authRes instanceof Response) return authRes

  const { user } = authRes

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const { action, organization_id, phone_number, format, dry_run, reason } = body

  if (!action || !['search', 'export', 'delete'].includes(action)) {
    return NextResponse.json(
      { error: "Invalid action. Supported actions: 'search', 'export', 'delete'" },
      { status: 400 }
    )
  }

  if (!organization_id || typeof organization_id !== 'string') {
    return NextResponse.json({ error: 'organization_id is required' }, { status: 400 })
  }

  if (!phone_number || typeof phone_number !== 'string' || phone_number.trim().length < 7) {
    return NextResponse.json({ error: 'Valid phone_number is required' }, { status: 400 })
  }

  try {
    let endpoint = `${FASTAPI_URL}/api/caller-rights/search`
    let payload: Record<string, any> = {
      organization_id: organization_id.trim(),
      phone_number: phone_number.trim(),
    }

    if (action === 'export') {
      endpoint = `${FASTAPI_URL}/api/caller-rights/export`
      payload.format = format === 'csv' ? 'csv' : 'json'
    } else if (action === 'delete') {
      endpoint = `${FASTAPI_URL}/api/caller-rights/delete`
      payload.dry_run = dry_run === false ? false : true // Strict safe default
      payload.reason = reason || 'caller_gdpr_dpdp_request'
      payload.requested_by = user.email || user.id
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[Admin Caller Rights API] Backend responded with ${response.status}: ${errText}`)
      return NextResponse.json(
        { error: 'Failed to process caller rights request.' },
        { status: response.status >= 500 ? 502 : response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Admin Caller Rights API] Network or server error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred while communicating with the service.' },
      { status: 500 }
    )
  }
})
