import { createBrowserClient } from '@supabase/ssr'

let clientInstance: any = null

export function createClient(): any {
  if (typeof window === 'undefined') {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: {
          path: '/',
          sameSite: 'lax' as const,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        },
      }
    )
  }

  if (!clientInstance) {
    const isProd = process.env.NODE_ENV === 'production'
    let cookieDomain: string | undefined = undefined
    const hostname = window.location.hostname
    if (isProd && !hostname.includes('dev.') && !hostname.includes('localhost')) {
      if (hostname.endsWith('trinetraedu-ai.com')) {
        cookieDomain = '.trinetraedu-ai.com'
      } else if (hostname.endsWith('trinetra.ai')) {
        cookieDomain = '.trinetra.ai'
      }
    }

    clientInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: {
          domain: cookieDomain,
          path: '/',
          sameSite: 'lax' as const,
          secure: isProd,
          maxAge: 60 * 60 * 24 * 7, // 7 days
        },
      }
    )
  }

  return clientInstance
}
