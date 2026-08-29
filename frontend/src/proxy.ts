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

  // Get host details to determine environment and domains
  const host = request.headers.get('host') || ''
  const cleanHost = host.split(':')[0].toLowerCase()
  const isProd = process.env.NODE_ENV === 'production' && !cleanHost.includes('localhost') && !cleanHost.includes('127.0.0.1')

  const mainBase = 'https://trinetraedu-ai.com'
  const appBase = 'https://app.trinetraedu-ai.com'
  const adminBase = 'https://admin.trinetraedu-ai.com'

  const isAppDomain = cleanHost === 'app.trinetraedu-ai.com'
  const isAdminDomain = cleanHost === 'admin.trinetraedu-ai.com'

  // 1. Unauthenticated users
  if (!user) {
    if (isProd) {
      if (isAppDomain || isAdminDomain) {
        // Force redirect to login page on the main domain
        return NextResponse.redirect(`${mainBase}/login`)
      }
      // On main domain, protect dashboard, admin, and consent pages
      if (currentPath.startsWith('/dashboard') || currentPath.startsWith('/admin') || currentPath === '/consent') {
        return NextResponse.redirect(`${mainBase}/login`)
      }
    } else {
      // Localhost: redirect to login
      if (currentPath.startsWith('/dashboard') || currentPath.startsWith('/admin') || currentPath === '/consent') {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
      }
    }
    return supabaseResponse
  }

  // 2. Authenticated users: fetch user role and onboarding complete status
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_complete')
    .eq('id', user.id)
    .single()

  let userRole = 'client'
  let onboardingComplete = false

  if (profile) {
    userRole = profile.role || 'client'
    onboardingComplete = profile.onboarding_complete ?? true
  }

  const isAdmin = userRole === 'admin' || userRole === 'super_admin'

  // 3. Subdomain and Route Protection gating
  if (isProd) {
    const isEntryRoute = currentPath === '/' || currentPath === '/login' || currentPath === '/signup'
    const isProtectedRoute = currentPath.startsWith('/dashboard') || currentPath.startsWith('/admin')

    if (isAdmin) {
      // Admin / Super Admin belong on admin.trinetraedu-ai.com
      if (isAdminDomain) {
        // Super admin system gate check
        if (currentPath.startsWith('/admin/system') && userRole !== 'super_admin') {
          return NextResponse.redirect(adminBase)
        }
      } else {
        // On main or app domains: redirect if they hit entry or protected routes
        if (isEntryRoute || isProtectedRoute) {
          return NextResponse.redirect(adminBase)
        }
      }
    } else {
      // Clients belong on app.trinetraedu-ai.com
      if (isAppDomain) {
        // Onboarding check
        if (!onboardingComplete) {
          if (!currentPath.startsWith('/dashboard/onboarding')) {
            return NextResponse.redirect(`${appBase}/dashboard/onboarding`)
          }
        } else {
          if (currentPath.startsWith('/dashboard/onboarding')) {
            return NextResponse.redirect(appBase)
          }
        }
      } else {
        // On main or admin domains: redirect if they hit entry or protected routes
        if (isEntryRoute || isProtectedRoute) {
          return NextResponse.redirect(appBase)
        }
      }
    }
  } else {
    // Localhost (development) environment routing rules
    const isEntryRoute = currentPath === '/' || currentPath === '/login' || currentPath === '/signup'

    if (isAdmin) {
      if (isEntryRoute || currentPath.startsWith('/dashboard')) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin'
        return NextResponse.redirect(url)
      }
      // Super admin system check
      if (currentPath.startsWith('/admin/system') && userRole !== 'super_admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/admin'
        return NextResponse.redirect(url)
      }
    } else {
      if (isEntryRoute || currentPath.startsWith('/admin')) {
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
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
