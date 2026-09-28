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
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const setOptions = {
              ...options,
              domain: cookieDomain || options?.domain,
              path: '/',
              sameSite: 'lax' as const,
              secure: isProd,
            }
            request.cookies.set(name, value)
            supabaseResponse.cookies.set({ name, value, ...setOptions })
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

  // Refresh user session without extra database queries
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthRoute = currentPath === '/login' || currentPath === '/signup'
  const isProtectedRoute = currentPath.startsWith('/dashboard') || currentPath.startsWith('/admin')

  // Unauthenticated user trying to access protected area
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', currentPath)
    return NextResponse.redirect(url)
  }

  // Authenticated user trying to access login/signup
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
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
