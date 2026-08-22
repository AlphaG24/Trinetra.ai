// ============================================================================
// SECURITY: Shared API Route Authentication & Error Handling
//
// Provides:
// 1. requireAuth()     — Returns authenticated user or 401 response
// 2. requireAdmin()    — Returns admin user or 403 response
// 3. safeApiHandler()  — Wraps route handlers to catch errors safely
// 4. sanitizeError()   — Strips stack traces from production responses
// ============================================================================

import { createClient } from '@/utils/supabase/server'

/**
 * Verify the caller is authenticated via Supabase session cookies.
 * Returns the authenticated user, or a pre-built 401 Response.
 */
export async function requireAuth(): Promise<
  { user: { id: string; email?: string }; supabase: Awaited<ReturnType<typeof createClient>> }
  | Response
> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return Response.json(
      { error: 'Authentication required.' },
      { status: 401 }
    )
  }

  return { user: { id: user.id, email: user.email }, supabase }
}

/**
 * Verify the caller is authenticated AND has admin role.
 * Checks profiles.role === 'admin'.
 */
export async function requireAdmin(): Promise<
  { user: { id: string; email?: string }; supabase: Awaited<ReturnType<typeof createClient>> }
  | Response
> {
  const authResult = await requireAuth()

  // If requireAuth returned a Response (401), pass it through
  if (authResult instanceof Response) {
    return authResult
  }

  const { user, supabase } = authResult

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !['admin', 'super_admin'].includes(profile?.role || '')) {
    return Response.json(
      { error: 'Forbidden. Admin access required.' },
      { status: 403 }
    )
  }

  return { user, supabase }
}

/**
 * Wrap an API route handler to catch unhandled errors and return
 * sanitized error responses. Never leaks stack traces in production.
 */
export function safeApiHandler<T extends any[]>(
  handler: (request: Request, ...args: T) => Promise<Response>
): (request: Request, ...args: T) => Promise<Response> {
  return async (request: Request, ...args: T) => {
    try {
      return await handler(request, ...args)
    } catch (error: unknown) {
      console.error('[API Error]', error)
      return Response.json(
        { error: sanitizeError(error) },
        { status: 500 }
      )
    }
  }
}

/**
 * Strip stack traces and internal details from error messages
 * in production. In development, return the full message.
 */
export function sanitizeError(error: unknown): string {
  if (process.env.NODE_ENV === 'development') {
    if (error instanceof Error) return error.message
    return String(error)
  }
  // Production: generic message only
  return 'An unexpected error occurred. Please try again.'
}
