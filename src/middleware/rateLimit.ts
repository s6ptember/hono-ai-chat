/**
 * Rate Limiting Middleware
 */

import type { Context, MiddlewareHandler } from 'hono';
import { RateLimitError } from '../utils/errors.ts';
import { logger } from '../utils/logger.ts';
import type { EnvConfig } from '../types/index.ts';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

/**
 * Simple in-memory rate limiter
 * For production with multiple Workers instances, consider using Durable Objects or KV
 */
export class RateLimiter {
  private store: RateLimitStore = {};
  private limit: number;
  private windowMs: number;

  constructor(limit: number, windowSeconds: number) {
    this.limit = limit;
    this.windowMs = windowSeconds * 1000;

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if request is allowed
   */
  check(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.store[identifier];

    // No entry or expired - create new
    if (!entry || now > entry.resetAt) {
      this.store[identifier] = {
        count: 1,
        resetAt: now + this.windowMs,
      };

      return {
        allowed: true,
        remaining: this.limit - 1,
        resetAt: now + this.windowMs,
      };
    }

    // Increment counter
    entry.count++;

    const allowed = entry.count <= this.limit;
    const remaining = Math.max(0, this.limit - entry.count);

    return {
      allowed,
      remaining,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keys = Object.keys(this.store);

    for (const key of keys) {
      if (this.store[key].resetAt < now) {
        delete this.store[key];
      }
    }
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    delete this.store[identifier];
  }
}

/**
 * Create rate limit middleware
 */
export function createRateLimitMiddleware(config: EnvConfig): MiddlewareHandler {
  const limit = parseInt(config.RATE_LIMIT_REQUESTS, 10);
  const window = parseInt(config.RATE_LIMIT_WINDOW, 10);
  const limiter = new RateLimiter(limit, window);

  return async (c: Context, next) => {
    // Get identifier (IP address or fallback)
    const identifier = c.req.header('CF-Connecting-IP')
      || c.req.header('X-Forwarded-For')
      || c.req.header('X-Real-IP')
      || 'unknown';

    const result = limiter.check(identifier);

    // Set rate limit headers
    c.header('X-RateLimit-Limit', limit.toString());
    c.header('X-RateLimit-Remaining', result.remaining.toString());
    c.header('X-RateLimit-Reset', result.resetAt.toString());

    if (!result.allowed) {
      logger.logRateLimit(identifier, 'blocked');
      throw new RateLimitError('Too many requests. Please try again later.');
    }

    logger.logRateLimit(identifier, 'allowed');
    await next();
  };
}
