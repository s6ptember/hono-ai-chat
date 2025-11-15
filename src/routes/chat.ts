/**
 * Chat Routes
 * Handles code review chat endpoints
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Bindings, CodeReviewRequest } from '../types/index.ts';
import { ValidationError } from '../utils/errors.ts';
import { logger } from '../utils/logger.ts';

const chat = new Hono<{ Bindings: Bindings }>();

/**
 * POST /api/chat/session
 * Create a new chat session
 */
chat.post('/session', async (c: Context) => {
  const sessionService = c.get('sessionService');

  const session = await sessionService.createSession();

  return c.json({
    success: true,
    data: {
      session_id: session.id,
      expires_at: session.expires_at,
    },
  });
});

/**
 * POST /api/chat/review
 * Submit code for review
 */
chat.post('/review', async (c: Context) => {
  const sessionService = c.get('sessionService');
  const config = c.get('config');

  // Parse request body
  const body = await c.req.json();
  const { session_id, code, language, context } = body as CodeReviewRequest;

  // Validation
  if (!code || typeof code !== 'string') {
    throw new ValidationError('Code is required and must be a string');
  }

  const maxCodeLength = parseInt(config.MAX_CODE_LENGTH, 10);
  if (code.length > maxCodeLength) {
    throw new ValidationError(`Code exceeds maximum length of ${maxCodeLength} characters`);
  }

  if (code.trim().length === 0) {
    throw new ValidationError('Code cannot be empty');
  }

  // Use provided session_id or create new one
  const sessionId = session_id || crypto.randomUUID();

  // Process code review
  const result = await sessionService.processCodeReview(
    sessionId,
    code,
    language,
    context
  );

  logger.info('Code review completed', {
    sessionId: result.sessionId,
    severity: result.severity,
  });

  return c.json({
    success: true,
    data: {
      session_id: result.sessionId,
      review: result.review,
      severity: result.severity,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * GET /api/chat/session/:id
 * Get session details
 */
chat.get('/session/:id', async (c: Context) => {
  const sessionService = c.get('sessionService');
  const sessionId = c.req.param('id');

  const session = await sessionService.getSession(sessionId);

  return c.json({
    success: true,
    data: {
      session_id: session.id,
      message_count: session.messages.length,
      created_at: session.created_at,
      updated_at: session.updated_at,
      expires_at: session.expires_at,
    },
  });
});

/**
 * DELETE /api/chat/session/:id
 * Delete a session
 */
chat.delete('/session/:id', async (c: Context) => {
  const sessionService = c.get('sessionService');
  const sessionId = c.req.param('id');

  await sessionService.deleteSession(sessionId);

  return c.json({
    success: true,
    data: {
      message: 'Session deleted successfully',
    },
  });
});

export default chat;
