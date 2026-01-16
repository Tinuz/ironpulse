/**
 * Rate Limiting Utility
 * Simple in-memory rate limiter for API routes
 * For production, consider using Redis/Upstash for distributed rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed
   */
  limit: number;
  
  /**
   * Time window in seconds
   */
  window: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check if request should be rate limited
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.window * 1000;
  
  const entry = rateLimitMap.get(identifier);
  
  if (!entry || now > entry.resetTime) {
    // First request or window expired
    const resetTime = now + windowMs;
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime
    });
    
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: resetTime
    };
  }
  
  if (entry.count >= config.limit) {
    // Rate limit exceeded
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: entry.resetTime
    };
  }
  
  // Increment count
  entry.count++;
  
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    reset: entry.resetTime
  };
}

/**
 * Get client identifier from request (IP address or user ID)
 */
export function getClientIdentifier(request: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  
  // Try to get IP from various headers (for proxies)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  const ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
  
  return `ip:${ip}`;
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // AI chat - stricter limits to prevent API abuse
  AI_CHAT: {
    limit: 20, // 20 requests
    window: 60 // per minute
  },
  
  // Nutrition search - moderate limits
  NUTRITION_SEARCH: {
    limit: 60, // 60 requests
    window: 60 // per minute
  },
  
  // General API - generous limits
  GENERAL: {
    limit: 100, // 100 requests
    window: 60 // per minute
  }
} as const;
