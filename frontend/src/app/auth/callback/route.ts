import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { type CookieOptions, createServerClient } from '@supabase/ssr'

import { safeApiHandler } from '@/utils/apiAuth'

export const GET = safeApiHandler(async (request: Request) => {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const type = searchParams.get('type')

    // Default to dashboard if no parameter is passed
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
        // THE FIX: We must await the cookies() function in newer Next.js versions
        const cookieStore = await cookies()

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        const domain = process.env.NODE_ENV === 'development'
                            ? undefined
                            : process.env.NEXT_PUBLIC_COOKIE_DOMAIN
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set({ name, value, ...options, domain })
                        })
                    }
                },
            }
        )

        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
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

            let targetUrl = `${origin}${next}`
            if (type === 'recovery') {
                targetUrl = `${origin}/reset-password`
            } else {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    // Fetch user role
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single()

                    const role = (profile?.role || 'client').toLowerCase()
                    
                    if (role !== 'admin' && role !== 'super_admin' && role === 'client') {
                        const { data: consent } = await supabase
                            .from('consent_records')
                            .select('id')
                            .eq('user_id', user.id)
                            .maybeSingle()
                        
                        if (!consent) {
                            targetUrl = `${origin}/consent`
                        }
                    }
                }
                if (next.includes('trinetraedu-ai.com')) {
                    targetUrl = next.startsWith('http') ? next : `https://${next}`
                }
            }

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
    }

    return NextResponse.redirect(`${origin}/?error=auth_failed`)
})