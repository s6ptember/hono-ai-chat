/**
 * Session Management Service
 * Handles chat sessions with KV storage
 */

import type { ChatSession, ChatMessage, EnvConfig } from '../types/index.ts';
import { SessionError } from '../utils/errors.ts';
import { logger } from '../utils/logger.ts';
import { safeJsonParse } from '../utils/errors.ts';
import type { GroqService } from './groq.ts';
import type { ContextService } from './context.ts';

export class SessionService {
  private kv: KVNamespace | null;
  private contextService: ContextService;
  private groqService: GroqService;
  private sessionTTL: number = 3600; // 1 hour in seconds

  constructor(
    contextService: ContextService,
    groqService: GroqService,
    kv?: KVNamespace
  ) {
    this.kv = kv || null;
    this.contextService = contextService;
    this.groqService = groqService;
  }

  /**
   * Create a new chat session
   */
  async createSession(): Promise<ChatSession> {
    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + this.sessionTTL * 1000).toISOString();

    const session: ChatSession = {
      id: sessionId,
      messages: [],
      created_at: now,
      updated_at: now,
      expires_at: expiresAt,
    };

    // Store in KV if available
    if (this.kv) {
      await this.kv.put(
        `session:${sessionId}`,
        JSON.stringify(session),
        { expirationTtl: this.sessionTTL }
      );
    }

    logger.info('Session created', { sessionId });
    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<ChatSession> {
    if (!this.kv) {
      throw new SessionError('Session storage not available');
    }

    const sessionData = await this.kv.get(`session:${sessionId}`, 'text');

    if (!sessionData) {
      throw new SessionError('Session not found or expired', { sessionId });
    }

    const session = safeJsonParse<ChatSession>(sessionData, {
      id: sessionId,
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: new Date().toISOString(),
    });

    return session;
  }

  /**
   * Update session
   */
  async updateSession(session: ChatSession): Promise<void> {
    if (!this.kv) {
      logger.warn('KV not available, session not persisted');
      return;
    }

    session.updated_at = new Date().toISOString();

    await this.kv.put(
      `session:${session.id}`,
      JSON.stringify(session),
      { expirationTtl: this.sessionTTL }
    );

    logger.debug('Session updated', { sessionId: session.id });
  }

  /**
   * Add message to session
   */
  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<ChatSession> {
    let session: ChatSession;

    try {
      session = await this.getSession(sessionId);
    } catch {
      // Create new session if not found
      session = await this.createSession();
    }

    session.messages.push({ role, content });

    // Keep only last 10 messages to prevent context overflow
    if (session.messages.length > 10) {
      session.messages = session.messages.slice(-10);
    }

    await this.updateSession(session);

    return session;
  }

  /**
   * Process code review message
   */
  async processCodeReview(
    sessionId: string,
    code: string,
    language?: string,
    userContext?: string
  ): Promise<{ review: string; severity: 'info' | 'warning' | 'critical'; sessionId: string }> {
    // Validate and sanitize code
    const sanitizedCode = this.contextService.sanitizeCode(code);

    // Get or create session
    let session: ChatSession;
    try {
      session = await this.getSession(sessionId);
    } catch {
      session = await this.createSession();
      sessionId = session.id;
    }

    // Detect if this is code or regular conversation
    const isCode = this.contextService.isCode(sanitizedCode);

    let systemPrompt: string;
    let userPrompt: string;
    let review: string;
    let severity: 'info' | 'warning' | 'critical';

    // Get previous conversation (exclude system messages)
    const previousMessages = session.messages.filter(msg => msg.role !== 'system');

    if (isCode) {
      // This is code - perform code review
      systemPrompt = this.contextService.buildSystemPrompt(language);
      userPrompt = this.contextService.buildUserPrompt(sanitizedCode, userContext);

      // Get AI review
      const rawReview = await this.groqService.reviewCode(
        sanitizedCode,
        systemPrompt,
        userPrompt,
        previousMessages
      );

      // Sanitize and format review
      review = this.groqService.sanitizeResponse(rawReview);

      // Extract severity
      severity = this.contextService.extractSeverity(review);

      logger.info('Code review completed', {
        sessionId,
        codeLength: code.length,
        severity,
        reviewLength: review.length,
      });
    } else {
      // This is a regular conversation
      systemPrompt = this.contextService.buildChatSystemPrompt();
      userPrompt = this.contextService.buildChatUserPrompt(sanitizedCode);

      // Get AI chat response
      const rawResponse = await this.groqService.reviewCode(
        sanitizedCode,
        systemPrompt,
        userPrompt,
        previousMessages
      );

      // Sanitize response
      review = this.groqService.sanitizeResponse(rawResponse);

      // For regular chat, severity is always 'info'
      severity = 'info';

      logger.info('Chat response completed', {
        sessionId,
        messageLength: code.length,
        responseLength: review.length,
      });
    }

    // Update session with new messages
    session.messages.push({ role: 'user', content: userPrompt });
    session.messages.push({ role: 'assistant', content: review });

    // Keep only last 10 messages
    if (session.messages.length > 10) {
      session.messages = session.messages.slice(-10);
    }

    await this.updateSession(session);

    return { review, severity, sessionId };
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    if (!this.kv) {
      return;
    }

    await this.kv.delete(`session:${sessionId}`);
    logger.info('Session deleted', { sessionId });
  }

  /**
   * Get session stats (for health check)
   */
  async getStats(): Promise<{ totalSessions: number }> {
    // Note: KV doesn't support listing all keys efficiently
    // In production, consider using Durable Objects for better stats tracking
    return { totalSessions: 0 };
  }
}

// Export factory function
export function createSessionService(
  contextService: ContextService,
  groqService: GroqService,
  kv?: KVNamespace
): SessionService {
  logger.info('Session service initialized', { kvAvailable: !!kv });
  return new SessionService(contextService, groqService, kv);
}
