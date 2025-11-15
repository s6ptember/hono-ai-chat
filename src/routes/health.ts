/**
 * Health Check Routes
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Bindings } from '../types/index.ts';

const health = new Hono<{ Bindings: Bindings }>();

/**
 * GET /health
 * Basic health check
 */
health.get('/', async (c: Context) => {
  const config = c.get('config');

  return c.json({
    status: 'healthy',
    service: 'ai-code-review-assistant',
    version: '1.0.0',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/detailed
 * Detailed health check with service status
 */
health.get('/detailed', async (c: Context) => {
  const config = c.get('config');
  const sessionService = c.get('sessionService');

  // Check KV availability
  const kvAvailable = !!c.env.SESSIONS;

  // Get session stats if available
  let sessionStats = { totalSessions: 0 };
  try {
    sessionStats = await sessionService.getStats();
  } catch {
    // Ignore errors in health check
  }

  return c.json({
    status: 'healthy',
    service: 'ai-code-review-assistant',
    version: '1.0.0',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
    components: {
      kv_storage: kvAvailable ? 'available' : 'unavailable',
      groq_api: 'configured',
      rate_limiting: 'enabled',
    },
    stats: {
      sessions: sessionStats,
    },
  });
});

export default health;
