import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'

const limiters = new Map<string, Ratelimit>()

function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    // Rate limiting disabled — env vars not configured
    return null
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

function getRateLimiter(prefix: string, limit: number, window: `${number} ${'s' | 'm' | 'h'}`): Ratelimit | null {
  const redis = getRedisClient()
  if (!redis) return null

  const cached = limiters.get(prefix)
  if (cached) return cached

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: false,
    prefix: `studycenter:ratelimit:${prefix}`,
  })
  limiters.set(prefix, limiter)
  return limiter
}

function clientIp(c: Context): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    c.req.header('x-real-ip') ??
    'unknown'
  )
}

export async function rateLimitLogin(c: Context, next: Next) {
  const limiter = getRateLimiter('login', 5, '15 m')

  if (!limiter) {
    await next()
    return
  }

  const { success, reset } = await limiter.limit(clientIp(c))

  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000)
    c.header('Retry-After', String(retryAfter))
    throw new HTTPException(429, {
      message: `Muitas tentativas de login. Tente novamente em ${retryAfter}s.`,
    })
  }

  await next()
}

/** Stricter limit for endpoints that trigger sending an email (verification / reset). */
export async function rateLimitEmail(c: Context, next: Next) {
  const limiter = getRateLimiter('email', 3, '15 m')

  if (!limiter) {
    await next()
    return
  }

  const { success, reset } = await limiter.limit(clientIp(c))

  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000)
    c.header('Retry-After', String(retryAfter))
    throw new HTTPException(429, {
      message: `Muitas tentativas. Tente novamente em ${retryAfter}s.`,
    })
  }

  await next()
}
