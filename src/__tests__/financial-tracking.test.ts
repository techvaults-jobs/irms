/**
 * Property Tests: Financial Tracking
 * Feature: irms
 * 
 * Property 21: Cost Recording on Creation
 * Property 22: Approved Cost Recording
 * Property 23: Payment Recording Validation
 * Property 24: Payment Amount Validation
 * Property 25: Payment Recording and Status Transition
 * 
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import bcrypt from 'bcryptjs'
import { FinancialTrackingService } from '@/services/financial-tracking.service'
import { RequisitionService } from '@/services/requisition.service'
import { AuditTrailService } from '@/services/audit-trail.service'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

describe('Financial Tracking Properties', () => {
  let testUserId: string
  let testDepartmentId: string

  beforeAll(async () => {
    const dept = await prisma.department.create({
      data: { name: `test-dept-financial-${Date.now()}-${Math.random()}` },
    })
    testDepartmentId = dept.id

    const hashedPassword = await bcrypt.hash('test@123', 10)
    const user = await prisma.user.create({
      data: {
        email: `test-financial-${Date.now()}-${Math.random()}@example.com`,
        name: 'Test User',
        role: 'STAFF',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    testUserId = user.id
  })

  afterAll(async () => {
    // Cleanup - delete requisitions first (audit trails cascade)
    try {
      await prisma.requisition.deleteMany({ where: { submitterId: testUserId } })
    } catch (e) {
      // Ignore cleanup errors due to immutable audit trails
    }
    
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

  describe('Property 21: Cost Recording on Creation', () => {
    it('should record estimated cost when requisition is created', async () => {
      const estimatedCost = new Decimal(150)
      const currency = 'USD'

      const requisitionData = {
        title: 'Cost Recording Test',
        category: 'Office Supplies',
        description: 'Test description',
        estimatedCost: 150,
        currency,
        urgencyLevel: 'MEDIUM' as const,
        businessJustification: 'Test justification',
      }

      const requisition = await RequisitionService.createRequisition(
        requisitionData,
        testUserId,
        testDepartmentId
      )

      // Verify estimated cost is recorded
      expect(requisition.estimatedCost).toEqual(estimatedCost)
      expect(requisition.currency).toBe(currency)

      // Verify it's retrievable
      const retrieved = await FinancialTrackingService.getFinancialSummary(requisition.id)
      expect(retrieved.estimatedCost).toEqual(estimatedCost)
      expect(retrieved.currency).toBe(currency)

      // Cleanup - skip due to immutable audit trails
    })

    it('should record cost for various amounts', async () => {
      const testAmounts = [10, 100, 1000, 10000, 99999.99]

      for (const amount of testAmounts) {
        const requisitionData = {
          title: `Cost Test ${amount}`,
          category: 'Office Supplies',
          description: 'Test description',
          estimatedCost: amount,
          currency: 'USD',
          urgencyLevel: 'MEDIUM' as const,
          businessJustification: 'Test justification',
        }

        const requisition = await RequisitionService.createRequisition(
          requisitionData,
          testUserId,
          testDepartmentId
        )

        expect(requisition.estimatedCost).toEqual(new Decimal(amount))

        // Cleanup - skip due to immutable audit trails
      }
    })

    it('should record cost for various currencies', async () => {
      const currencies = ['USD', 'EUR', 'GBP', 'JPY']

      for (const currency of currencies) {
        const requisitionData = {
          title: `Currency Test ${currency}`,
          category: 'Office Supplies',
          description: 'Test description',
          estimatedCost: 100,
          currency,
          urgencyLevel: 'MEDIUM' as const,
          businessJustification: 'Test justification',
        }

        const requisition = await RequisitionService.createRequisition(
          requisitionData,
          testUserId,
          testDepartmentId
        )

        expect(requisition.currency).toBe(currency)

        // Cleanup - skip due to immutable audit trails
      }
    })
  })

  describe('Property 22: Approved Cost Recording', () => {
    it('should record approved cost when requisition is approved', async () => {
      const estimatedCost = 100
      const approvedCost = new Decimal(120)

      const requisitionData = {
        title: 'Approved Cost Test',
        category: 'Office Supplies',
        description: 'Test description',
        estimatedCost,
        currency: 'USD',
        urgencyLevel: 'MEDIUM' as const,
        businessJustification: 'Test justification',
      }

      const requisition = await RequisitionService.createRequisition(
        requisitionData,
        testUserId,
        testDepartmentId
      )

      // Submit and transition to Under Review
      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)

      // Approve with custom cost
      const approved = await RequisitionService.approveRequisition(requisition.id, approvedCost)

      expect(approved.approvedCost).toEqual(approvedCost)

      // Verify it's retrievable
      const summary = await FinancialTrackingService.getFinancialSummary(requisition.id)
      expect(summary.approvedCost).toEqual(approvedCost)

      // Cleanup - skip due to immutable audit trails
    })

    it('should record approved cost different from estimated cost', async () => {
      const testCases = [
        { estimated: 100, approved: 80 },
        { estimated: 100, approved: 150 },
        { estimated: 1000, approved: 999.99 },
      ]

      for (const testCase of testCases) {
        const requisitionData = {
          title: `Approved Cost Variance ${testCase.estimated}-${testCase.approved}`,
          category: 'Office Supplies',
          description: 'Test description',
          estimatedCost: testCase.estimated,
          currency: 'USD',
          urgencyLevel: 'MEDIUM' as const,
          businessJustification: 'Test justification',
        }

        const requisition = await RequisitionService.createRequisition(
          requisitionData,
          testUserId,
          testDepartmentId
        )

        await RequisitionService.submitRequisition(requisition.id)
        await RequisitionService.transitionToUnderReview(requisition.id)

        const approved = await RequisitionService.approveRequisition(
          requisition.id,
          new Decimal(testCase.approved)
        )

        expect(approved.approvedCost).toEqual(new Decimal(testCase.approved))
        expect(approved.estimatedCost).toEqual(new Decimal(testCase.estimated))

        // Cleanup - skip due to immutable audit trails
      }
    })

    it('should record approved cost in audit trail', async () => {
      const approvedCost = new Decimal(150)

      const requisitionData = {
        title: 'Audit Approved Cost Test',
        category: 'Office Supplies',
        description: 'Test description',
        estimatedCost: 100,
        currency: 'USD',
        urgencyLevel: 'MEDIUM' as const,
        businessJustification: 'Test justification',
      }

      const requisition = await RequisitionService.createRequisition(
        requisitionData,
        testUserId,
        testDepartmentId
      )

      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)

      // Record approved cost in audit trail
      await FinancialTrackingService.recordApprovedCost(
        requisition.id,
        testUserId,
        approvedCost
      )

      // Approve
      await RequisitionService.approveRequisition(requisition.id, approvedCost)

      // Verify audit trail
      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisition.id)
      const approvedCostEntry = auditTrail.find(
        entry => entry.fieldName === 'approvedCost'
      )

      expect(approvedCostEntry).toBeDefined()

      // Cleanup - skip due to immutable audit trails
    })
  })

  describe('Property 23: Payment Recording Validation', () => {
    it('should reject payment with missing actual cost paid', async () => {
      const requisitionData = {
        title: 'Payment Validation Test',
        category: 'Office Supplies',
        description: 'Test description',
        estimatedCost: 100,
        currency: 'USD',
        urgencyLevel: 'MEDIUM' as const,
        businessJustification: 'Test justification',
      }

      const requisition = await RequisitionService.createRequisition(
        requisitionData,
        testUserId,
        testDepartmentId
      )

      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)
      await RequisitionService.approveRequisition(requisition.id)

      // Try to record payment with missing actual cost
      await expect(
        FinancialTrackingService.recordPayment(
          requisition.id,
          testUserId,
          {
            actualCostPaid: 0,
            paymentDate: new Date(),
            paymentMethod: 'Bank Transfer',
            paymentReference: 'REF-001',
          }
        )
      ).rejects.toThrow()

      // Cleanup - skip due to immutable audit trails
    })

    it('should reject payment with missing payment date', async () => {
      const requisitionData = {
        title: 'Payment Date Validation Test',
        category: 'Office Supplies',
        description: 'Test description',
        estimatedCost: 100,
        currency: 'USD',
        urgencyLevel: 'MEDIUM' as const,
        businessJustification: 'Test justification',
      }

      const requisition = await RequisitionService.createRequisition(
        requisitionData,
        testUserId,
        testDepartmentId
      )

      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)
      await RequisitionService.approveRequisition(requisition.id)

      // Try to record payment with missing payment date
      await expect(
        FinancialTrackingService.recordPayment(
          requisition.id,
          testUserId,
          {
            actualCostPaid: 100,
            paymentDate: null as any,
            paymentMethod: 'Bank Transfer',
            paymentReference: 'REF-001',
          }
        )
      ).rejects.toThrow()

      // Cleanup - skip due to immutable audit trails
    })

    it('should reject payment with missing payment method', async () => {
      const requisitionData = {
        title: 'Payment Method Validation Test',
        category: 'Office Supplies',
        description: 'Test description',
        estimatedCost: 100,
        currency: 'USD',
        urgencyLevel: 'MEDIUM' as const,
        businessJustification: 'Test justification',
      }

      const requisition = await RequisitionService.createRequisition(
        requisitionData,
        testUserId,
        testDepartmentId
      )

      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)
      await RequisitionService.approveRequisition(requisition.id)

      // Try to record payment with missing payment method
      await expect(
        FinancialTrackingService.recordPayment(
          requisition.id,
          testUserId,
          {
            actualCostPaid: 100,
            paymentDate: new Date(),
            paymentMethod: '',
            paymentReference: 'REF-001',
          }
        )
      ).rejects.toThrow()

      // Cleanup - skip due to immutable audit trails
    })

    it('should reject payment with missing payment reference', async () => {
      const requisitionData = {
        title: 'Payment Reference Validation Test',
        category: 'Office Supplies',
        description: 'Test description',
        estimatedCost: 100,
        currency: 'USD',
        urgencyLevel: 'MEDIUM' as const,
        businessJustification: 'Test justification',
      }

      const requisition = await RequisitionService.createRequisition(
        requisitionData,
        testUserId,
        testDepartmentId
      )

      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)
      await RequisitionService.approveRequisition(requisition.id)

      // Try to record payment with missing payment reference
      await expect(
        FinancialTrackingService.recordPayment(
          requisition.id,
          testUserId,
          {
            actualCostPaid: 100,
            paymentDate: new Date(),
            paymentMethod: 'Bank Transfer',
            paymentReference: '',
          }
        )
      ).rejects.toThrow()

      // Cleanup - skip due to immutable audit trails
    })
  })

  describe('Property 24: Payment Amount Validation', () => {
    it('should accept payment within approved cost', async () => {
      const approvedCost = new Decimal(100)
      const actualCostPaid = new Decimal(100)

      const validation = FinancialTrackingService.validatePaymentAmount(
        approvedCost,
        actualCostPaid
      )

      expect(validation.isValid).toBe(true)
      expect(validation.exceedsThreshold).toBe(false)
    })

    it('should accept payment below approved cost', async () => {
      const approvedCost = new Decimal(100)
      const actualCostPaid = new Decimal(80)

      const validation = FinancialTrackingService.validatePaymentAmount(
        approvedCost,
        actualCostPaid
      )

      expect(validation.isValid).toBe(true)
      expect(validation.exceedsThreshold).toBe(false)
    })

    it('should reject payment exceeding threshold without comment', async () => {
      const requisitionData = {
        title: 'Payment Variance Test',
        category: 'Office Supplies',
        description: 'Test description',
        estimatedCost: 100,
        currency: 'USD',
        urgencyLevel: 'MEDIUM' as const,
        businessJustification: 'Test justification',
      }

      const requisition = await RequisitionService.createRequisition(
        requisitionData,
        testUserId,
        testDepartmentId
      )

      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)
      await RequisitionService.approveRequisition(requisition.id, new Decimal(100))

      // Try to record payment exceeding threshold without comment
      await expect(
        FinancialTrackingService.recordPayment(
          requisition.id,
          testUserId,
          {
            actualCostPaid: 120, // 20% over approved
            paymentDate: new Date(),
            paymentMethod: 'Bank Transfer',
            paymentReference: 'REF-001',
          },
          0.1 // 10% threshold
        )
      ).rejects.toThrow('Payment amount exceeds approved cost')

      // Cleanup - skip due to immutable audit trails
    })

    it('should accept payment exceeding threshold with comment', async () => {
      const requisitionData = {
        title: 'Payment Variance With Comment Test',
        category: 'Office Supplies',
        description: 'Test description',
        estimatedCost: 100,
        currency: 'USD',
        urgencyLevel: 'MEDIUM' as const,
        businessJustification: 'Test justification',
      }

      const requisition = await RequisitionService.createRequisition(
        requisitionData,
        testUserId,
        testDepartmentId
      )

      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)
      await RequisitionService.approveRequisition(requisition.id, new Decimal(100))

      // Record payment exceeding threshold with comment
      const paid = await FinancialTrackingService.recordPayment(
        requisition.id,
        testUserId,
        {
          actualCostPaid: 120,
          paymentDate: new Date(),
          paymentMethod: 'Bank Transfer',
          paymentReference: 'REF-001',
          paymentComment: 'Price increase due to market conditions',
        },
        0.1
      )

      expect(paid.actualCostPaid).toEqual(new Decimal(120))
      expect(paid.paymentComment).toBe('Price increase due to market conditions')

      // Cleanup - skip due to immutable audit trails
    })

    it('should calculate variance correctly', async () => {
      const testCases = [
        { approved: 100, actual: 100, expectedVariance: 0 },
        { approved: 100, actual: 110, expectedVariance: 0.1 },
        { approved: 100, actual: 90, expectedVariance: 0.1 },
        { approved: 1000, actual: 1050, expectedVariance: 0.05 },
      ]

      for (const testCase of testCases) {
        const validation = FinancialTrackingService.validatePaymentAmount(
          new Decimal(testCase.approved),
          new Decimal(testCase.actual)
        )

        expect(validation.variance).toBeCloseTo(testCase.expectedVariance, 2)
      }
    })
  })

  describe('Property 25: Payment Recording and Status Transition', () => {
    it('should transition to Paid when payment is recorded', async () => {
      const requisitionData = {
        title: 'Payment Status Transition Test',
        category: 'Office Supplies',
        description: 'Test description',
        estimatedCost: 100,
        currency: 'USD',
        urgencyLevel: 'MEDIUM' as const,
        businessJustification: 'Test justification',
      }

      const requisition = await RequisitionService.createRequisition(
        requisitionData,
        testUserId,
        testDepartmentId
      )

      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)
      await RequisitionService.approveRequisition(requisition.id)

      expect(requisition.status).toBe('DRAFT')

      // Record payment
      const paid = await FinancialTrackingService.recordPayment(
        requisition.id,
        testUserId,
        {
          actualCostPaid: 100,
          paymentDate: new Date(),
          paymentMethod: 'Bank Transfer',
          paymentReference: 'REF-001',
        }
      )

      expect(paid.status).toBe('PAID')
      expect(paid.actualCostPaid).toEqual(new Decimal(100))

      // Cleanup - skip due to immutable audit trails
    })

    it('should record all payment details in database', async () => {
      const requisitionData = {
        title: 'Payment Details Test',
        category: 'Office Supplies',
        description: 'Test description',
        estimatedCost: 100,
        currency: 'USD',
        urgencyLevel: 'MEDIUM' as const,
        businessJustification: 'Test justification',
      }

      const requisition = await RequisitionService.createRequisition(
        requisitionData,
        testUserId,
        testDepartmentId
      )

      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)
      await RequisitionService.approveRequisition(requisition.id)

      const paymentDate = new Date('2024-01-15')
      const paymentMethod = 'Credit Card'
      const paymentReference = 'CC-12345'
      const paymentComment = 'Test payment'

      const paid = await FinancialTrackingService.recordPayment(
        requisition.id,
        testUserId,
        {
          actualCostPaid: 100,
          paymentDate,
          paymentMethod,
          paymentReference,
          paymentComment,
        }
      )

      expect(paid.paymentDate).toEqual(paymentDate)
      expect(paid.paymentMethod).toBe(paymentMethod)
      expect(paid.paymentReference).toBe(paymentReference)
      expect(paid.paymentComment).toBe(paymentComment)

      // Cleanup - skip due to immutable audit trails
    })

    it('should record payment in audit trail', async () => {
      const requisitionData = {
        title: 'Payment Audit Test',
        category: 'Office Supplies',
        description: 'Test description',
        estimatedCost: 100,
        currency: 'USD',
        urgencyLevel: 'MEDIUM' as const,
        businessJustification: 'Test justification',
      }

      const requisition = await RequisitionService.createRequisition(
        requisitionData,
        testUserId,
        testDepartmentId
      )

      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)
      await RequisitionService.approveRequisition(requisition.id)

      await FinancialTrackingService.recordPayment(
        requisition.id,
        testUserId,
        {
          actualCostPaid: 100,
          paymentDate: new Date(),
          paymentMethod: 'Bank Transfer',
          paymentReference: 'REF-001',
        }
      )

      // Verify audit trail
      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisition.id)
      const paymentEntry = auditTrail.find(
        entry => entry.changeType === 'PAYMENT_RECORDED'
      )

      expect(paymentEntry).toBeDefined()

      // Cleanup - skip due to immutable audit trails
    })

    it('should only allow payment recording from Approved status', async () => {
      const requisitionData = {
        title: 'Payment Status Check Test',
        category: 'Office Supplies',
        description: 'Test description',
        estimatedCost: 100,
        currency: 'USD',
        urgencyLevel: 'MEDIUM' as const,
        businessJustification: 'Test justification',
      }

      const requisition = await RequisitionService.createRequisition(
        requisitionData,
        testUserId,
        testDepartmentId
      )

      // Try to record payment on Draft - should fail
      await expect(
        FinancialTrackingService.recordPayment(
          requisition.id,
          testUserId,
          {
            actualCostPaid: 100,
            paymentDate: new Date(),
            paymentMethod: 'Bank Transfer',
            paymentReference: 'REF-001',
          }
        )
      ).rejects.toThrow('Can only record payment for approved requisitions')

      // Cleanup - skip due to immutable audit trails
    })
  })
})
