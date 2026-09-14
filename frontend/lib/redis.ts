import { Redis } from '@upstash/redis'

// ---------------------------------------------------------------------------
// Upstash Redis REST client (serverless/edge-compatible, zero TCP overhead)
// ---------------------------------------------------------------------------
// Gracefully degrades: if UPSTASH keys are missing, all helpers become
// transparent pass-throughs so the app works identically without Redis.
// ---------------------------------------------------------------------------

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

/** Singleton Redis instance — `null` when credentials are missing. */
export const redis: Redis | null =
  url && token ? new Redis({ url, token }) : null

// ---------------------------------------------------------------------------
// cached() — get-or-set with automatic TTL
// ---------------------------------------------------------------------------
/**
 * Wraps an async data fetcher with a Redis cache layer.
 *
 * 1. Tries to read `key` from Redis.
 * 2. On HIT  → returns cached value (skips `fetcher`).
 * 3. On MISS → calls `fetcher`, stores result in Redis with `ttlSeconds`, returns fresh data.
 *
 * If Redis is unavailable or errors, the fetcher is called directly (zero downtime).
 *
 * @param key          Unique cache key (e.g. `"analytics:userId"`)
 * @param fetcher      Async function that returns fresh data from Supabase
 * @param ttlSeconds   Time-to-live in seconds (default 60)
 */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 60
): Promise<T> {
  if (!redis) return fetcher()

  try {
    const hit = await redis.get<T>(key)
    if (hit !== null && hit !== undefined) {
      return hit
    }
  } catch (err) {
    // Redis read failure — fall through to fetcher
    console.warn(`[Redis] Cache read error for "${key}":`, err)
  }

  const fresh = await fetcher()

  try {
    await redis.set(key, JSON.stringify(fresh), { ex: ttlSeconds })
  } catch (err) {
    // Non-fatal: data still returned fresh from Supabase
    console.warn(`[Redis] Cache write error for "${key}":`, err)
  }

  return fresh
}

// ---------------------------------------------------------------------------
// invalidateCache() — delete one or more keys / glob patterns
// ---------------------------------------------------------------------------
/**
 * Deletes cache entries by exact key or glob pattern.
 *
 * Examples:
 * ```ts
 * await invalidateCache('profile:abc-123')           // exact key
 * await invalidateCache('customers:org-*')            // glob pattern
 * await invalidateCache('profile:x', 'analytics:x')  // multiple
 * ```
 */
export async function invalidateCache(...patterns: string[]) {
  if (!redis) return

  try {
    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        // SCAN-based glob deletion
        let cursor = 0
        do {
          const [nextCursor, keys] = await redis.scan(cursor, { match: pattern, count: 100 })
          cursor = typeof nextCursor === 'number' ? nextCursor : Number(nextCursor)
          if (keys.length > 0) {
            await redis.del(...keys)
          }
        } while (cursor !== 0)
      } else {
        await redis.del(pattern)
      }
    }
  } catch (err) {
    // Non-fatal
    console.warn('[Redis] Cache invalidation error:', err)
  }
}
