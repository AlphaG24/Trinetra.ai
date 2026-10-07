import { requireAdmin, safeApiHandler } from '@/utils/apiAuth'
import { NextResponse } from 'next/server'

const FASTAPI_URL = process.env.FASTAPI_URL || process.env.INTERNAL_BACKEND_URL || process.env.BACKEND_URL || 'http://127.0.0.1:8000'

/**
 * Statutory Data Retention Admin Route (CERT-In 180-Day / IT Act 8-Year Split).
 * Protected by requireAdmin() (SEC-003, SEC-006, API-001).
 */
export const GET = safeApiHandler(async () => {
  const authRes = await requireAdmin()
  if (authRes instanceof Response) return authRes

  try {
    const response = await fetch(`${FASTAPI_URL}/api/retention/policies`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to retrieve retention policies.' },
        { status: response.status >= 500 ? 502 : response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Admin Retention API GET] Error communicating with backend:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching retention policies.' },
      { status: 500 }
    )
  }
})

export const POST = safeApiHandler(async (request: Request) => {
  const authRes = await requireAdmin()
  if (authRes instanceof Response) return authRes

  const { user } = authRes

  let body: any = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const { action = 'audit', organization_id, dry_run } = body

  if (!['audit', 'purge'].includes(action)) {
    return NextResponse.json(
      { error: "Invalid action. Supported actions: 'audit', 'purge'" },
      { status: 400 }
    )
  }

  try {
    const endpoint = action === 'purge'
      ? `${FASTAPI_URL}/api/retention/purge`
      : `${FASTAPI_URL}/api/retention/audit`

    const payload: Record<string, any> = {
      organization_id: organization_id || null,
    }

    if (action === 'purge') {
      payload.dry_run = dry_run === false ? false : true // Strict safe default
      payload.requested_by = user.email || user.id
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[Admin Retention API POST] Backend responded with ${response.status}: ${errText}`)
      return NextResponse.json(
        { error: 'Failed to execute retention action.' },
        { status: response.status >= 500 ? 502 : response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Admin Retention API POST] Error communicating with backend:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred while communicating with retention service.' },
      { status: 500 }
    )
  }
})
