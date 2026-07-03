
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const cookieDomain = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? undefined
        : (process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined)

    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookieOptions: {
                domain: cookieDomain,
                path: '/',
            }
        }
    )
}
