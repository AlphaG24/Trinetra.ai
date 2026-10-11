import { createBrowserClient } from '@supabase/ssr'

let clientInstance: any = null

const resilientFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init)
  } catch (err: any) {
    // If browser native fetch fails due to offline/network glitch, return a synthetic 503 response
    // instead of letting an unhandled TypeError: Failed to fetch bubble to the console
    console.warn('[SupabaseClient] Network fetch notice:', err?.message || err)
    return new Response(
      JSON.stringify({
        error: 'network_unavailable',
        message: 'Network service temporarily unavailable.',
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export function createClient(): any {
  if (typeof window === 'undefined') {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          fetch: resilientFetch,
        },
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
        global: {
          fetch: resilientFetch,
        },
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
