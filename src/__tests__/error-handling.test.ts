import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessRuleError,
  ErrorCode,
  handleError,
} from '@/lib/error-handler'
import { NextResponse } from 'next/server'

describe('Error Handling System', () => {
  describe('Error Classes', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Test error',
        500,
        { detail: 'test' }
      )

      expect(error.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR)
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(500)
      expect(error.details).toEqual({ detail: 'test' })
    })

    it('should create ValidationError with 400 status', () => {
      const error = new ValidationError('Invalid input', { field: 'email' })

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR)
      expect(error.statusCode).toBe(400)
      expect(error.details).toEqual({ field: 'email' })
    })

    it('should create AuthenticationError with 401 status', () => {
      const error = new AuthenticationError('Invalid credentials')

      expect(error.code).toBe(ErrorCode.UNAUTHORIZED)
      expect(error.statusCode).toBe(401)
      expect(error.message).toBe('Invalid credentials')
    })

    it('should create AuthorizationError with 403 status', () => {
      const error = new AuthorizationError('Access denied')

      expect(error.code).toBe(ErrorCode.FORBIDDEN)
      expect(error.statusCode).toBe(403)
      expect(error.message).toBe('Access denied')
    })

    it('should create NotFoundError with 404 status', () => {
      const error = new NotFoundError('Requisition', 'req-123')

      expect(error.code).toBe(ErrorCode.NOT_FOUND)
      expect(error.statusCode).toBe(404)
      expect(error.message).toContain('Requisition')
      expect(error.message).toContain('req-123')
    })

    it('should create ConflictError with 409 status', () => {
      const error = new ConflictError('Resource already exists')

      expect(error.code).toBe(ErrorCode.CONFLICT)
      expect(error.statusCode).toBe(409)
    })

    it('should create BusinessRuleError with 422 status', () => {
      const error = new BusinessRuleError('Invalid status transition')

      expect(error.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION)
      expect(error.statusCode).toBe(422)
    })
  })

  describe('Error Handling', () => {
    it('should handle AppError and return correct response', () => {
      const error = new ValidationError('Invalid email', { field: 'email' })
      const response = handleError(error)

      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(400)
    })

    it('should handle generic Error', async () => {
      const error = new Error('Something went wrong')
      const response = handleError(error)

      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(500)
    })

    it('should handle Prisma unique constraint error', async () => {
      const error = new Error('Unique constraint failed on the fields: (`email`)')
      const response = handleError(error)

      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(409)
    })

    it('should handle Prisma foreign key constraint error', async () => {
      const error = new Error('Foreign key constraint failed on the field: `departmentId`')
      const response = handleError(error)

      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(400)
    })

    it('should handle unknown error type', () => {
      const response = handleError('Unknown error')

      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(500)
    })

    it('should include context in error handling', () => {
      const error = new ValidationError('Invalid input')
      const context = { userId: 'user-123', action: 'create' }
      const response = handleError(error, context)

      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(400)
    })
  })

  describe('Error Response Format', () => {
    it('should format error response with code and message', async () => {
      const error = new ValidationError('Invalid email')
      const response = handleError(error)
      const body = await response.json()

      expect(body).toHaveProperty('error')
      expect(body.error).toHaveProperty('code')
      expect(body.error).toHaveProperty('message')
      expect(body.error.code).toBe(ErrorCode.VALIDATION_ERROR)
    })

    it('should include details in error response when provided', async () => {
      const error = new ValidationError('Invalid input', { field: 'email', reason: 'Invalid format' })
      const response = handleError(error)
      const body = await response.json()

      expect(body.error).toHaveProperty('details')
      expect(body.error.details).toEqual({ field: 'email', reason: 'Invalid format' })
    })

    it('should not include details when not provided', async () => {
      const error = new ValidationError('Invalid input')
      const response = handleError(error)
      const body = await response.json()

      expect(body.error).not.toHaveProperty('details')
    })
  })

  describe('Error Codes', () => {
    it('should have all required error codes', () => {
      expect(ErrorCode.VALIDATION_ERROR).toBeDefined()
      expect(ErrorCode.UNAUTHORIZED).toBeDefined()
      expect(ErrorCode.FORBIDDEN).toBeDefined()
      expect(ErrorCode.NOT_FOUND).toBeDefined()
      expect(ErrorCode.CONFLICT).toBeDefined()
      expect(ErrorCode.BUSINESS_RULE_VIOLATION).toBeDefined()
      expect(ErrorCode.INTERNAL_SERVER_ERROR).toBeDefined()
    })

    it('should have validation-specific error codes', () => {
      expect(ErrorCode.MISSING_REQUIRED_FIELD).toBeDefined()
      expect(ErrorCode.INVALID_DATA_TYPE).toBeDefined()
      expect(ErrorCode.INVALID_FILE_TYPE).toBeDefined()
      expect(ErrorCode.FILE_TOO_LARGE).toBeDefined()
    })

    it('should have business rule error codes', () => {
      expect(ErrorCode.INVALID_STATUS_TRANSITION).toBeDefined()
      expect(ErrorCode.PAYMENT_AMOUNT_EXCEEDS_THRESHOLD).toBeDefined()
      expect(ErrorCode.MISSING_REJECTION_COMMENT).toBeDefined()
    })
  })
})
