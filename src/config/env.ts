/**
 * Environment Configuration
 */

import type { EnvConfig, Bindings } from '../types/index.ts';
import { ValidationError } from '../utils/errors.ts';
import { logger } from '../utils/logger.ts';

/**
 * Parse and validate environment variables from Cloudflare Workers bindings
 */
export function getEnv(bindings: Bindings): EnvConfig {
  const groqApiKey = bindings.GROQ_API_KEY;

  if (!groqApiKey) {
    throw new ValidationError('GROQ_API_KEY is required');
  }

  const config: EnvConfig = {
    NODE_ENV: bindings.NODE_ENV || 'production',
    GROQ_API_KEY: groqApiKey,
    ACCESS_TOKEN: bindings.ACCESS_TOKEN,
    ALLOWED_ORIGINS: bindings.ALLOWED_ORIGINS || '*',
    RATE_LIMIT_REQUESTS: bindings.RATE_LIMIT_REQUESTS || '20',
    RATE_LIMIT_WINDOW: bindings.RATE_LIMIT_WINDOW || '60',
    MAX_CODE_LENGTH: bindings.MAX_CODE_LENGTH || '10000',
  };

  logger.setEnvironment(config.NODE_ENV);

  return config;
}

/**
 * Validate configuration
 */
export function validateConfig(config: EnvConfig): void {
  const errors: string[] = [];

  if (!config.GROQ_API_KEY || config.GROQ_API_KEY.length < 10) {
    errors.push('Invalid GROQ_API_KEY');
  }

  const rateLimitRequests = parseInt(config.RATE_LIMIT_REQUESTS, 10);
  if (isNaN(rateLimitRequests) || rateLimitRequests < 1) {
    errors.push('RATE_LIMIT_REQUESTS must be a positive number');
  }

  const rateLimitWindow = parseInt(config.RATE_LIMIT_WINDOW, 10);
  if (isNaN(rateLimitWindow) || rateLimitWindow < 1) {
    errors.push('RATE_LIMIT_WINDOW must be a positive number');
  }

  const maxCodeLength = parseInt(config.MAX_CODE_LENGTH, 10);
  if (isNaN(maxCodeLength) || maxCodeLength < 100) {
    errors.push('MAX_CODE_LENGTH must be at least 100');
  }

  if (errors.length > 0) {
    throw new ValidationError('Configuration validation failed', { errors });
  }
}

// Development environment configuration for Bun
export const env: EnvConfig = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  ACCESS_TOKEN: process.env.ACCESS_TOKEN,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '*',
  RATE_LIMIT_REQUESTS: process.env.RATE_LIMIT_REQUESTS || '20',
  RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || '60',
  MAX_CODE_LENGTH: process.env.MAX_CODE_LENGTH || '10000',
};
