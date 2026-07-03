
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    const cookieDomain = isLocalhost ? undefined : '.trinetraedu-ai.com'

    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookieOptions: {
                domain: cookieDomain,
                path: '/',
                sameSite: 'lax',
                secure: true,
            }
        }
    )
}
