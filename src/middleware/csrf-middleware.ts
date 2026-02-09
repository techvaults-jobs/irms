import { NextRequest, NextResponse } from 'next/server'
import { validateCSRFToken, extractCSRFToken } from '@/lib/csrf-protection'

/**
 * CSRF Middleware
 * Validates CSRF tokens on state-changing requests (POST, PATCH, DELETE, PUT)
 */

const PROTECTED_METHODS = ['POST', 'PATCH', 'DELETE', 'PUT']

export async function csrfMiddleware(req: NextRequest): Promise<NextResponse | null> {
  // Only validate state-changing requests
  if (!PROTECTED_METHODS.includes(req.method)) {
    return null
  }

  // Skip CSRF validation for certain endpoints (e.g., auth endpoints)
  const pathname = req.nextUrl.pathname
  if (pathname.startsWith('/api/auth')) {
    return null
  }

  // Extract CSRF token from header
  const headerToken = req.headers.get(CSRF_TOKEN_HEADER_NAME)

  // For POST/PATCH requests, also try to extract from body
  let bodyToken: string | undefined
  if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
    try {
      const contentType = req.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const body = await req.json()
        bodyToken = body._csrf_token
        // Clone the request with the body for downstream handlers
        req = new NextRequest(req, {
          body: JSON.stringify(body),
        })
      }
    } catch (error) {
      // If body parsing fails, continue with header token only
    }
  }

  const token = await extractCSRFToken(headerToken || undefined, bodyToken)
  const isValid = await validateCSRFToken(token)

  if (!isValid) {
    return NextResponse.json(
      {
        error: {
          code: 'CSRF_VALIDATION_FAILED',
          message: 'CSRF token validation failed',
        },
      },
      { status: 403 }
    )
  }

  return null
}

const CSRF_TOKEN_HEADER_NAME = 'x-csrf-token'
