import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import {
  generateCSRFToken,
  validateCSRFToken,
  getCSRFTokenFromCookie,
  setCSRFTokenCookie,
} from '@/lib/csrf-protection'
import {
  sanitizeString,
  sanitizeObject,
  sanitizeUrl,
  sanitizeHtml,
  sanitizeEmail,
  sanitizeFileName,
} from '@/lib/input-sanitization'
import {
  validateDatabaseInput,
  validateDatabaseInputs,
  validateDatabaseObject,
} from '@/lib/sql-injection-prevention'

/**
 * Security Hardening Tests
 * Tests for CSRF protection, XSS prevention, and SQL injection prevention
 * Validates: Requirements 6.7
 */

describe('Security Hardening', () => {
  // ============================================================================
  // CSRF Protection Tests
  // ============================================================================

  describe('CSRF Protection', () => {
    it('should generate a valid CSRF token', () => {
      const token = generateCSRFToken()
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    it('should generate unique CSRF tokens', () => {
      const token1 = generateCSRFToken()
      const token2 = generateCSRFToken()
      expect(token1).not.toBe(token2)
    })

    it('should generate tokens of consistent length', () => {
      const token1 = generateCSRFToken()
      const token2 = generateCSRFToken()
      expect(token1.length).toBe(token2.length)
    })

    it('should reject undefined CSRF tokens', async () => {
      const isValid = await validateCSRFToken(undefined)
      expect(isValid).toBe(false)
    })

    it('should reject empty CSRF tokens', async () => {
      const isValid = await validateCSRFToken('')
      expect(isValid).toBe(false)
    })
  })

  // ============================================================================
  // XSS Prevention Tests
  // ============================================================================

  describe('XSS Prevention - Input Sanitization', () => {
    describe('sanitizeString', () => {
      it('should escape HTML special characters', () => {
        const input = '<script>alert("xss")</script>'
        const sanitized = sanitizeString(input)
        expect(sanitized).not.toContain('<')
        expect(sanitized).not.toContain('>')
        expect(sanitized).toContain('&lt;')
        expect(sanitized).toContain('&gt;')
      })

      it('should escape quotes', () => {
        const input = 'Test "quoted" and \'single\' text'
        const sanitized = sanitizeString(input)
        expect(sanitized).toContain('&quot;')
        expect(sanitized).toContain('&#x27;')
      })

      it('should escape ampersands', () => {
        const input = 'Tom & Jerry'
        const sanitized = sanitizeString(input)
        expect(sanitized).toContain('&amp;')
      })

      it('should remove null bytes', () => {
        const input = 'Test\0String'
        const sanitized = sanitizeString(input)
        expect(sanitized).not.toContain('\0')
      })

      it('should handle empty strings', () => {
        const sanitized = sanitizeString('')
        expect(sanitized).toBe('')
      })

      it('should handle non-string inputs', () => {
        const sanitized = sanitizeString(null as any)
        expect(sanitized).toBe('')
      })

      it('should preserve safe text', () => {
        const input = 'This is safe text'
        const sanitized = sanitizeString(input)
        expect(sanitized).toBe(input)
      })
    })

    describe('sanitizeObject', () => {
      it('should sanitize all string values in object', () => {
        const input = {
          title: '<script>alert("xss")</script>',
          description: 'Safe text',
          nested: {
            value: '<img src=x onerror="alert(1)">',
          },
        }
        const sanitized = sanitizeObject(input)
        expect(sanitized.title).not.toContain('<script>')
        expect(sanitized.description).toBe('Safe text')
        expect(sanitized.nested.value).not.toContain('<img')
      })

      it('should handle arrays in objects', () => {
        const input = {
          tags: ['<script>', 'safe', '<img>'],
        }
        const sanitized = sanitizeObject(input)
        expect(sanitized.tags[0]).not.toContain('<script>')
        expect(sanitized.tags[1]).toBe('safe')
        expect(sanitized.tags[2]).not.toContain('<img>')
      })
    })

    describe('sanitizeUrl', () => {
      it('should reject javascript: protocol', () => {
        const url = 'javascript:alert("xss")'
        const sanitized = sanitizeUrl(url)
        expect(sanitized).toBe('')
      })

      it('should reject data: protocol', () => {
        const url = 'data:text/html,<script>alert("xss")</script>'
        const sanitized = sanitizeUrl(url)
        expect(sanitized).toBe('')
      })

      it('should reject vbscript: protocol', () => {
        const url = 'vbscript:msgbox("xss")'
        const sanitized = sanitizeUrl(url)
        expect(sanitized).toBe('')
      })

      it('should reject file: protocol', () => {
        const url = 'file:///etc/passwd'
        const sanitized = sanitizeUrl(url)
        expect(sanitized).toBe('')
      })

      it('should allow safe URLs', () => {
        const url = 'https://example.com/page'
        const sanitized = sanitizeUrl(url)
        expect(sanitized).toBe(url)
      })

      it('should allow relative URLs', () => {
        const url = '/api/requisitions'
        const sanitized = sanitizeUrl(url)
        expect(sanitized).toBe(url)
      })
    })

    describe('sanitizeHtml', () => {
      it('should remove script tags', () => {
        const html = '<p>Text</p><script>alert("xss")</script>'
        const sanitized = sanitizeHtml(html)
        expect(sanitized).not.toContain('<script>')
      })

      it('should remove event handlers', () => {
        const html = '<img src="x" onerror="alert(1)">'
        const sanitized = sanitizeHtml(html)
        expect(sanitized).not.toContain('onerror')
      })

      it('should remove style tags', () => {
        const html = '<style>body { display: none; }</style>'
        const sanitized = sanitizeHtml(html)
        expect(sanitized).not.toContain('<style>')
      })

      it('should remove iframe tags', () => {
        const html = '<iframe src="evil.com"></iframe>'
        const sanitized = sanitizeHtml(html)
        expect(sanitized).not.toContain('<iframe>')
      })

      it('should preserve safe HTML', () => {
        const html = '<p>Safe paragraph</p>'
        const sanitized = sanitizeHtml(html)
        expect(sanitized).toContain('<p>')
      })
    })

    describe('sanitizeEmail', () => {
      it('should accept valid emails', () => {
        const email = 'user@example.com'
        const sanitized = sanitizeEmail(email)
        expect(sanitized).toBe(email)
      })

      it('should reject invalid emails', () => {
        const email = 'not-an-email'
        const sanitized = sanitizeEmail(email)
        expect(sanitized).toBe('')
      })

      it('should reject emails with invalid format', () => {
        const email = 'user@'
        const sanitized = sanitizeEmail(email)
        expect(sanitized).toBe('')
      })

      it('should convert to lowercase', () => {
        const email = 'User@Example.COM'
        const sanitized = sanitizeEmail(email)
        expect(sanitized).toBe('user@example.com')
      })
    })

    describe('sanitizeFileName', () => {
      it('should remove path separators', () => {
        const fileName = '../../../etc/passwd'
        const sanitized = sanitizeFileName(fileName)
        expect(sanitized).not.toContain('/')
        expect(sanitized).not.toContain('..')
      })

      it('should remove special characters', () => {
        const fileName = 'file<script>.txt'
        const sanitized = sanitizeFileName(fileName)
        expect(sanitized).not.toContain('<')
        expect(sanitized).not.toContain('>')
      })

      it('should remove null bytes', () => {
        const fileName = 'file\0.txt'
        const sanitized = sanitizeFileName(fileName)
        expect(sanitized).not.toContain('\0')
      })

      it('should preserve safe file names', () => {
        const fileName = 'document.pdf'
        const sanitized = sanitizeFileName(fileName)
        expect(sanitized).toBe(fileName)
      })
    })
  })

  // ============================================================================
  // SQL Injection Prevention Tests
  // ============================================================================

  describe('SQL Injection Prevention', () => {
    describe('validateDatabaseInput', () => {
      it('should accept safe strings', () => {
        const input = 'safe string'
        const isValid = validateDatabaseInput(input)
        expect(isValid).toBe(true)
      })

      it('should reject strings with null bytes', () => {
        const input = 'string\0with\0nulls'
        const isValid = validateDatabaseInput(input)
        expect(isValid).toBe(false)
      })

      it('should reject extremely long strings', () => {
        const input = 'a'.repeat(10001)
        const isValid = validateDatabaseInput(input)
        expect(isValid).toBe(false)
      })

      it('should accept numbers', () => {
        const input = 12345
        const isValid = validateDatabaseInput(input)
        expect(isValid).toBe(true)
      })

      it('should accept booleans', () => {
        const input = true
        const isValid = validateDatabaseInput(input)
        expect(isValid).toBe(true)
      })

      it('should accept null', () => {
        const input = null
        const isValid = validateDatabaseInput(input)
        expect(isValid).toBe(true)
      })

      it('should accept strings with SQL keywords', () => {
        // SQL keywords are safe when using parameterized queries
        const input = "SELECT * FROM users WHERE id = '1'"
        const isValid = validateDatabaseInput(input)
        expect(isValid).toBe(true)
      })
    })

    describe('validateDatabaseInputs', () => {
      it('should validate array of safe inputs', () => {
        const inputs = ['safe1', 'safe2', 123, true]
        const isValid = validateDatabaseInputs(inputs)
        expect(isValid).toBe(true)
      })

      it('should reject array with invalid input', () => {
        const inputs = ['safe', 'string\0with\0null']
        const isValid = validateDatabaseInputs(inputs)
        expect(isValid).toBe(false)
      })
    })

    describe('validateDatabaseObject', () => {
      it('should validate safe object', () => {
        const obj = {
          id: '123',
          name: 'John',
          age: 30,
        }
        const isValid = validateDatabaseObject(obj)
        expect(isValid).toBe(true)
      })

      it('should reject object with null bytes', () => {
        const obj = {
          id: '123',
          name: 'John\0Doe',
        }
        const isValid = validateDatabaseObject(obj)
        expect(isValid).toBe(false)
      })

      it('should reject object with extremely long string', () => {
        const obj = {
          id: '123',
          description: 'a'.repeat(10001),
        }
        const isValid = validateDatabaseObject(obj)
        expect(isValid).toBe(false)
      })
    })
  })

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Security Integration', () => {
    it('should handle complex XSS attack vectors', () => {
      const attacks = [
        '<img src=x onerror="alert(1)">',
        '<svg onload="alert(1)">',
        '<iframe src="javascript:alert(1)">',
        '<body onload="alert(1)">',
        '<input onfocus="alert(1)" autofocus>',
        '<marquee onstart="alert(1)">',
        '<details open ontoggle="alert(1)">',
      ]

      attacks.forEach(attack => {
        const sanitized = sanitizeString(attack)
        // Verify dangerous characters are escaped
        expect(sanitized).not.toContain('<img')
        expect(sanitized).not.toContain('<svg')
        expect(sanitized).not.toContain('<iframe')
        expect(sanitized).not.toContain('<body')
        expect(sanitized).not.toContain('<input')
        expect(sanitized).not.toContain('<marquee')
        expect(sanitized).not.toContain('<details')
      })
    })

    it('should handle complex SQL injection attempts', () => {
      const injections = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "1; DELETE FROM users WHERE '1'='1",
        "1 UNION SELECT * FROM users",
      ]

      injections.forEach(injection => {
        // These should be safe when using parameterized queries
        const isValid = validateDatabaseInput(injection)
        expect(isValid).toBe(true) // Safe because Prisma parameterizes
      })
    })

    it('should handle combined attack vectors', () => {
      const complexAttack = {
        title: '<script>alert("xss")</script>',
        description: "'; DROP TABLE requisitions; --",
        url: 'javascript:alert(1)',
      }

      const sanitized = sanitizeObject(complexAttack)
      expect(sanitized.title).not.toContain('<script>')
      expect(sanitizeUrl(complexAttack.url)).toBe('')
    })
  })
})
