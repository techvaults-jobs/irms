import { cookies } from 'next/headers'
import crypto from 'crypto'

/**
 * CSRF Protection Utility
 * Implements double-submit cookie pattern for CSRF protection
 */

const CSRF_TOKEN_COOKIE_NAME = 'csrf-token'
const CSRF_TOKEN_HEADER_NAME = 'x-csrf-token'
const TOKEN_LENGTH = 32

/**
 * Generates a new CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex')
}

/**
 * Sets CSRF token in cookies
 */
export async function setCSRFTokenCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(CSRF_TOKEN_COOKIE_NAME, token, {
    httpOnly: false, // Must be accessible to JavaScript for form submission
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  })
}

/**
 * Gets CSRF token from cookies
 */
export async function getCSRFTokenFromCookie(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(CSRF_TOKEN_COOKIE_NAME)?.value
}

/**
 * Validates CSRF token from request
 * Compares token from header/body with token from cookie
 */
export async function validateCSRFToken(
  tokenFromRequest: string | undefined
): Promise<boolean> {
  if (!tokenFromRequest) {
    return false
  }

  const tokenFromCookie = await getCSRFTokenFromCookie()

  if (!tokenFromCookie) {
    return false
  }

  // Use constant-time comparison to prevent timing attacks
  return constantTimeCompare(tokenFromRequest, tokenFromCookie)
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

/**
 * Extracts CSRF token from request
 * Checks header first, then body
 */
export async function extractCSRFToken(
  headerValue?: string,
  bodyToken?: string
): Promise<string | undefined> {
  return headerValue || bodyToken
}
