/**
 * Bun Development Server Entry Point
 */

import { serve } from 'bun';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { env } from './config/env.ts';
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

// Create Hono app
const app = new Hono();

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
  // Store config in context
  c.set('config', env);

  // Initialize services
  const contextService = createContextService();
  const groqService = createGroqService(env);
  const sessionService = createSessionService(
    contextService,
    groqService
    // Note: KV not available in dev mode
  );

  // Store services in context
  c.set('contextService', contextService);
  c.set('groqService', groqService);
  c.set('sessionService', sessionService);

  await next();
});

// CORS middleware
app.use('*', createCorsMiddleware(env));

// Rate limiting for API routes
app.use('/api/*', createRateLimitMiddleware(env));

// Auth middleware for API routes (optional)
app.use('/api/*', createAuthMiddleware(env));

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

// Start server
const port = parseInt(process.env.PORT || '3000', 10);

serve({
  fetch: app.fetch,
  port,
});

console.log(`🚀 Server running at http://localhost:${port}`);
console.log(`📝 Health check: http://localhost:${port}/health`);
console.log(`🎨 UI: http://localhost:${port}/`);
