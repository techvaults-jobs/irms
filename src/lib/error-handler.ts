import { NextResponse } from 'next/server'
import { logger } from './logger'

/**
 * Error codes for different types of errors
 */
export enum ErrorCode {
  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_DATA_TYPE = 'INVALID_DATA_TYPE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  TOO_MANY_FILES = 'TOO_MANY_FILES',

  // Authentication errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  CANNOT_ACCESS_RESOURCE = 'CANNOT_ACCESS_RESOURCE',

  // Not found errors (404)
  NOT_FOUND = 'NOT_FOUND',
  REQUISITION_NOT_FOUND = 'REQUISITION_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  APPROVAL_RULE_NOT_FOUND = 'APPROVAL_RULE_NOT_FOUND',
  ATTACHMENT_NOT_FOUND = 'ATTACHMENT_NOT_FOUND',

  // Conflict errors (409)
  CONFLICT = 'CONFLICT',
  INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION',
  CONCURRENT_MODIFICATION = 'CONCURRENT_MODIFICATION',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',

  // Business rule violations (422)
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  PAYMENT_AMOUNT_EXCEEDS_THRESHOLD = 'PAYMENT_AMOUNT_EXCEEDS_THRESHOLD',
  MISSING_REJECTION_COMMENT = 'MISSING_REJECTION_COMMENT',
  MISSING_VARIANCE_COMMENT = 'MISSING_VARIANCE_COMMENT',
  INVALID_APPROVAL_RULE = 'INVALID_APPROVAL_RULE',

  // Server errors (500)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Service unavailable (503)
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, any>,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/**
 * Validation error class
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, details)
    this.name = 'ValidationError'
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Unauthorized', details?: Record<string, any>) {
    super(ErrorCode.UNAUTHORIZED, message, 401, details)
    this.name = 'AuthenticationError'
  }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Forbidden', details?: Record<string, any>) {
    super(ErrorCode.FORBIDDEN, message, 403, details)
    this.name = 'AuthorizationError'
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends AppError {
  constructor(resourceType: string, resourceId?: string) {
    const message = resourceId
      ? `${resourceType} with ID ${resourceId} not found`
      : `${resourceType} not found`
    super(ErrorCode.NOT_FOUND, message, 404, { resourceType, resourceId })
    this.name = 'NotFoundError'
  }
}

/**
 * Conflict error class
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.CONFLICT, message, 409, details)
    this.name = 'ConflictError'
  }
}

/**
 * Business rule violation error class
 */
export class BusinessRuleError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.BUSINESS_RULE_VIOLATION, message, 422, details)
    this.name = 'BusinessRuleError'
  }
}

/**
 * Format error response
 */
function formatErrorResponse(error: AppError) {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
    },
  }
}

/**
 * Handle errors and return appropriate response
 */
export function handleError(error: unknown, context?: Record<string, any>) {
  // Log the error with full context
  if (error instanceof AppError) {
    logger.error(error.message, {
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
      originalError: error.originalError?.message,
      context,
    })

    return NextResponse.json(formatErrorResponse(error), {
      status: error.statusCode,
    })
  }

  if (error instanceof Error) {
    // Handle Prisma errors
    if (error.message.includes('Unique constraint failed')) {
      const duplicateError = new AppError(
        ErrorCode.DUPLICATE_RESOURCE,
        'A resource with this value already exists',
        409,
        { originalMessage: error.message }
      )
      logger.error('Duplicate resource error', {
        code: duplicateError.code,
        statusCode: duplicateError.statusCode,
        originalError: error.message,
        context,
      })
      return NextResponse.json(formatErrorResponse(duplicateError), {
        status: 409,
      })
    }

    if (error.message.includes('Foreign key constraint failed')) {
      const fkError = new AppError(
        ErrorCode.DATABASE_ERROR,
        'Invalid reference to related resource',
        400,
        { originalMessage: error.message }
      )
      logger.error('Foreign key constraint error', {
        code: fkError.code,
        statusCode: fkError.statusCode,
        originalError: error.message,
        context,
      })
      return NextResponse.json(formatErrorResponse(fkError), {
        status: 400,
      })
    }

    // Generic error
    const genericError = new AppError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'An unexpected error occurred',
      500,
      undefined,
      error
    )
    logger.error('Unexpected error', {
      code: genericError.code,
      statusCode: genericError.statusCode,
      originalError: error.message,
      stack: error.stack,
      context,
    })
    return NextResponse.json(formatErrorResponse(genericError), {
      status: 500,
    })
  }

  // Unknown error type
  const unknownError = new AppError(
    ErrorCode.INTERNAL_SERVER_ERROR,
    'An unexpected error occurred',
    500
  )
  logger.error('Unknown error type', {
    code: unknownError.code,
    statusCode: unknownError.statusCode,
    error: String(error),
    context,
  })
  return NextResponse.json(formatErrorResponse(unknownError), {
    status: 500,
  })
}

/**
 * Wrap an async handler with error handling
 */
export function withErrorHandling(
  handler: (req: any, context: any) => Promise<NextResponse>
) {
  return async (req: any, context: any) => {
    try {
      return await handler(req, context)
    } catch (error) {
      return handleError(error, {
        method: req.method,
        url: req.url,
        pathname: req.nextUrl.pathname,
      })
    }
  }
}
