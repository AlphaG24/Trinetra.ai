import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Initialize the response object
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Create a clean, standard Supabase client without forced domains
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
              // Removed the forced wildcard domain. 
              // We rely entirely on standard Next.js cookie behavior now.
            })
          })
        },
      },
    }
  )

  // 3. Securely validate the session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const currentPath = request.nextUrl.pathname

  // 4. Anti-Loop Protection: Protect Dashboard
  if (!user && currentPath.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login' // Send to login, not the root homepage
    return NextResponse.redirect(url)
  }

  // 5. Anti-Loop Protection: Prevent logged-in users from getting stuck on Auth pages
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