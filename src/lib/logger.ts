/**
 * Structured logging system for the IRMS application
 * Logs all errors and important events with full context for debugging
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, any>
  stack?: string
}

/**
 * Format log entry as JSON for structured logging
 */
function formatLogEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, any>,
  stack?: string
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && { context }),
    ...(stack && { stack }),
  }
}

/**
 * Output log entry to console
 */
function outputLog(entry: LogEntry): void {
  const logOutput = JSON.stringify(entry)

  switch (entry.level) {
    case LogLevel.DEBUG:
      console.debug(logOutput)
      break
    case LogLevel.INFO:
      console.info(logOutput)
      break
    case LogLevel.WARN:
      console.warn(logOutput)
      break
    case LogLevel.ERROR:
      console.error(logOutput)
      break
  }
}

/**
 * Logger class for structured logging
 */
class Logger {
  private minLevel: LogLevel = LogLevel.DEBUG

  constructor(minLevel?: LogLevel) {
    if (minLevel) {
      this.minLevel = minLevel
    }
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]
    const minIndex = levels.indexOf(this.minLevel)
    const currentIndex = levels.indexOf(level)
    return currentIndex >= minIndex
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = formatLogEntry(LogLevel.DEBUG, message, context)
      outputLog(entry)
    }
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = formatLogEntry(LogLevel.INFO, message, context)
      outputLog(entry)
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const entry = formatLogEntry(LogLevel.WARN, message, context)
      outputLog(entry)
    }
  }

  /**
   * Log error message with full context
   */
  error(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const entry = formatLogEntry(LogLevel.ERROR, message, context)
      outputLog(entry)
    }
  }

  /**
   * Log error with stack trace
   */
  errorWithStack(message: string, error: Error, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const entry = formatLogEntry(LogLevel.ERROR, message, context, error.stack)
      outputLog(entry)
    }
  }

  /**
   * Log API request
   */
  logRequest(
    method: string,
    pathname: string,
    context?: Record<string, any>
  ): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = formatLogEntry(LogLevel.INFO, `${method} ${pathname}`, {
        type: 'REQUEST',
        ...context,
      })
      outputLog(entry)
    }
  }

  /**
   * Log API response
   */
  logResponse(
    method: string,
    pathname: string,
    statusCode: number,
    duration: number,
    context?: Record<string, any>
  ): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = formatLogEntry(LogLevel.INFO, `${method} ${pathname} ${statusCode}`, {
        type: 'RESPONSE',
        statusCode,
        duration,
        ...context,
      })
      outputLog(entry)
    }
  }

  /**
   * Log database operation
   */
  logDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    context?: Record<string, any>
  ): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = formatLogEntry(LogLevel.DEBUG, `Database: ${operation} on ${table}`, {
        type: 'DATABASE',
        operation,
        table,
        duration,
        ...context,
      })
      outputLog(entry)
    }
  }

  /**
   * Log audit event
   */
  logAuditEvent(
    eventType: string,
    userId: string,
    resourceId: string,
    context?: Record<string, any>
  ): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = formatLogEntry(LogLevel.INFO, `Audit: ${eventType}`, {
        type: 'AUDIT',
        eventType,
        userId,
        resourceId,
        ...context,
      })
      outputLog(entry)
    }
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    eventType: string,
    userId: string | null,
    context?: Record<string, any>
  ): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const entry = formatLogEntry(LogLevel.WARN, `Security: ${eventType}`, {
        type: 'SECURITY',
        eventType,
        userId,
        ...context,
      })
      outputLog(entry)
    }
  }

  /**
   * Log performance metric
   */
  logPerformance(
    operation: string,
    duration: number,
    context?: Record<string, any>
  ): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = formatLogEntry(LogLevel.DEBUG, `Performance: ${operation}`, {
        type: 'PERFORMANCE',
        operation,
        duration,
        ...context,
      })
      outputLog(entry)
    }
  }
}

// Determine log level from environment
const logLevel = (() => {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase()
  if (envLevel && Object.values(LogLevel).includes(envLevel as LogLevel)) {
    return envLevel as LogLevel
  }
  // Default to INFO in production, DEBUG in development
  return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG
})()

// Export singleton logger instance
export const logger = new Logger(logLevel)
