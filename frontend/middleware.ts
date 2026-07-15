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

// ============================================================================
// SECURITY: Persistent Database-Backed Sliding Window Rate Limiting (Serverless-Safe)
// ============================================================================

async function checkDatabaseRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ limited: boolean; remaining: number; resetSeconds: number }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      // Safe fallback: allow request if configuration is missing
      return { limited: false, remaining: 1, resetSeconds: 60 }
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/check_rate_limit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        p_key: key,
        p_max_requests: limit,
        p_window_seconds: windowSeconds,
      }),
    })

    if (!response.ok) {
      console.error('[RateLimit Error] Database check failed:', await response.text())
      return { limited: false, remaining: 1, resetSeconds: 60 }
    }

    const data = await response.json()
    if (Array.isArray(data) && data.length > 0) {
      const result = data[0]
      return {
        limited: result.limited,
        remaining: result.remaining,
        resetSeconds: result.reset_seconds,
      }
    }
    return { limited: false, remaining: 1, resetSeconds: 60 }
  } catch (error) {
    console.error('[RateLimit Exception] Failed to run check:', error)
    return { limited: false, remaining: 1, resetSeconds: 60 }
  }
}

function getDatabaseRateLimitConfig(pathname: string, userId: string, ip: string): { limit: number; windowSeconds: number; key: string } {
  if (pathname === '/api/admin/login') {
    return { limit: 5, windowSeconds: 900, key: `rl:admin_login:${ip}` }
  }
  if (pathname.startsWith('/api/auth') || pathname.startsWith('/auth') || pathname === '/login' || pathname === '/signup') {
    return { limit: 10, windowSeconds: 900, key: `rl:auth:${ip}` }
  }
  if (pathname === '/api/webhooks/vapi') {
    return { limit: 100, windowSeconds: 60, key: `rl:vapi_webhook:${ip}` }
  }
  if (pathname === '/api/ingest') {
    const userKey = userId || ip
    return { limit: 20, windowSeconds: 3600, key: `rl:ingest:${userKey}` }
  }
  if (pathname.startsWith('/api/audit')) {
    const userKey = userId || ip
    return { limit: 30, windowSeconds: 60, key: `rl:audit:${userKey}` }
  }
  // All other API routes
  if (pathname.startsWith('/api/')) {
    const userKey = userId || ip
    return { limit: 100, windowSeconds: 60, key: `rl:other_api:${userKey}` }
  }
  return { limit: 100, windowSeconds: 60, key: `rl:default:${ip}` }
}

// ============================================================================
// SECURITY: Global Security Headers (CSP, HSTS, Frame Protection)
// ============================================================================

function applySecurityHeaders(response: NextResponse): NextResponse {
  const isReportOnly = process.env.NEXT_PUBLIC_CSP_REPORT_ONLY === 'true'
  const cspHeaderName = isReportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy'

  const cspHeaderValue = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdnjs.cloudflare.com https://apis.google.com https://accounts.google.com https://*.vapi.ai https://*.daily.co blob:;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://lh3.googleusercontent.com https://*.supabase.co https://i.postimg.cc https://assets.trinetraedu-ai.com;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 https://*.trycloudflare.com https://*.onrender.com https://api.vapi.ai https://*.supabase.co wss://*.supabase.co https://formspree.io https://*.googleapis.com https://*.vapi.ai wss://*.vapi.ai https://*.daily.co wss://*.daily.co wss://*.wss.daily.co https://*.pluot.blue wss://*.pluot.blue https://raw.githubusercontent.com blob: data: stun: turn:;
    media-src 'self' blob: https://storage.vapi.ai;
    worker-src 'self' blob:;
    child-src 'self' blob:;
    frame-src 'self' https://accounts.google.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\n/g, '').replace(/\s{2,}/g, ' ').trim()

  response.headers.set(cspHeaderName, cspHeaderValue)
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(), payment=(), usb=()')
  response.headers.set('X-XSS-Protection', '0')

  return response
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
  // STEP 1: Supabase Auth Session Refresh
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const userId = user?.id || ''

  // ------------------------------------------------------------------
  // STEP 2: Input Validation on URL (query params + pathname)
  // ------------------------------------------------------------------
  const fullUrl = request.nextUrl.search + request.nextUrl.pathname
  const decodedUrl = decodeURIComponent(fullUrl)
  const { blocked, reason } = containsMaliciousPayload(decodedUrl)

  if (blocked) {
    logSecurityEvent('MALICIOUS_REQUEST_BLOCKED', { ip, path: currentPath, reason })
    const response = new NextResponse(
      JSON.stringify({ error: 'Request blocked by security policy.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
    return applySecurityHeaders(response)
  }

  // ------------------------------------------------------------------
  // STEP 3: Persistent Database-Backed Rate Limiting
  // ------------------------------------------------------------------
  const isApiRoute = currentPath.startsWith('/api/')
  const isAuthRoute = currentPath.startsWith('/auth') || currentPath === '/login' || currentPath === '/signup'

  if (isApiRoute || isAuthRoute) {
    const config = getDatabaseRateLimitConfig(currentPath, userId, ip)
    const { limited, remaining, resetSeconds } = await checkDatabaseRateLimit(config.key, config.limit, config.windowSeconds)

    if (limited) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip, path: currentPath, limit: config.limit, key: config.key })
      const response = new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(resetSeconds),
            'X-RateLimit-Limit': String(config.limit),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(resetSeconds),
          },
        }
      )
      return applySecurityHeaders(response)
    }

    supabaseResponse.headers.set('X-RateLimit-Limit', String(config.limit))
    supabaseResponse.headers.set('X-RateLimit-Remaining', String(remaining))
    supabaseResponse.headers.set('X-RateLimit-Reset', String(resetSeconds))
  } else {
    // In-memory sliding window rate limiting for general static assets/pages
    const { maxRequests, windowMs } = getRateLimitConfig(currentPath)
    const rateLimitKey = `mem:${ip}:general`
    const { limited, retryAfterSeconds } = isRateLimited(rateLimitKey, maxRequests, windowMs)

    if (limited) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED_IN_MEMORY', { ip, path: currentPath, limit: maxRequests })
      const response = new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfterSeconds),
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(retryAfterSeconds),
          },
        }
      )
      return applySecurityHeaders(response)
    }
  }

  // ------------------------------------------------------------------
  // STEP 4: Route Protection & Gating
  // ------------------------------------------------------------------
  const isDashboardRoute = currentPath.startsWith('/dashboard')
  const isAdminRoute = currentPath.startsWith('/admin') || currentPath.startsWith('/admin-blog')
  const isPartnerDashboard = currentPath.startsWith('/partners/dashboard')

  if (!user && (isDashboardRoute || isAdminRoute || isPartnerDashboard)) {
    const url = request.nextUrl.clone()
    url.pathname = isPartnerDashboard ? '/partners/login' : '/login'
    return NextResponse.redirect(url)
  }

  if (user && (currentPath === '/login' || currentPath === '/partners/login' || currentPath === '/')) {
    const url = request.nextUrl.clone()
    url.pathname = currentPath.startsWith('/partners') ? '/partners/dashboard' : '/dashboard'
    return NextResponse.redirect(url)
  }

  return applySecurityHeaders(supabaseResponse)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}