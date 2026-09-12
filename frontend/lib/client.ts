import { createBrowserClient } from '@supabase/ssr'

let globalClient: any = null;
let globalProxy: any = null;

export function createClient() {
  if (typeof window !== 'undefined' && globalProxy) {
    return globalProxy;
  }

  const proxy = new Proxy({}, {
    get(target, prop) {
      if (!globalClient) {
        const isProd = process.env.NODE_ENV === 'production'
        let cookieDomain: string | undefined = undefined
        if (isProd && typeof window !== 'undefined') {
          const hostname = window.location.hostname
          if (!hostname.includes('dev.')) {
            if (hostname.endsWith('trinetraedu-ai.com')) {
              cookieDomain = '.trinetraedu-ai.com'
            } else if (hostname.endsWith('trinetra.ai')) {
              cookieDomain = '.trinetra.ai'
            }
          }
        }

        globalClient = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            auth: {
              lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
                return await fn();
              }
            },
            cookieOptions: {
              domain: cookieDomain,
              path: '/',
            }
          }
        );
      }
      return globalClient[prop];
    }
  }) as ReturnType<typeof createBrowserClient>;

  if (typeof window !== 'undefined') {
    globalProxy = proxy;
  }

  return proxy;
}
