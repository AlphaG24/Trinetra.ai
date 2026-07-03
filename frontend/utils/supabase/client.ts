
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const isProd = process.env.NODE_ENV === 'production'
    const cookieDomain = isProd ? '.trinetraedu-ai.com' : undefined

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
