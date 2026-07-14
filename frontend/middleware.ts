import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ============================================================================
// SECURITY: Rate Limiting (In-Memory Sliding Window)
//
// Uses a per-isolate Map. On Vercel Edge, each isolate maintains its own map.
// This provides effective per-instance rate limiting. For multi-region HA,
// upgrade to @vercel/edge-rate-limit or an external Redis store.
// ============================================================================

interface RateLimitEntry {
  timestamps: number[]
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup stale entries every 60 seconds to prevent memory leaks
const CLEANUP_INTERVAL_MS = 60_000
let lastCleanup = Date.now()

function cleanupStaleEntries() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now

  const staleThreshold = now - 120_000 // 2 minutes
  for (const [key, entry] of rateLimitStore) {
    if (entry.timestamps.length === 0 || entry.timestamps[entry.timestamps.length - 1] < staleThreshold) {
      rateLimitStore.delete(key)
    }
  }
}

function isRateLimited(ip: string, maxRequests: number, windowMs: number): { limited: boolean; retryAfterSeconds: number } {
  cleanupStaleEntries()

  const now = Date.now()
  const windowStart = now - windowMs
  const entry = rateLimitStore.get(ip) || { timestamps: [] }

  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter(t => t > windowStart)
  entry.timestamps.push(now)
  rateLimitStore.set(ip, entry)

  if (entry.timestamps.length > maxRequests) {
    const oldestInWindow = entry.timestamps[0]
    const retryAfterMs = oldestInWindow + windowMs - now
    return { limited: true, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) }
  }

  return { limited: false, retryAfterSeconds: 0 }
}

// ============================================================================
// SECURITY: Input Validation — Block SQL Injection, XSS, Path Traversal
// ============================================================================

// SQL injection patterns (case-insensitive)
const SQL_INJECTION_PATTERNS = [
  /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|EXECUTE)\b\s)/i,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,        // OR 1=1, AND 1=1
  /(--|\/\*|\*\/|;--)/,                         // SQL comments
  /(';\s*(DROP|DELETE|UPDATE|INSERT))/i,         // Chained SQL
  /(xp_|sp_|0x[0-9a-f]{8})/i,                   // Stored proc / hex injection
]

// XSS patterns
const XSS_PATTERNS = [
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on(error|load|click|mouseover|focus|blur)\s*=/i,
  /<iframe[\s>]/i,
  /<object[\s>]/i,
  /<embed[\s>]/i,
  /<svg[\s>].*?on\w+\s*=/i,
  /\beval\s*\(/i,
  /\bdocument\s*\.\s*(cookie|write|location)/i,
]

// Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//,       // ../
  /\.\.\\/,       // ..\
  /%2e%2e/i,      // URL-encoded ../
  /%00/,          // Null byte injection
]

function containsMaliciousPayload(input: string): { blocked: boolean; reason: string } {
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return { blocked: true, reason: 'sql_injection' }
    }
  }
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      return { blocked: true, reason: 'xss' }
    }
  }
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(input)) {
      return { blocked: true, reason: 'path_traversal' }
    }
  }
  return { blocked: false, reason: '' }
}

// ============================================================================
// SECURITY: Rate limit tiers
// ============================================================================

function getRateLimitConfig(pathname: string): { maxRequests: number; windowMs: number } {
  // Auth routes — strictest limit
  if (pathname === '/login' || pathname === '/signup' || pathname.startsWith('/auth')) {
    return { maxRequests: 10, windowMs: 60_000 }
  }
  // API routes — moderate limit
  if (pathname.startsWith('/api/')) {
    return { maxRequests: 30, windowMs: 60_000 }
  }
  // General routes — standard limit
  return { maxRequests: 100, windowMs: 60_000 }
}

// ============================================================================
// SECURITY: Security event logging (structured, PII-safe)
// ============================================================================

function logSecurityEvent(event: string, details: Record<string, string | number>) {
  // Never log tokens, passwords, or full IPs in production
  const sanitized = { ...details }
  if (typeof sanitized.ip === 'string' && sanitized.ip.includes('.')) {
    // Mask last octet for privacy: 192.168.1.100 → 192.168.1.xxx
    const parts = sanitized.ip.split('.')
    if (parts.length === 4) {
      parts[3] = 'xxx'
      sanitized.ip = parts.join('.')
    }
  }
  console.log(JSON.stringify({
    type: 'SECURITY',
    event,
    timestamp: new Date().toISOString(),
    ...sanitized,
  }))
}

// ============================================================================
// MAIN MIDDLEWARE
// ============================================================================

export async function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'

  const currentPath = request.nextUrl.pathname

  // ------------------------------------------------------------------
  // STEP 1: Rate Limiting
  // ------------------------------------------------------------------
  const { maxRequests, windowMs } = getRateLimitConfig(currentPath)
  const rateLimitKey = `${ip}:${currentPath.startsWith('/api/') ? 'api' : currentPath.startsWith('/login') || currentPath.startsWith('/signup') || currentPath.startsWith('/auth') ? 'auth' : 'general'}`
  const { limited, retryAfterSeconds } = isRateLimited(rateLimitKey, maxRequests, windowMs)

  if (limited) {
    logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip, path: currentPath, limit: maxRequests })
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  // ------------------------------------------------------------------
  // STEP 2: Input Validation on URL (query params + pathname)
  // ------------------------------------------------------------------
  const fullUrl = request.nextUrl.search + request.nextUrl.pathname
  const decodedUrl = decodeURIComponent(fullUrl)
  const { blocked, reason } = containsMaliciousPayload(decodedUrl)

  if (blocked) {
    logSecurityEvent('MALICIOUS_REQUEST_BLOCKED', { ip, path: currentPath, reason })
    return new NextResponse(
      JSON.stringify({ error: 'Request blocked by security policy.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // ------------------------------------------------------------------
  // STEP 3: Supabase Auth Session Refresh
  // ------------------------------------------------------------------
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set({
              name,
              value,
              ...options,
              // SECURITY: Enforce secure cookie attributes
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax', // 'strict' breaks OAuth redirect flows
              path: '/',
            })
          })
        },
      },
    }
  )

  // Validate the session (also refreshes the token if needed)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ------------------------------------------------------------------
  // STEP 4: Route Protection
  // ------------------------------------------------------------------

  // Protect dashboard routes — redirect unauthenticated users to login
  if (!user && currentPath.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Prevent logged-in users from getting stuck on auth pages
  if (user && (currentPath === '/login' || currentPath === '/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}