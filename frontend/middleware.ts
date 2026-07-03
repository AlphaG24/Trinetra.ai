import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Immediately bypass the callback to prevent code consumption
  if (request.nextUrl.pathname.startsWith('/auth/callback') || request.nextUrl.pathname.startsWith('/api/auth/callback')) {
    return NextResponse.next()
  }

  // 2. Initialize the exact response object we will return
  let supabaseResponse = NextResponse.next({
    request: { headers: request.headers },
  })

  // 3. Create client with STRICT cookie mirroring
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const domain = process.env.NODE_ENV === 'development' ? undefined : process.env.NEXT_PUBLIC_COOKIE_DOMAIN
            // We MUST set the cookie on BOTH the request and the response
            request.cookies.set(name, value)
            supabaseResponse.cookies.set({ name, value, ...options, domain })
          })
        },
      },
    }
  )

  // 4. Validate the session
  const { data: { user } } = await supabase.auth.getUser()

  // 5. Protect the dashboard
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    console.log("🚨 TRIPWIRE 1 TRIGGERED: Middleware could not read the user session!");
    console.log("MIDDLEWARE SEES THESE COOKIES:", request.cookies.getAll());
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // MUST return this specific response object
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
