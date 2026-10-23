
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()
    let cookieDomain: string | undefined = undefined
    try {
        const headerList = await headers()
        const host = headerList.get('host') || ''
        const cleanHost = host.split(':')[0]
        const isProd = process.env.NODE_ENV === 'production'
        if (isProd && cleanHost && !cleanHost.includes('dev.') && !cleanHost.includes('localhost')) {
            if (cleanHost.endsWith('trinetraedu-ai.com')) {
                cookieDomain = '.trinetraedu-ai.com'
            } else if (cleanHost.endsWith('trinetra.ai')) {
                cookieDomain = '.trinetra.ai'
            }
        }
    } catch {
        // Headers might not be available in some contexts
    }

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            const setOptions: any = {
                                ...options,
                                path: '/',
                                sameSite: 'lax',
                                secure: process.env.NODE_ENV === 'production',
                                maxAge: 60 * 60 * 24 * 7, // 7 days
                            }
                            if (cookieDomain) {
                                setOptions.domain = cookieDomain
                            }
                            cookieStore.set(name, value, setOptions)
                        })
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
