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
        const cookieDomain = isProd ? '.trinetraedu-ai.com' : undefined

        globalClient = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
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
