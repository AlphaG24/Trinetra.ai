import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { safeApiHandler } from '@/utils/apiAuth'

export const dynamic = 'force-dynamic';

export const GET = safeApiHandler(async (request: Request) => {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  let next = searchParams.get('next') ?? '/dashboard'

  // SECURITY: Prevent Open Redirect attacks. Ensure `next` is a relative path.
  if (!next.startsWith('/')) {
    next = '/dashboard'
  }

  if (code) {
    const cookieStore = await cookies()
    const headerList = await headers()
    const host = headerList.get('host') || ''
    const cleanHost = host.split(':')[0]
    let cookieDomain: string | undefined = undefined

    const isProd = process.env.NODE_ENV === 'production'
    if (isProd && cleanHost) {
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
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              const setOptions: any = { name, value, ...options }
              if (cookieDomain) {
                setOptions.domain = cookieDomain
              }
              cookieStore.set(setOptions);
            });
          }
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('[API OAuth Callback Error] Code exchange failed:', error.message, error)
    } else {
      if (type === 'signup') {
        try {
          // Extract all cookies from the updated cookieStore to ensure the new session cookie is sent
          const cookieStore = await cookies()
          const cookieHeader = cookieStore.getAll()
            .map(c => `${c.name}=${c.value}`)
            .join('; ')

          await fetch(`${origin}/api/email/welcome`, {
            method: 'POST',
            headers: { 
              'Cookie': cookieHeader,
              'Content-Type': 'application/json'
            },
          })
        } catch (err) {
          console.error('Failed to trigger welcome email:', err)
        }
      }

      // If the 'next' parameter is one of our subdomains but lacks http/https, append it
      let targetUrl = `${origin}${next}`
      if (type === 'recovery') {
        targetUrl = `${origin}/reset-password`
      } else if (next.includes('trinetraedu-ai.com')) {
        targetUrl = next.startsWith('http') ? next : `https://${next}`
      }

      // THE NUCLEAR FIX: 
      // Return a 200 OK to force the browser to save the cookie immediately.
      // Use native HTML to force a hard page load, bypassing the Next.js SPA router.
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta http-equiv="refresh" content="0;url=${targetUrl}">
          </head>
          <body>
            <script>window.location.href = "${targetUrl}";</script>
            <p>Authenticating... Redirecting to dashboard.</p>
          </body>
        </html>
      `;

      return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }
    console.error('Auth Callback Error:', error.message)
  }

  // If there is no code or an error occurred, return home
  return NextResponse.redirect(`${origin}/?error=auth_failed`)
})
