/**
 * CORS Middleware
 */

import { cors } from 'hono/cors';
import type { MiddlewareHandler } from 'hono';
import type { EnvConfig } from '../types/index.ts';

/**
 * Create CORS middleware with configuration
 */
export function createCorsMiddleware(config: EnvConfig): MiddlewareHandler {
  const allowedOrigins = config.ALLOWED_ORIGINS === '*'
    ? ['*']
    : config.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());

  return cors({
    origin: allowedOrigins,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 600,
    credentials: true,
  });
}
