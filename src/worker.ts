/**
 * Cloudflare Workers Entry Point
 */

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import type { Bindings } from './types/index.ts';
import { getEnv, validateConfig } from './config/env.ts';
import { createCorsMiddleware } from './middleware/cors.ts';
import { createRateLimitMiddleware } from './middleware/rateLimit.ts';
import { createAuthMiddleware } from './middleware/auth.ts';
import { createContextService } from './services/context.ts';
import { createGroqService } from './services/groq.ts';
import { createSessionService } from './services/session.ts';
import { AppError } from './utils/errors.ts';
import { logger as appLogger } from './utils/logger.ts';

// Import routes
import chatRoutes from './routes/chat.ts';
import healthRoutes from './routes/health.ts';
import pageRoutes from './routes/pages.ts';

// Create Hono app with bindings type
const app = new Hono<{ Bindings: Bindings }>();

// Global error handler
app.onError((err, c) => {
  appLogger.error('Request error', err);

  if (err instanceof AppError) {
    return c.json(
      {
        success: false,
        error: {
          message: err.message,
          code: err.code,
          details: err.details,
        },
      },
      err.statusCode
    );
  }

  // Unknown error
  return c.json(
    {
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    },
    500
  );
});

// Request logger
app.use('*', logger());

// Initialize services middleware
app.use('*', async (c, next) => {
  try {
    // Get and validate config
    const config = getEnv(c.env as Bindings);
    validateConfig(config);

    // Store config in context
    c.set('config', config);

    // Initialize services
    const contextService = createContextService();
    const groqService = createGroqService(config);
    const sessionService = createSessionService(
      contextService,
      groqService,
      c.env.SESSIONS
    );

    // Store services in context
    c.set('contextService', contextService);
    c.set('groqService', groqService);
    c.set('sessionService', sessionService);

    await next();
  } catch (error) {
    appLogger.error('Service initialization failed', error);
    throw error;
  }
});

// CORS middleware
app.use('*', async (c, next) => {
  const config = c.get('config');
  const corsMiddleware = createCorsMiddleware(config);
  return corsMiddleware(c, next);
});

// Rate limiting for API routes
app.use('/api/*', async (c, next) => {
  const config = c.get('config');
  const rateLimitMiddleware = createRateLimitMiddleware(config);
  return rateLimitMiddleware(c, next);
});

// Auth middleware for API routes (optional)
app.use('/api/*', async (c, next) => {
  const config = c.get('config');
  const authMiddleware = createAuthMiddleware(config);
  return authMiddleware(c, next);
});

// Mount routes
app.route('/', pageRoutes);
app.route('/api/chat', chatRoutes);
app.route('/health', healthRoutes);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        message: 'Not found',
        code: 'NOT_FOUND',
      },
    },
    404
  );
});

export default app;
