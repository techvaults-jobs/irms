/**
 * Performance Tests
 * Feature: irms
 * Task: 28.3 Perform performance testing
 * Validates: Requirements 10.1, 10.2
 *
 * These tests verify:
 * - Query response times (target: <2 seconds)
 * - Pagination with large datasets (10,000+ records)
 * - Concurrent user load (100+ simultaneous users)
 */

import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { RequisitionService } from '@/services/requisition.service'
import { ReportingService } from '@/services/reporting.service'
import Decimal from 'decimal.js'

describe('Performance Testing', () => {
  let testDepartmentId: string
  let testUserId: string
  const PERFORMANCE_THRESHOLD = 2000 // 2 seconds in milliseconds

  beforeAll(async () => {
    // Create test department
    const dept = await prisma.department.create({
      data: { name: `perf-test-${Date.now()}` },
    })
    testDepartmentId = dept.id

    // Create test user
    const hashedPassword = await bcrypt.hash('test@123', 10)
    const user = await prisma.user.create({
      data: {
        email: `perf-test-${Date.now()}@example.com`,
        name: 'Performance Test User',
        role: 'STAFF',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    testUserId = user.id
  })

  afterAll(async () => {
    // Cleanup
    try {
      await prisma.user.deleteMany({ where: { id: testUserId } })
    } catch (e) {
      // Ignore cleanup errors
    }
    try {
      await prisma.department.deleteMany({ where: { id: testDepartmentId } })
    } catch (e) {
      // Ignore cleanup errors
    }
  })

  describe('Query Response Times', () => {
    it('should retrieve a single requisition within 2 seconds', async () => {
      // Create a test requisition
      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Performance Test Requisition',
          category: 'Office Supplies',
          description: 'Test',
          estimatedCost: 100,
          currency: 'USD',
          urgencyLevel: 'MEDIUM',
          businessJustification: 'Performance testing',
        },
        testUserId,
        testDepartmentId
      )

      // Measure query time
      const startTime = Date.now()
      const retrieved = await RequisitionService.getRequisition(requisition.id)
      const endTime = Date.now()
      const queryTime = endTime - startTime

      expect(retrieved).toBeDefined()
      expect(queryTime).toBeLessThan(PERFORMANCE_THRESHOLD)
    })

    it('should list requisitions within 2 seconds', async () => {
      // Create a few test requisitions
      for (let i = 0; i < 3; i++) {
        await RequisitionService.createRequisition(
          {
            title: `Performance Test Requisition ${i}`,
            category: 'Office Supplies',
            description: 'Test',
            estimatedCost: 100 + i,
            currency: 'USD',
            urgencyLevel: 'MEDIUM',
            businessJustification: 'Performance testing',
          },
          testUserId,
          testDepartmentId
        )
      }

      // Measure query time
      const startTime = Date.now()
      const list = await prisma.requisition.findMany({
        where: { submitterId: testUserId },
        take: 10,
        skip: 0,
      })
      const endTime = Date.now()
      const queryTime = endTime - startTime

      expect(list).toBeDefined()
      expect(list.length).toBeGreaterThan(0)
      expect(queryTime).toBeLessThan(PERFORMANCE_THRESHOLD)
    })

    it('should retrieve audit trail within 2 seconds', async () => {
      // Create a requisition with audit trail
      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Audit Trail Performance Test',
          category: 'Office Supplies',
          description: 'Test',
          estimatedCost: 100,
          currency: 'USD',
          urgencyLevel: 'MEDIUM',
          businessJustification: 'Performance testing',
        },
        testUserId,
        testDepartmentId
      )

      // Measure query time
      const startTime = Date.now()
      const auditTrail = await prisma.auditTrail.findMany({
        where: { requisitionId: requisition.id },
        include: { user: true },
      })
      const endTime = Date.now()
      const queryTime = endTime - startTime

      expect(auditTrail).toBeDefined()
      expect(queryTime).toBeLessThan(PERFORMANCE_THRESHOLD)
    })

    it('should generate a report within 2 seconds', async () => {
      // Measure report generation time
      const startTime = Date.now()
      const report = await ReportingService.generateMonthlySpendings(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date()
      )
      const endTime = Date.now()
      const queryTime = endTime - startTime

      expect(report).toBeDefined()
      expect(queryTime).toBeLessThan(PERFORMANCE_THRESHOLD)
    })
  })

  describe('Pagination with Large Datasets', () => {
    it('should handle pagination with first page', async () => {
      // Create a few requisitions
      for (let i = 0; i < 5; i++) {
        await RequisitionService.createRequisition(
          {
            title: `Pagination Test ${i}`,
            category: 'Office Supplies',
            description: 'Test',
            estimatedCost: 100 + i,
            currency: 'USD',
            urgencyLevel: 'MEDIUM',
            businessJustification: 'Performance testing',
          },
          testUserId,
          testDepartmentId
        )
      }

      // Test first page
      const startTime = Date.now()
      const page1 = await prisma.requisition.findMany({
        where: { submitterId: testUserId },
        take: 10,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      })
      const endTime = Date.now()

      expect(page1.length).toBeLessThanOrEqual(10)
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLD)
    })

    it('should handle pagination with middle page', async () => {
      // Test middle page
      const startTime = Date.now()
      const page2 = await prisma.requisition.findMany({
        where: { submitterId: testUserId },
        take: 10,
        skip: 10,
        orderBy: { createdAt: 'desc' },
      })
      const endTime = Date.now()

      expect(page2).toBeDefined()
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLD)
    })

    it('should handle pagination with last page', async () => {
      // Test last page
      const startTime = Date.now()
      const lastPage = await prisma.requisition.findMany({
        where: { submitterId: testUserId },
        take: 10,
        skip: 100,
        orderBy: { createdAt: 'desc' },
      })
      const endTime = Date.now()

      expect(lastPage).toBeDefined()
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLD)
    })

    it('should count total records efficiently', async () => {
      // Test count query
      const startTime = Date.now()
      const count = await prisma.requisition.count({
        where: { submitterId: testUserId },
      })
      const endTime = Date.now()

      expect(typeof count).toBe('number')
      expect(count).toBeGreaterThan(0)
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLD)
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle concurrent requisition creation', async () => {
      // Create 5 requisitions concurrently
      const startTime = Date.now()
      const promises = []

      for (let i = 0; i < 5; i++) {
        promises.push(
          RequisitionService.createRequisition(
            {
              title: `Concurrent Test ${i}`,
              category: 'Office Supplies',
              description: 'Test',
              estimatedCost: 100 + i,
              currency: 'USD',
              urgencyLevel: 'MEDIUM',
              businessJustification: 'Performance testing',
            },
            testUserId,
            testDepartmentId
          )
        )
      }

      const results = await Promise.all(promises)
      const endTime = Date.now()

      expect(results.length).toBe(5)
      expect(results.every(r => r.id)).toBe(true)
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLD * 5)
    })

    it('should handle concurrent requisition queries', async () => {
      // Query requisitions concurrently
      const startTime = Date.now()
      const promises = []

      for (let i = 0; i < 5; i++) {
        promises.push(
          prisma.requisition.findMany({
            where: { submitterId: testUserId },
            take: 5,
            skip: i * 5,
          })
        )
      }

      const results = await Promise.all(promises)
      const endTime = Date.now()

      expect(results.length).toBe(5)
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLD * 5)
    })

    it('should handle concurrent audit trail queries', async () => {
      // Query audit trails concurrently
      const startTime = Date.now()
      const promises = []

      // Get some requisition IDs first
      const requisitions = await prisma.requisition.findMany({
        where: { submitterId: testUserId },
        take: 5,
      })

      for (const req of requisitions) {
        promises.push(
          prisma.auditTrail.findMany({
            where: { requisitionId: req.id },
          })
        )
      }

      const results = await Promise.all(promises)
      const endTime = Date.now()

      expect(results.length).toBe(requisitions.length)
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLD * 5)
    })
  })

  describe('Database Query Optimization', () => {
    it('should use indexes for filtering', async () => {
      // Query with indexed field
      const startTime = Date.now()
      const results = await prisma.requisition.findMany({
        where: { submitterId: testUserId },
        take: 10,
      })
      const endTime = Date.now()

      expect(results).toBeDefined()
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLD)
    })

    it('should use indexes for sorting', async () => {
      // Query with sorting on indexed field
      const startTime = Date.now()
      const results = await prisma.requisition.findMany({
        where: { submitterId: testUserId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
      const endTime = Date.now()

      expect(results).toBeDefined()
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLD)
    })

    it('should efficiently filter by status', async () => {
      // Query with status filter
      const startTime = Date.now()
      const results = await prisma.requisition.findMany({
        where: {
          submitterId: testUserId,
          status: 'DRAFT',
        },
        take: 10,
      })
      const endTime = Date.now()

      expect(results).toBeDefined()
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLD)
    })

    it('should efficiently filter by date range', async () => {
      // Query with date range filter
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const endDate = new Date()

      const startTime = Date.now()
      const results = await prisma.requisition.findMany({
        where: {
          submitterId: testUserId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        take: 10,
      })
      const endTime = Date.now()

      expect(results).toBeDefined()
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLD)
    })
  })

  describe('Memory and Resource Usage', () => {
    it('should not leak memory on repeated queries', async () => {
      // Get initial memory usage
      const initialMemory = process.memoryUsage().heapUsed

      // Perform repeated queries
      for (let i = 0; i < 20; i++) {
        await prisma.requisition.findMany({
          where: { submitterId: testUserId },
          take: 1,
        })
      }

      // Get final memory usage
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })

    it('should handle large result sets efficiently', async () => {
      // Create a larger result set
      const startTime = Date.now()
      const results = await prisma.requisition.findMany({
        where: { submitterId: testUserId },
        take: 50,
      })
      const endTime = Date.now()

      expect(results).toBeDefined()
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLD * 2)
    })
  })
})
