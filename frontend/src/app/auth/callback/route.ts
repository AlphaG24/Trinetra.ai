import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { type CookieOptions, createServerClient } from '@supabase/ssr'

import { safeApiHandler } from '@/utils/apiAuth'

export const GET = safeApiHandler(async (request: Request) => {
    const { searchParams, origin } = new URL(request.url)
    const host = request.headers.get('host') || ''
    const cleanHost = host.split(':')[0]
    const code = searchParams.get('code')
    const type = searchParams.get('type')

    // Default to dashboard if no parameter is passed or if it redirects to the root landing page
    let next = searchParams.get('next') ?? '/dashboard'
    if (!next.startsWith('/') || next === '/') {
        next = '/dashboard'
    }

    if (code) {
        // THE FIX: We must await the cookies() function in newer Next.js versions
        const cookieStore = await cookies()

        const cookieChanges: { name: string, value: string, options: any }[] = []
        let cookieDomain: string | undefined = undefined

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        const isProd = process.env.NODE_ENV === 'production'
                        if (isProd && cleanHost && !cleanHost.includes('dev.')) {
                            if (cleanHost.endsWith('trinetraedu-ai.com')) {
                                cookieDomain = '.trinetraedu-ai.com'
                            } else if (cleanHost.endsWith('trinetra.ai')) {
                                cookieDomain = '.trinetra.ai'
                            }
                        }
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieChanges.push({ name, value, options })
                            const setOptions: any = {
                                ...options,
                                path: '/',
                            }
                            if (cookieDomain) {
                                setOptions.domain = cookieDomain
                            }
                            cookieStore.set(name, value, setOptions)
                        })
                    }
                },
            }
        )

        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            console.error('[OAuth Callback Error] Code exchange failed:', error.message, error)
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

            // Default: use origin
            let targetUrl = `${origin}${next}`

            if (type === 'recovery') {
                targetUrl = `${origin}/reset-password`
            } else {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    // Fetch user role
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role, onboarding_complete')
                        .eq('id', user.id)
                        .single()

                    const role = (profile?.role || 'client').toLowerCase()
                    const isAdmin = role === 'admin' || role === 'super_admin'
                    const onboardingComplete = profile?.onboarding_complete ?? false

                    console.log('[AUTH] Callback: user role =', role)

                    if (isAdmin) {
                        targetUrl = `${origin}/admin`
                    } else {
                        // Check consent first
                        const { data: consent } = await supabase
                            .from('consent_records')
                            .select('id')
                            .eq('user_id', user.id)
                            .maybeSingle()

                        if (!consent) {
                            targetUrl = `${origin}/consent`
                        } else if (!onboardingComplete) {
                            targetUrl = `${origin}/dashboard/onboarding`
                        } else {
                            targetUrl = `${origin}/dashboard`
                        }
                    }
                    console.log('[AUTH] Callback redirecting to:', targetUrl)
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

            const response = new NextResponse(html, {
                status: 200,
                headers: { 'Content-Type': 'text/html' },
            });

            // Explicitly set the session cookies on the response object
            cookieChanges.forEach(({ name, value, options }) => {
                const setOptions: any = {
                    ...options,
                    path: '/',
                }
                if (cookieDomain) {
                    setOptions.domain = cookieDomain
                }
                response.cookies.set(name, value, setOptions)
            })

            return response
        }
    }

    return NextResponse.redirect(`${origin}/?error=auth_failed`)
})