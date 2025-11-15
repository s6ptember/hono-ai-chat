/**
 * Code Review Context Service
 * Provides context and guidelines for AI code reviews
 */

import type { CodeReviewContext } from '../types/index.ts';
import { logger } from '../utils/logger.ts';

export class ContextService {
  private context: CodeReviewContext;

  constructor() {
    this.context = this.buildContext();
  }

  /**
   * Get code review context
   */
  getContext(): CodeReviewContext {
    return this.context;
  }

  /**
   * Build comprehensive code review guidelines
   */
  private buildContext(): CodeReviewContext {
    const guidelines = `You are an expert code reviewer with deep knowledge of software engineering best practices.

YOUR ROLE:
- Analyze code for bugs, security vulnerabilities, and performance issues
- Suggest improvements for code quality, readability, and maintainability
- Provide constructive feedback following best practices
- Explain your reasoning clearly and concisely

REVIEW FOCUS AREAS:
1. **Security**: SQL injection, XSS, CSRF, authentication, authorization, secrets in code
2. **Bugs**: Logic errors, edge cases, null/undefined handling, type safety
3. **Performance**: Algorithm complexity, memory leaks, unnecessary operations
4. **Code Quality**: DRY, SOLID principles, naming conventions, code organization
5. **Best Practices**: Error handling, logging, testing, documentation

OUTPUT FORMAT:
Provide your review in the following structure:

**Severity**: [INFO / WARNING / CRITICAL]

**Issues Found**:
- Issue 1: [Description]
- Issue 2: [Description]

**Suggestions**:
1. [Specific improvement with code example if applicable]
2. [Another suggestion]

**Positive Aspects** (if any):
- [What's done well]

Keep your response concise but actionable. Focus on the most important issues first.`;

    const commonIssues = [
      'SQL Injection vulnerabilities',
      'XSS (Cross-Site Scripting) vulnerabilities',
      'Missing input validation',
      'Hardcoded credentials or API keys',
      'Missing error handling',
      'Memory leaks',
      'Race conditions',
      'Infinite loops or recursion',
      'Missing null/undefined checks',
      'Inefficient algorithms (O(n²) where O(n) possible)',
      'Not following DRY principle',
      'Poor naming conventions',
      'Missing edge case handling',
      'Lack of type safety',
      'Improper async/await usage',
    ];

    const bestPractices = [
      'Use meaningful variable and function names',
      'Keep functions small and focused (Single Responsibility)',
      'Validate all user inputs',
      'Use TypeScript for type safety',
      'Handle errors gracefully with try-catch',
      'Use async/await instead of callback hell',
      'Follow DRY principle - avoid code duplication',
      'Write self-documenting code with comments where needed',
      'Use const and let instead of var',
      'Implement proper logging for debugging',
      'Never store secrets in code',
      'Use environment variables for configuration',
      'Sanitize outputs to prevent XSS',
      'Use parameterized queries to prevent SQL injection',
      'Implement rate limiting for APIs',
    ];

    return { guidelines, commonIssues, bestPractices };
  }

  /**
   * Build system prompt for code review
   */
  buildSystemPrompt(language?: string): string {
    const langContext = language
      ? `\nPROGRAMMING LANGUAGE: ${language}\nFocus on ${language}-specific best practices and common pitfalls.`
      : '';

    return `${this.context.guidelines}${langContext}`;
  }

  /**
   * Build user prompt for code review
   */
  buildUserPrompt(code: string, userContext?: string): string {
    const contextNote = userContext
      ? `\n\nADDITIONAL CONTEXT:\n${userContext}\n`
      : '';

    return `Please review the following code:${contextNote}

\`\`\`
${code}
\`\`\`

Provide a comprehensive code review focusing on security, bugs, performance, and best practices.`;
  }

  /**
   * Extract severity from AI response
   */
  extractSeverity(response: string): 'info' | 'warning' | 'critical' {
    const lowerResponse = response.toLowerCase();

    if (
      lowerResponse.includes('critical') ||
      lowerResponse.includes('security vulnerability') ||
      lowerResponse.includes('sql injection') ||
      lowerResponse.includes('xss')
    ) {
      return 'critical';
    }

    if (
      lowerResponse.includes('warning') ||
      lowerResponse.includes('bug') ||
      lowerResponse.includes('issue')
    ) {
      return 'warning';
    }

    return 'info';
  }

