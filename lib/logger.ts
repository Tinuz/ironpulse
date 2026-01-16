/**
 * Structured Logging Utility
 * 
 * Provides consistent, structured logging across the application.
 * In production, logs can be sent to external services (Sentry, LogRocket, etc.)
 * 
 * Features:
 * - Structured log format with context
 * - Different log levels (debug, info, warn, error)
 * - Request tracking and correlation IDs
 * - Performance metrics
 * - Error tracking with stack traces
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  userId?: string
  requestId?: string
  endpoint?: string
  method?: string
  statusCode?: number
  duration?: number
  userAgent?: string
  ip?: string
  [key: string]: any
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isProduction = process.env.NODE_ENV === 'production'

  /**
   * Log a debug message (development only)
   */
  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      this.log('debug', message, context)
    }
  }

  /**
   * Log an informational message
   */
  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }

  /**
   * Log an error with stack trace
   */
  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorDetails = error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      : undefined

    this.log('error', message, context, errorDetails)

    // In production, send to external error tracking service
    if (this.isProduction && error instanceof Error) {
      this.sendToErrorTracking(message, error, context)
    }
  }

  /**
   * Log API request/response
   */
  apiLog(context: LogContext & { statusCode: number; duration: number }) {
    const level: LogLevel = context.statusCode >= 500 ? 'error' 
      : context.statusCode >= 400 ? 'warn' 
      : 'info'

    const message = `API ${context.method} ${context.endpoint} - ${context.statusCode} (${context.duration}ms)`
    
    this.log(level, message, context)
  }

  /**
   * Log rate limit event
   */
  rateLimitLog(userId: string, endpoint: string, limit: number) {
    this.warn('Rate limit exceeded', {
      userId,
      endpoint,
      limit,
      event: 'rate_limit_exceeded'
    })
  }

  /**
   * Log authentication event
   */
  authLog(event: 'login' | 'logout' | 'auth_failure', userId?: string, context?: LogContext) {
    const level: LogLevel = event === 'auth_failure' ? 'warn' : 'info'
    
    this.log(level, `Auth: ${event}`, {
      ...context,
      userId,
      event: `auth_${event}`
    })
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: LogEntry['error']
  ) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error
    }

    // Console output with formatting
    if (this.isDevelopment) {
      this.prettyPrint(entry)
    } else {
      // JSON output for production log aggregation
      console.log(JSON.stringify(entry))
    }
  }

  /**
   * Pretty print for development
   */
  private prettyPrint(entry: LogEntry) {
    const colors = {
      debug: '\x1b[36m',    // Cyan
      info: '\x1b[32m',     // Green
      warn: '\x1b[33m',     // Yellow
      error: '\x1b[31m',    // Red
      reset: '\x1b[0m'
    }

    const color = colors[entry.level]
    const timestamp = entry.timestamp.split('T')[1]?.split('.')[0]
    
    console.log(
      `${color}[${entry.level.toUpperCase()}]${colors.reset} ${timestamp} - ${entry.message}`
    )

    if (entry.context) {
      console.log('  Context:', entry.context)
    }

    if (entry.error) {
      console.error('  Error:', entry.error.message)
      if (entry.error.stack) {
        console.error('  Stack:', entry.error.stack)
      }
    }
  }

  /**
   * Send to external error tracking service
   * TODO: Implement Sentry, LogRocket, or similar
   */
  private sendToErrorTracking(
    message: string,
    error: Error,
    context?: LogContext
  ) {
    // Placeholder for future implementation
    // Example with Sentry:
    // Sentry.captureException(error, {
    //   tags: { endpoint: context?.endpoint },
    //   user: { id: context?.userId },
    //   extra: context
    // })
    
    console.error('Error tracking not configured:', {
      message,
      error: error.message,
      context
    })
  }
}

// Export singleton instance
export const logger = new Logger()

/**
 * Utility to measure and log performance
 */
export function logPerformance<T>(
  operation: string,
  fn: () => T | Promise<T>,
  context?: LogContext
): Promise<T> {
  const start = Date.now()
  
  const measure = (result: T) => {
    const duration = Date.now() - start
    
    if (duration > 1000) {
      logger.warn(`Slow operation: ${operation}`, {
        ...context,
        duration,
        operation
      })
    } else {
      logger.debug(`${operation} completed`, {
        ...context,
        duration,
        operation
      })
    }
    
    return result
  }

  try {
    const result = fn()
    
    if (result instanceof Promise) {
      return result.then(measure).catch(error => {
        logger.error(`Operation failed: ${operation}`, error, context)
        throw error
      })
    }
    
    return Promise.resolve(measure(result))
  } catch (error) {
    logger.error(`Operation failed: ${operation}`, error, context)
    throw error
  }
}

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}
