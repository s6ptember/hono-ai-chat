/**
 * Type Definitions
 */

// Environment Configuration
export interface EnvConfig {
  NODE_ENV: string;
  GROQ_API_KEY: string;
  ACCESS_TOKEN?: string;
  ALLOWED_ORIGINS: string;
  RATE_LIMIT_REQUESTS: string;
  RATE_LIMIT_WINDOW: string;
  MAX_CODE_LENGTH: string;
}

// Cloudflare Workers Bindings
export interface Bindings {
  GROQ_API_KEY: string;
  ACCESS_TOKEN?: string;
  SESSIONS?: KVNamespace;
  NODE_ENV?: string;
  ALLOWED_ORIGINS?: string;
  RATE_LIMIT_REQUESTS?: string;
  RATE_LIMIT_WINDOW?: string;
  MAX_CODE_LENGTH?: string;
}

// Chat Message (Groq API format)
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Code Review Request
export interface CodeReviewRequest {
  session_id: string;
  code: string;
  language?: string;
  context?: string;
}

// Code Review Response
export interface CodeReviewResponse {
  review: string;
  severity: 'info' | 'warning' | 'critical';
  suggestions: string[];
  timestamp: string;
}

// Chat Session
export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
  expires_at: string;
}

// API Response
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

// Code Review Context
export interface CodeReviewContext {
  guidelines: string;
  commonIssues: string[];
  bestPractices: string[];
}

// Rate Limit Info
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}
