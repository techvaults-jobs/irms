import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { handleError } from '@/lib/error-handler'

/**
 * Middleware that wraps API handlers with error handling and logging
 * Logs all requests, responses, and errors with full context
 */
export function withErrorLogging(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: any) => {
    const startTime = Date.now()
    const method = req.method
    const pathname = req.nextUrl.pathname
    const searchParams = Object.fromEntries(req.nextUrl.searchParams)

    // Log incoming request
    logger.logRequest(method, pathname, {
      searchParams: Object.keys(searchParams).length > 0 ? searchParams : undefined,
    })

    try {
      // Execute the handler
      const response = await handler(req, context)

      // Log successful response
      const duration = Date.now() - startTime
      logger.logResponse(method, pathname, response.status, duration)

      return response
    } catch (error) {
      // Log error with full context
      const duration = Date.now() - startTime
      logger.error(`Error in ${method} ${pathname}`, {
        duration,
        error: error instanceof Error ? error.message : String(error),
      })

      // Handle and return error response
      return handleError(error, {
        method,
        pathname,
        duration,
      })
    }
  }
}

/**
 * Middleware that wraps async operations with error handling and logging
 */
export async function withErrorLoggingAsync<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  const startTime = Date.now()

  try {
    logger.debug(`Starting operation: ${operation}`, context)
    const result = await fn()
    const duration = Date.now() - startTime
    logger.debug(`Completed operation: ${operation}`, {
      ...context,
      duration,
    })
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error(`Error in operation: ${operation}`, {
      ...context,
      duration,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
