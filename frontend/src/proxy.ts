import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set({ name, value, ...options })
          })
        },
      },
    }
  )

  const currentPath = request.nextUrl.pathname

  // Skip auth and proxy checks immediately for API routes, auth callbacks, and static/internal assets
  if (
    currentPath.startsWith('/api/') || 
    currentPath.startsWith('/auth/') || 
    currentPath.startsWith('/_next/') ||
    request.headers.get('next-router-prefetch') || 
    request.headers.get('purpose') === 'prefetch'
  ) {
    return supabaseResponse
  }

  const { data: { user } } = await supabase.auth.getUser()

  // If not logged in
  if (!user) {
    if (currentPath.startsWith('/dashboard') || currentPath.startsWith('/admin') || currentPath === '/consent') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Check cached role from cookies to avoid remote DB round-trip on every navigation
  const cachedRole = request.cookies.get('x-user-role')?.value
  const cachedOnboarding = request.cookies.get('x-user-onboarding')?.value

  let userRole = cachedRole || user.user_metadata?.role || 'client'
  let onboardingComplete = cachedOnboarding !== undefined ? cachedOnboarding === 'true' : true

  if (!cachedRole) {
    // Cache miss — fetch profile from database once and cache in cookie
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_complete')
      .eq('id', user.id)
      .single()

    if (!profile) {
      // No profile — clear session and redirect to login
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      const response = NextResponse.redirect(url)
      request.cookies.getAll().forEach(cookie => {
        if (cookie.name.startsWith('sb-')) {
          response.cookies.set(cookie.name, '', { maxAge: 0, path: '/' })
        }
      })
      return response
    }

    userRole = profile.role || 'client'
    onboardingComplete = profile.onboarding_complete ?? true

    // Set cookies for fast subsequent checks
    supabaseResponse.cookies.set('x-user-role', userRole, { maxAge: 600, path: '/', sameSite: 'lax' })
    supabaseResponse.cookies.set('x-user-onboarding', String(onboardingComplete), { maxAge: 600, path: '/', sameSite: 'lax' })
  }
  const isAdmin = userRole === 'admin' || userRole === 'super_admin'

  // Redirect from login/signup/homepage to proper dashboard
  if (currentPath === '/login' || currentPath === '/signup' || currentPath === '/') {
    const url = request.nextUrl.clone()
    url.pathname = isAdmin ? '/admin' : '/dashboard'
    return NextResponse.redirect(url)
  }

  // Role-based protection
  if (isAdmin) {
    // Admins should not access client dashboard
    if (currentPath.startsWith('/dashboard')) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
  } else {
    // Clients should not access admin
    if (currentPath.startsWith('/admin')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Onboarding check
    if (currentPath.startsWith('/dashboard')) {
      if (!onboardingComplete) {
        if (!currentPath.startsWith('/dashboard/onboarding')) {
          const url = request.nextUrl.clone()
          url.pathname = '/dashboard/onboarding'
          return NextResponse.redirect(url)
        }
      } else {
        if (currentPath.startsWith('/dashboard/onboarding')) {
          const url = request.nextUrl.clone()
          url.pathname = '/dashboard'
          return NextResponse.redirect(url)
        }
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
