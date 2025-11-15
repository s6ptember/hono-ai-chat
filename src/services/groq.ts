/**
 * AI Service (Groq)
 * Handles AI code review requests using Groq API
 */

import Groq from 'groq-sdk';
import type { ChatMessage, EnvConfig } from '../types/index.ts';
import { AIServiceError } from '../utils/errors.ts';
import { logger } from '../utils/logger.ts';

export class GroqService {
  private client: Groq;
  // Using Groq's free tier - fast and reliable
  // Available models: llama-3.1-8b-instant, mixtral-8x7b-32768, llama-3.3-70b-versatile
  private model: string = 'llama-3.3-70b-versatile';

  constructor(config: EnvConfig) {
    this.client = new Groq({
      apiKey: config.GROQ_API_KEY,
    });
  }

  /**
   * Send chat completion request to Groq
   */
  async chatCompletion(
    messages: ChatMessage[],
    options?: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
    }
  ): Promise<string> {
    const startTime = Date.now();

    try {
      logger.logAIRequest('code-review', JSON.stringify(messages).length);

      logger.info('Sending request to Groq API', {
        model: this.model,
        messageCount: messages.length,
        maxTokens: options?.maxTokens || 1000,
      });

      const chatCompletion = await this.client.chat.completions.create({
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        model: this.model,
        max_tokens: options?.maxTokens || 1000,
        temperature: options?.temperature || 0.3,
        top_p: options?.topP || 0.9,
      });

      logger.info('Received response from Groq API', {
        hasChoices: !!chatCompletion.choices,
        choicesLength: chatCompletion.choices?.length || 0,
      });

      if (!chatCompletion.choices || chatCompletion.choices.length === 0) {
        logger.error('No choices in response');
        throw new AIServiceError('No response from model');
      }

      const message = chatCompletion.choices[0].message;
      const content = message?.content;

      if (!content) {
        logger.error('Empty content in message');
        throw new AIServiceError('Empty response from model');
      }

      logger.info('Successfully extracted content', {
        contentLength: content.length,
      });

      const duration = Date.now() - startTime;
      logger.logAIResponse('code-review', content.length, duration);

      return content;
    } catch (error) {
      logger.error('Groq request failed', error);

      if (error instanceof AIServiceError) {
        throw error;
      }

      throw new AIServiceError(
        (error as Error).message || 'Unknown error occurred',
        { originalError: (error as Error).message }
      );
    }
  }

  /**
   * Review code using AI
   */
  async reviewCode(
    code: string,
    systemPrompt: string,
    userPrompt: string,
    previousMessages: ChatMessage[] = []
  ): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...previousMessages,
      { role: 'user', content: userPrompt },
    ];

    return await this.chatCompletion(messages, {
      maxTokens: 1500,
      temperature: 0.3,
      topP: 0.9,
    });
  }

  /**
   * Sanitize AI response to prevent XSS
   */
  sanitizeResponse(response: string): string {
    return response
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .trim();
  }

  /**
   * Format review for display
   */
  formatReview(review: string): string {
    // Convert markdown-style code blocks to HTML-safe format
    const formatted = review
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
        return `<pre><code class="language-${lang || 'text'}">${this.escapeHtml(code.trim())}</code></pre>`;
      })
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');

    return this.sanitizeResponse(formatted);
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };

    return text.replace(/[&<>"']/g, char => map[char]);
  }
}

// Export factory function
export function createGroqService(config: EnvConfig): GroqService {
  logger.info('Groq service initialized', { model: 'llama-3.3-70b-versatile' });
  return new GroqService(config);
}
