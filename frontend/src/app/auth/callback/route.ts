import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { type CookieOptions, createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')

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
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        const domain = process.env.NODE_ENV === 'development'
                            ? undefined
                            : process.env.NEXT_PUBLIC_COOKIE_DOMAIN
                        cookieStore.set({ name, value, ...options, domain })
                    },
                    remove(name: string, options: CookieOptions) {
                        const domain = process.env.NODE_ENV === 'development'
                            ? undefined
                            : process.env.NEXT_PUBLIC_COOKIE_DOMAIN
                        cookieStore.set({ name, value: '', ...options, domain })
                    },
                },
            }
        )

        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // If the 'next' parameter is one of our subdomains but lacks http/https, append it
            if (next.includes('trinetraedu-ai.com') && !next.startsWith('http')) {
                return NextResponse.redirect(`https://${next}`, { status: 303 })
            }
            // 303 Redirect forces the browser to wait for the cookie to save
            return NextResponse.redirect(`${origin}${next}`, { status: 303 })
        }
    }

    return NextResponse.redirect(`${origin}/?error=auth_failed`)
}