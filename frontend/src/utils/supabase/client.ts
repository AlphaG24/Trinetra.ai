
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
                    return await fn();
                }
            },
            cookieOptions: {
                path: '/',
                sameSite: 'lax' as const,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 7, // 7 days
            }
        }
    )
}
