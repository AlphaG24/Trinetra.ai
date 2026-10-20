import { createBrowserClient } from '@supabase/ssr'

let clientInstance: any = null

if (typeof window !== 'undefined') {
  // Prevent Next.js error overlay from popping up on benign background auth retry errors
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    if (
      reason?.name === 'AuthRetryableFetchError' ||
      reason?.constructor?.name === 'AuthRetryableFetchError' ||
      reason?.message?.includes?.('AuthRetryableFetchError')
    ) {
      event.preventDefault()
    }
  })

  // Filter AuthRetryableFetchError from console.error to keep the Next.js dev overlay clean
  const origConsoleError = console.error
  console.error = (...args: any[]) => {
    const first = args[0]
    if (
      first?.name === 'AuthRetryableFetchError' ||
      first?.constructor?.name === 'AuthRetryableFetchError' ||
      (typeof first === 'string' && first.includes('AuthRetryableFetchError')) ||
      (typeof first === 'object' && first?.__isAuthError && (first?.status === 503 || first?.status === 0))
    ) {
      console.warn('[Supabase AuthNotice] Handled background auth fetch notice')
      return
    }
    origConsoleError.apply(console, args)
  }
}

const resilientFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init)
  } catch (err: any) {
    console.warn('[Supabase Client] Network fetch notice:', err?.message || err)
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
