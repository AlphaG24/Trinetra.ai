import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const isProd = process.env.NODE_ENV === 'production'
  let cookieDomain: string | undefined = undefined
  const host = request.headers.get('host') || ''
  const cleanHost = host.split(':')[0]
  if (isProd && cleanHost && !cleanHost.includes('dev.') && !cleanHost.includes('localhost')) {
    if (cleanHost.endsWith('trinetraedu-ai.com')) {
      cookieDomain = '.trinetraedu-ai.com'
    } else if (cleanHost.endsWith('trinetra.ai')) {
      cookieDomain = '.trinetra.ai'
    }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const all = request.cookies.getAll()
          // Deduplicate cookies by name to prevent conflicting chunk or token parsing
          const map = new Map<string, string>()
          for (const c of all) {
            if (!map.has(c.name) || (c.value && !map.get(c.name))) {
              map.set(c.name, c.value)
            }
          }
          return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const isClearing = !value || options?.maxAge === 0
            const setOptions = {
              ...options,
              domain: cookieDomain || options?.domain,
              path: '/',
              sameSite: 'lax' as const,
              secure: isProd,
            }
            request.cookies.set(name, value)
            supabaseResponse.cookies.set({ name, value, ...setOptions })

            // If clearing, ensure host cookie is also cleared
            if (isClearing && cookieDomain) {
              try {
                supabaseResponse.cookies.set({ name, value: '', path: '/', maxAge: 0 })
              } catch {}
            }
          })
        },
      },
    }
  )

  const currentPath = request.nextUrl.pathname

  // Fast bypass for static files, next internals, and public assets
  if (
    currentPath.startsWith('/_next') ||
    currentPath.startsWith('/api/') ||
    currentPath.startsWith('/auth/') ||
    currentPath.includes('.')
  ) {
    return supabaseResponse
  }

  const isAuthRoute = currentPath === '/login' || currentPath === '/signup'
  const isProtectedRoute = currentPath.startsWith('/dashboard') || currentPath.startsWith('/admin')

  // If not a protected route and not an auth route, avoid blocking public page loads
  if (!isProtectedRoute && !isAuthRoute) {
    return supabaseResponse
  }

  // Fast path: If accessing login or signup without any auth cookies, bypass immediately (0ms latency)
  const allCookies = request.cookies.getAll()
  const hasAuthCookie = allCookies.some(
    c => c.name.includes('auth-token') || c.name.startsWith('sb-')
  )

  if (isAuthRoute && !hasAuthCookie) {
    return supabaseResponse
  }

  // Fast path: If accessing a protected route without any auth cookies, redirect immediately
  if (isProtectedRoute && !hasAuthCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', currentPath)
    return NextResponse.redirect(url)
  }

  // Refresh user session with a 3.5s timeout guard to prevent page hangs
  let user = null
  let authFailedOrTimedOut = false
  try {
    const userPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise<{ data: { user: null }; error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase Auth timeout')), 3500)
    )

    const result = await Promise.race([userPromise, timeoutPromise])
    user = result?.data?.user ?? null
    if (result?.error) {
      authFailedOrTimedOut = true
    }
  } catch (err) {
    authFailedOrTimedOut = true
    console.warn('[Middleware] Auth check timed out or failed:', err instanceof Error ? err.message : err)
  }

  // Unauthenticated user trying to access protected area
  // If user has auth cookies, do not trigger a premature redirect storm during navigation or soft errors
  if (!user && isProtectedRoute) {
    if (hasAuthCookie) {
      console.warn('[Middleware] Allowing protected request through with active auth cookies (auth deferred to layout)')
      return supabaseResponse
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', currentPath)
    return NextResponse.redirect(url)
  }


  // Authenticated user trying to access login/signup
  if (user && isAuthRoute) {
    const userEmail = (user.email || '').toLowerCase().trim()
    const metaRole = (user.app_metadata?.role || user.user_metadata?.role || '').toLowerCase().trim()
    const isSuperAdmin = userEmail === 'raghav00424@gmail.com' || userEmail === 'raghav@trinetra.ai' || metaRole === 'admin' || metaRole === 'super_admin'

    const url = request.nextUrl.clone()
    url.pathname = isSuperAdmin ? '/admin' : '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images/assets (*.svg, *.png, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
