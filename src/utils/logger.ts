/**
 * Structured Logger
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = false;
  }

  setEnvironment(env: string): void {
    this.isDevelopment = env === 'development';
  }

  private log(level: LogLevel, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(data && { data }),
    };

    const logFn = level === 'error' ? console.error : console.log;

    if (this.isDevelopment) {
      logFn(`[${entry.level.toUpperCase()}] ${entry.message}`, data || '');
    } else {
      logFn(JSON.stringify(entry));
    }
  }

  debug(message: string, data?: any): void {
    if (this.isDevelopment) {
      this.log('debug', message, data);
    }
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: any): void {
    const errorData = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;

    this.log('error', message, errorData);
  }

  logAIRequest(sessionId: string, codeLength: number): void {
    this.info('AI request initiated', {
      sessionId,
      codeLength,
    });
  }

  logAIResponse(sessionId: string, responseLength: number, duration: number): void {
    this.info('AI response received', {
      sessionId,
      responseLength,
      duration,
    });
  }

  logRateLimit(identifier: string, action: 'allowed' | 'blocked'): void {
    this.info('Rate limit check', {
      identifier,
      action,
    });
  }
}

export const logger = new Logger();