  /**
   * Extract suggestions from AI response
   */
  extractSuggestions(response: string): string[] {
    const suggestions: string[] = [];

    // Match numbered lists
    const numberedRegex = /^\d+\.\s+(.+)$/gm;
    let match;

    while ((match = numberedRegex.exec(response)) !== null) {
      suggestions.push(match[1].trim());
    }

    // Match bullet points if no numbered list found
    if (suggestions.length === 0) {
      const bulletRegex = /^[-*]\s+(.+)$/gm;
      while ((match = bulletRegex.exec(response)) !== null) {
        suggestions.push(match[1].trim());
      }
    }

    return suggestions;
  }

  /**
   * Sanitize code to prevent injection
   */
  sanitizeCode(code: string): string {
    // Remove any potential script tags or dangerous patterns
    return code
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[REMOVED: script tag]')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '[REMOVED: iframe tag]')
      .trim();
  }

  /**
   * Validate code length
   */
  validateCodeLength(code: string, maxLength: number): boolean {
    return code.length > 0 && code.length <= maxLength;
  }

  /**
   * Detect if the input is code or regular conversation
   */
  isCode(input: string): boolean {
    const trimmed = input.trim();

    // Check for code block markers
    if (trimmed.startsWith('```') || trimmed.includes('```')) {
      return true;
    }

    // Strong code indicators that immediately mark it as code
    const strongIndicators = [
      // SQL queries (complete statements)
      /\b(SELECT|INSERT|UPDATE|DELETE)\b[\s\S]*\b(FROM|INTO|SET|WHERE)\b/i,
      // Function declarations
      /\b(function|def|async\s+function)\s+\w+\s*\(/,
      // HTML/JSX structures
      /<\w+[^>]*>[\s\S]*<\/\w+>/,
    ];

    for (const pattern of strongIndicators) {
      if (pattern.test(trimmed)) {
        return true;
      }
    }

    // Common code indicators
    const codeIndicators = [
      // Programming language keywords
      /\b(function|const|let|var|class|import|export|return|if|else|for|while|switch|case)\b/,
      // Common syntax patterns
      /[{}\[\]();]/,
      // Assignment operators
      /\w+\s*=\s*[\w"'`]/,
      // Arrow functions
      /=>/,
      // Method calls
      /\w+\.\w+\(/,
      // Type annotations (TypeScript)
      /:\s*(string|number|boolean|any|void|Array)/,
      // HTML/XML tags
      /<\/?[a-z][\s\S]*>/i,
      // SQL keywords (partial)
      /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|LIMIT|ORDER BY)\b/i,
      // Comments
      /\/\/|\/\*|\*\/|#\s/,
    ];

    // Count how many indicators match
    let matches = 0;
    for (const pattern of codeIndicators) {
      if (pattern.test(trimmed)) {
        matches++;
      }
    }

    // If we have 2+ indicators, it's likely code
    // Also check if the message is very short (< 50 chars) - likely not code unless it has strong indicators
    if (trimmed.length < 50 && matches < 2) {
      return false;
    }

    return matches >= 2;
  }

  /**
   * Build system prompt for general conversation
   */
  buildChatSystemPrompt(): string {
    return `You are a helpful AI assistant that specializes in software development and programming.

YOUR ROLE:
- Answer questions about programming, software development, and technology
- Provide explanations and guidance
- Help with problem-solving and debugging concepts
- Be friendly and conversational

IMPORTANT:
- If the user provides code snippets, you can discuss them, but don't automatically do a full code review unless specifically asked
- Be concise and helpful
- Use clear, simple language
- Provide examples when helpful`;
  }

  /**
   * Build user prompt for general conversation
   */
  buildChatUserPrompt(message: string): string {
    return message;
  }
}

// Export factory function
export function createContextService(): ContextService {
  logger.info('Context service initialized');
  return new ContextService();
}
