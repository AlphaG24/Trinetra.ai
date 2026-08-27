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

  const { data: { user } } = await supabase.auth.getUser()
  const currentPath = request.nextUrl.pathname

  // Skip auth checks for API routes and auth callbacks
  if (currentPath.startsWith('/api/') || currentPath.startsWith('/auth/')) {
    return supabaseResponse
  }

  // If not logged in and trying to access protected route, redirect to login
  if (!user) {
    if (currentPath.startsWith('/dashboard') || currentPath.startsWith('/admin') || currentPath === '/consent') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // User is logged in
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_complete')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // No profile — clear cookies and send to login
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

  const userRole = profile.role || 'client'
  const onboardingComplete = profile.onboarding_complete ?? true

  // Redirect logged-in users away from login page
  if (currentPath === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = userRole === 'admin' || userRole === 'super_admin' ? '/admin' : '/dashboard'
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users from homepage to dashboard
  if (currentPath === '/') {
    const url = request.nextUrl.clone()
    url.pathname = userRole === 'admin' || userRole === 'super_admin' ? '/admin' : '/dashboard'
    return NextResponse.redirect(url)
  }

  // Admin access control
  if (currentPath.startsWith('/admin')) {
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Client onboarding check
  if (currentPath.startsWith('/dashboard') && userRole === 'client' && !onboardingComplete) {
    if (!currentPath.startsWith('/dashboard/onboarding')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard/onboarding'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
