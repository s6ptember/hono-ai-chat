/**
 * Authentication Middleware (Optional)
 */

import type { Context, MiddlewareHandler } from 'hono';
import { AuthenticationError } from '../utils/errors.ts';
import type { EnvConfig } from '../types/index.ts';

/**
 * Create bearer token authentication middleware
 * Only applies if ACCESS_TOKEN is configured
 */
export function createAuthMiddleware(config: EnvConfig): MiddlewareHandler {
  return async (c: Context, next) => {
    // Skip auth if no ACCESS_TOKEN is configured
    if (!config.ACCESS_TOKEN) {
      await next();
      return;
    }

    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
      throw new AuthenticationError('Missing Authorization header');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer') {
      throw new AuthenticationError('Invalid authentication scheme. Use Bearer token.');
    }

    if (!token || token !== config.ACCESS_TOKEN) {
      throw new AuthenticationError('Invalid access token');
    }

    await next();
  };
}
