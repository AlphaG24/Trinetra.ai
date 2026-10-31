import { createServerClient, type CookieOptions } from '@supabase/ssr'
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
    // headers() might not be available in some contexts
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (url, options: any = {}) => {
          const timeout = 6000
          const controller = new AbortController()
          const id = setTimeout(() => controller.abort(), timeout)
          if (options.signal) {
            options.signal.addEventListener('abort', () => controller.abort(), { once: true })
          }
          return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id))
        }
      },
      cookies: {
        getAll() {
          const all = cookieStore.getAll()
          // Deduplicate cookies by name to prevent conflicting chunk or token parsing
          const map = new Map<string, string>()
          for (const c of all) {
            if (!map.has(c.name) || (c.value && !map.get(c.name))) {
              map.set(c.name, c.value)
            }
          }
          return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const isClearing = !value || options?.maxAge === 0
              const setOptions: any = {
                name,
                value,
                ...options,
                path: '/',
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
              }
              if (cookieDomain) {
                setOptions.domain = cookieDomain
              }
              cookieStore.set(setOptions)

              // If clearing an auth cookie, also clear host-only cookie to eliminate lingering ghost cookies
              if (isClearing && cookieDomain) {
                try {
                  cookieStore.set({
                    name,
                    value: '',
                    path: '/',
                    maxAge: 0,
                  })
                } catch {}
              }
            })
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )
}

