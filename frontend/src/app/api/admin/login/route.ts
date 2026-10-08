import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

// Decision A5: Login rate limit is 5 attempts per 10 minutes (600s)
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5
const LOGIN_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const loginAttempts = new Map<string, number[]>()

function checkLoginRateLimit(ipOrIdentifier: string): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now()
  const cutoff = now - LOGIN_RATE_LIMIT_WINDOW_MS
  const history = (loginAttempts.get(ipOrIdentifier) || []).filter(t => t > cutoff)

  if (history.length >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    const oldest = history[0]
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + LOGIN_RATE_LIMIT_WINDOW_MS - now) / 1000))
    loginAttempts.set(ipOrIdentifier, history)
    return { allowed: false, remaining: 0, retryAfterSeconds }
  }

  history.push(now)
  loginAttempts.set(ipOrIdentifier, history)
  return { allowed: true, remaining: LOGIN_RATE_LIMIT_MAX_ATTEMPTS - history.length, retryAfterSeconds: 0 }
}

// POST /api/admin/login
// Verifies the authenticated user has admin/super_admin role.
// The password field is an optional extra layer — if ADMIN_PASSWORD is set in env,
// the password must match. If not set, role-check alone is sufficient.
export async function POST(req: Request) {
  try {
    // 1. Enforce Decision A5 Login Rate Limit (5 attempts / 10 minutes)
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || '127.0.0.1'
    const rateLimit = checkLoginRateLimit(clientIp)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.` },
        { 
          status: 429, 
          headers: { 
            'Retry-After': String(rateLimit.retryAfterSeconds),
            'X-RateLimit-Limit': String(LOGIN_RATE_LIMIT_MAX_ATTEMPTS),
            'X-RateLimit-Remaining': '0',
          } 
        }
      )
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated. Please log in first.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 })
    }

    // Optional extra password gate — only enforced if ADMIN_PASSWORD is configured
    const adminPassword = process.env.ADMIN_PASSWORD
    if (adminPassword) {
      const body = await req.json().catch(() => ({}))
      const { password } = body
      if (!password || password !== adminPassword) {
        return NextResponse.json({ error: 'Incorrect admin password.' }, { status: 401 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
