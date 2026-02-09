/**
 * Input Sanitization Utility
 * Prevents XSS attacks by sanitizing user inputs
 * React's built-in protection is used for JSX, this provides additional server-side sanitization
 */

/**
 * Sanitizes string input to prevent XSS attacks
 * Removes potentially dangerous HTML/JavaScript
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '')

  // Escape HTML special characters
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }

  sanitized = sanitized.replace(/[&<>"'\/]/g, char => htmlEscapeMap[char])

  return sanitized
}

/**
 * Sanitizes object by recursively sanitizing all string values
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj
  }

  const sanitized = { ...obj }

  for (const key in sanitized) {
    if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
      const value = sanitized[key]

      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value) as any
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = sanitizeObject(value)
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item: any) =>
          typeof item === 'string' ? sanitizeString(item) : item
        ) as any
      }
    }
  }

  return sanitized
}

/**
 * Sanitizes URL to prevent javascript: and data: protocols
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return ''
  }

  const trimmed = url.trim().toLowerCase()

  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('file:')
  ) {
    return ''
  }

  return url
}

/**
 * Sanitizes HTML content while preserving safe tags
 * Only allows specific safe tags and attributes
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')

  // Remove style tags
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

  // Remove iframe tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')

  // Remove embed tags
  sanitized = sanitized.replace(/<embed\b[^<]*>/gi, '')

  // Remove object tags
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')

  return sanitized
}

/**
 * Validates and sanitizes email address
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return ''
  }

  const sanitized = email.trim().toLowerCase()

  // Basic email validation pattern
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailPattern.test(sanitized)) {
    return ''
  }

  return sanitized
}

/**
 * Sanitizes numeric input
 */
export function sanitizeNumber(input: string | number): number | null {
  if (input === null || input === undefined) {
    return null
  }

  const num = typeof input === 'string' ? parseFloat(input) : input

  if (isNaN(num)) {
    return null
  }

  return num
}

/**
 * Sanitizes file name to prevent directory traversal
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    return ''
  }

  // Remove path separators and null bytes
  let sanitized = fileName.replace(/[\/\\:\*\?"<>\|]/g, '')
  sanitized = sanitized.replace(/\0/g, '')
  sanitized = sanitized.replace(/\.\./g, '')

  // Remove leading dots
  sanitized = sanitized.replace(/^\.+/, '')

  return sanitized
}
