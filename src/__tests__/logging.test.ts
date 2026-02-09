import { logger, LogLevel } from '@/lib/logger'

describe('Logging System', () => {
  // Mock console methods
  const originalConsoleDebug = console.debug
  const originalConsoleInfo = console.info
  const originalConsoleWarn = console.warn
  const originalConsoleError = console.error

  let debugLogs: string[] = []
  let infoLogs: string[] = []
  let warnLogs: string[] = []
  let errorLogs: string[] = []

  beforeEach(() => {
    debugLogs = []
    infoLogs = []
    warnLogs = []
    errorLogs = []

    console.debug = jest.fn((msg) => {
      debugLogs.push(msg)
    })
    console.info = jest.fn((msg) => {
      infoLogs.push(msg)
    })
    console.warn = jest.fn((msg) => {
      warnLogs.push(msg)
    })
    console.error = jest.fn((msg) => {
      errorLogs.push(msg)
    })
  })

  afterEach(() => {
    console.debug = originalConsoleDebug
    console.info = originalConsoleInfo
    console.warn = originalConsoleWarn
    console.error = originalConsoleError
  })

  describe('Basic Logging', () => {
    it('should log debug messages', () => {
      logger.debug('Debug message', { key: 'value' })

      expect(debugLogs.length).toBeGreaterThan(0)
      const logEntry = JSON.parse(debugLogs[0])
      expect(logEntry.level).toBe(LogLevel.DEBUG)
      expect(logEntry.message).toBe('Debug message')
      expect(logEntry.context).toEqual({ key: 'value' })
    })

    it('should log info messages', () => {
      logger.info('Info message', { key: 'value' })

      expect(infoLogs.length).toBeGreaterThan(0)
      const logEntry = JSON.parse(infoLogs[0])
      expect(logEntry.level).toBe(LogLevel.INFO)
      expect(logEntry.message).toBe('Info message')
    })

    it('should log warning messages', () => {
      logger.warn('Warning message', { key: 'value' })

      expect(warnLogs.length).toBeGreaterThan(0)
      const logEntry = JSON.parse(warnLogs[0])
      expect(logEntry.level).toBe(LogLevel.WARN)
      expect(logEntry.message).toBe('Warning message')
    })

    it('should log error messages', () => {
      logger.error('Error message', { key: 'value' })

      expect(errorLogs.length).toBeGreaterThan(0)
      const logEntry = JSON.parse(errorLogs[0])
      expect(logEntry.level).toBe(LogLevel.ERROR)
      expect(logEntry.message).toBe('Error message')
    })
  })

  describe('Log Entry Format', () => {
    it('should include timestamp in log entry', () => {
      logger.info('Test message')

      expect(infoLogs.length).toBeGreaterThan(0)
      const logEntry = JSON.parse(infoLogs[0])
      expect(logEntry).toHaveProperty('timestamp')
      expect(new Date(logEntry.timestamp)).toBeInstanceOf(Date)
    })

    it('should include level in log entry', () => {
      logger.info('Test message')

      expect(infoLogs.length).toBeGreaterThan(0)
      const logEntry = JSON.parse(infoLogs[0])
      expect(logEntry).toHaveProperty('level')
      expect(logEntry.level).toBe(LogLevel.INFO)
    })

    it('should include message in log entry', () => {
      logger.info('Test message')

      expect(infoLogs.length).toBeGreaterThan(0)
      const logEntry = JSON.parse(infoLogs[0])
      expect(logEntry).toHaveProperty('message')
      expect(logEntry.message).toBe('Test message')
    })

    it('should include context when provided', () => {
      logger.info('Test message', { userId: 'user-123', action: 'create' })

      expect(infoLogs.length).toBeGreaterThan(0)
      const logEntry = JSON.parse(infoLogs[0])
      expect(logEntry).toHaveProperty('context')
      expect(logEntry.context).toEqual({ userId: 'user-123', action: 'create' })
    })

    it('should not include context when not provided', () => {
      logger.info('Test message')

      expect(infoLogs.length).toBeGreaterThan(0)
      const logEntry = JSON.parse(infoLogs[0])
      expect(logEntry.context).toBeUndefined()
    })
  })

  describe('Specialized Logging Methods', () => {
    it('should log API requests', () => {
      logger.logRequest('GET', '/api/requisitions', { userId: 'user-123' })

      expect(infoLogs.length).toBeGreaterThan(0)
      const logEntry = JSON.parse(infoLogs[0])
      expect(logEntry.message).toContain('GET')
      expect(logEntry.message).toContain('/api/requisitions')
      expect(logEntry.context.type).toBe('REQUEST')
    })

    it('should log API responses', () => {
      logger.logResponse('GET', '/api/requisitions', 200, 150)

      expect(infoLogs.length).toBeGreaterThan(0)
      const logEntry = JSON.parse(infoLogs[0])
      expect(logEntry.context.type).toBe('RESPONSE')
      expect(logEntry.context.statusCode).toBe(200)
      expect(logEntry.context.duration).toBe(150)
    })

    it('should log database operations', () => {
      logger.logDatabaseOperation('SELECT', 'requisitions', 50)

      expect(debugLogs.length).toBeGreaterThan(0)
      const logEntry = JSON.parse(debugLogs[0])
      expect(logEntry.context.type).toBe('DATABASE')
      expect(logEntry.context.operation).toBe('SELECT')
      expect(logEntry.context.table).toBe('requisitions')
      expect(logEntry.context.duration).toBe(50)
    })

    it('should log audit events', () => {
      logger.logAuditEvent('REQUISITION_CREATED', 'user-123', 'req-456')

      expect(infoLogs.length).toBeGreaterThan(0)
      const logEntry = JSON.parse(infoLogs[0])
      expect(logEntry.context.type).toBe('AUDIT')
      expect(logEntry.context.eventType).toBe('REQUISITION_CREATED')
      expect(logEntry.context.userId).toBe('user-123')
      expect(logEntry.context.resourceId).toBe('req-456')
    })

    it('should log security events', () => {
      logger.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', 'user-123', {
        resource: '/api/admin',
      })

      expect(warnLogs.length).toBeGreaterThan(0)
      const logEntry = JSON.parse(warnLogs[0])
      expect(logEntry.context.type).toBe('SECURITY')
      expect(logEntry.context.eventType).toBe('UNAUTHORIZED_ACCESS_ATTEMPT')
      expect(logEntry.context.userId).toBe('user-123')
    })

    it('should log performance metrics', () => {
      logger.logPerformance('requisition_list_query', 250)

      expect(debugLogs.length).toBeGreaterThan(0)
      const logEntry = JSON.parse(debugLogs[0])
      expect(logEntry.context.type).toBe('PERFORMANCE')
      expect(logEntry.context.operation).toBe('requisition_list_query')
      expect(logEntry.context.duration).toBe(250)
    })
  })

  describe('Error Logging', () => {
    it('should log error with stack trace', () => {
      const error = new Error('Test error')
      logger.errorWithStack('An error occurred', error, { userId: 'user-123' })

      expect(errorLogs.length).toBeGreaterThan(0)
      const logEntry = JSON.parse(errorLogs[0])
      expect(logEntry.level).toBe(LogLevel.ERROR)
      expect(logEntry.message).toBe('An error occurred')
      expect(logEntry).toHaveProperty('stack')
      expect(logEntry.context.userId).toBe('user-123')
    })

    it('should include error message in context', () => {
      logger.error('Operation failed', { error: 'Database connection timeout' })

      expect(errorLogs.length).toBeGreaterThan(0)
      const logEntry = JSON.parse(errorLogs[0])
      expect(logEntry.context.error).toBe('Database connection timeout')
    })
  })

  describe('Log Levels', () => {
    it('should have all required log levels', () => {
      expect(LogLevel.DEBUG).toBe('DEBUG')
      expect(LogLevel.INFO).toBe('INFO')
      expect(LogLevel.WARN).toBe('WARN')
      expect(LogLevel.ERROR).toBe('ERROR')
    })
  })

  describe('Structured Logging', () => {
    it('should output logs as JSON for structured logging', () => {
      logger.info('Test message', { key: 'value' })

      expect(infoLogs.length).toBeGreaterThan(0)
      // Should be valid JSON
      expect(() => JSON.parse(infoLogs[0])).not.toThrow()
    })

    it('should include all required fields in log entry', () => {
      logger.info('Test message', { context: 'value' })

      expect(infoLogs.length).toBeGreaterThan(0)
      const logEntry = JSON.parse(infoLogs[0])
      expect(logEntry).toHaveProperty('timestamp')
      expect(logEntry).toHaveProperty('level')
      expect(logEntry).toHaveProperty('message')
    })

    it('should handle complex context objects', () => {
      const complexContext = {
        userId: 'user-123',
        requisition: {
          id: 'req-456',
          amount: 1000,
          status: 'DRAFT',
        },
        metadata: {
          source: 'api',
          version: '1.0',
        },
      }
      logger.info('Complex operation', complexContext)

      expect(infoLogs.length).toBeGreaterThan(0)
      const logEntry = JSON.parse(infoLogs[0])
      expect(logEntry.context).toEqual(complexContext)
    })
  })

  describe('Full Context Logging', () => {
    it('should log errors with full context for debugging', () => {
      const context = {
        userId: 'user-123',
        action: 'create_requisition',
        requisitionData: {
          title: 'Office Supplies',
          amount: 500,
        },
        error: 'Validation failed',
      }
      logger.error('Failed to create requisition', context)

      expect(errorLogs.length).toBeGreaterThan(0)
      const logEntry = JSON.parse(errorLogs[0])
      expect(logEntry.context).toEqual(context)
    })

    it('should log API errors with request details', () => {
      const context = {
        method: 'POST',
        pathname: '/api/requisitions',
        statusCode: 400,
        error: 'Validation error',
        duration: 50,
      }
      logger.error('API error', context)

      expect(errorLogs.length).toBeGreaterThan(0)
      const logEntry = JSON.parse(errorLogs[0])
      expect(logEntry.context.method).toBe('POST')
      expect(logEntry.context.pathname).toBe('/api/requisitions')
      expect(logEntry.context.statusCode).toBe(400)
    })
  })
})
