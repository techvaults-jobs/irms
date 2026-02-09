import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema, ZodError } from 'zod'

/**
 * Validation middleware for API routes
 * Validates request body against a Zod schema
 */

export interface ValidationErrorResponse {
  error: {
    code: string
    message: string
    details: Array<{
      field: string
      message: string
    }>
  }
}

/**
 * Validates request body against a Zod schema
 * Returns validated data or throws error
 */
export async function validateRequestBody<T>(
  req: NextRequest,
  schema: ZodSchema
): Promise<T> {
  try {
    const body = await req.json()
    return schema.parse(body) as T
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(error)
    }
    throw error
  }
}

/**
 * Validates query parameters against a Zod schema
 * Returns validated data or throws error
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema
): T {
  try {
    const params: Record<string, any> = {}
    searchParams.forEach((value, key) => {
      params[key] = value
    })
    return schema.parse(params) as T
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(error)
    }
    throw error
  }
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  public readonly errors: Array<{
    field: string
    message: string
  }>

  constructor(zodError: ZodError) {
    super('Validation failed')
    this.name = 'ValidationError'
    this.errors = zodError.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }))
  }

  toResponse(): ValidationErrorResponse {
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: this.errors,
      },
    }
  }
}

/**
 * Handles validation errors and returns appropriate response
 */
export function handleValidationError(error: ValidationError): NextResponse {
  return NextResponse.json(error.toResponse(), { status: 400 })
}

/**
 * Validates and parses form data with file
 */
export async function validateFormData<T>(
  req: NextRequest,
  schema: ZodSchema
): Promise<T> {
  try {
    const formData = await req.formData()
    const data: Record<string, any> = {}

    // Convert FormData to object
    formData.forEach((value, key) => {
      if (key === 'file') {
        data[key] = value // Keep File object as is
      } else {
        data[key] = value
      }
    })

    return schema.parse(data) as T
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(error)
    }
    throw error
  }
}

/**
 * Validates data against a schema and returns result
 */
export function validateData<T>(
  data: unknown,
  schema: ZodSchema
): { success: true; data: T } | { success: false; error: ValidationError } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated as T }
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: new ValidationError(error) }
    }
    throw error
  }
}
