type RateLimitEntry = {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

const defaultConfig: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 10_000,
}

export function checkRateLimit(
  identifier: string,
  config: Partial<RateLimitConfig> = {}
): { success: boolean; remaining: number; reset: number; limit: number } {
  const { maxRequests, windowMs } = { ...defaultConfig, ...config }
  const now = Date.now()

  const entry = rateLimitStore.get(identifier)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    })

    return {
      success: true,
      remaining: maxRequests - 1,
      reset: now + windowMs,
      limit: maxRequests,
    }
  }

  if (entry.count >= maxRequests) {
    return {
      success: false,
      remaining: 0,
      reset: entry.resetAt,
      limit: maxRequests,
    }
  }

  entry.count += 1

  return {
    success: true,
    remaining: maxRequests - entry.count,
    reset: entry.resetAt,
    limit: maxRequests,
  }
}

export function createRateLimitHeaders(
  remaining: number,
  reset: number,
  limit: number
): Record<string, string> {
  return {
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": Math.max(0, remaining).toString(),
    "X-RateLimit-Reset": reset.toString(),
  }
}

export function cleanupRateLimitStore() {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}

// Auto-cleanup every minute
if (typeof global !== "undefined") {
  setInterval(cleanupRateLimitStore, 60_000)
}
