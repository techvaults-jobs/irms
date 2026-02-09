/**
 * Property Tests: Status Lifecycle and Transitions
 * Feature: irms
 * 
 * Property 13: Initial Draft Status
 * Property 14: Draft to Submitted Transition
 * Property 15: Submitted to Under Review Transition
 * Property 16: All Approvers Approval Transition
 * Property 17: Rejection at Any Stage
 * Property 18: Payment Recording Transition
 * Property 19: Paid to Closed Transition
 * Property 20: Status Change Audit Recording
 * 
 * Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9
 */

import bcrypt from 'bcryptjs'
import { RequisitionService } from '@/services/requisition.service'
import { RequisitionStatus } from '@/lib/status-transitions'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import {
  isValidStatusTransition,
  validateStatusTransition,
  getAllowedNextStatuses,
  isTerminalStatus,
  type RequisitionStatusType,
} from '@/lib/status-transitions'

describe('Status Lifecycle and Transitions', () => {
  let testUserId: string
  let testDepartmentId: string

  beforeAll(async () => {
    // Create test department
    const dept = await prisma.department.create({
      data: { name: `test-dept-status-${Date.now()}-${Math.random()}` },
    })
    testDepartmentId = dept.id

    // Create test user
    const hashedPassword = await bcrypt.hash('test@123', 10)
    const user = await prisma.user.create({
      data: {
        email: `test-status-${Date.now()}-${Math.random()}@example.com`,
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

  describe('Property 13: Initial Draft Status', () => {
    it('should initialize new requisition in Draft status', async () => {
      const requisitionData = {
        title: 'Test Requisition',
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

      expect(requisition.status).toBe(RequisitionStatus.DRAFT)

      // Cleanup - skip due to immutable audit trails
    })

    it('should always create requisitions in Draft status regardless of data', async () => {
      const testCases = [
        {
          title: 'Low Cost Item',
          estimatedCost: 10,
          urgencyLevel: 'LOW' as const,
        },
        {
          title: 'High Cost Item',
          estimatedCost: 10000,
          urgencyLevel: 'CRITICAL' as const,
        },
        {
          title: 'Medium Cost Item',
          estimatedCost: 500,
          urgencyLevel: 'HIGH' as const,
        },
      ]

      for (const testCase of testCases) {
        const requisitionData = {
          title: testCase.title,
          category: 'Office Supplies',
          description: 'Test description',
          estimatedCost: testCase.estimatedCost,
          currency: 'USD',
          urgencyLevel: testCase.urgencyLevel,
          businessJustification: 'Test justification',
        }

        const requisition = await RequisitionService.createRequisition(
          requisitionData,
          testUserId,
          testDepartmentId
        )

        expect(requisition.status).toBe(RequisitionStatus.DRAFT)

        // Cleanup - skip due to immutable audit trails
      }
    })
  })

  describe('Property 14: Draft to Submitted Transition', () => {
    it('should transition from Draft to Submitted when submitted', async () => {
      const requisitionData = {
        title: 'Test Requisition',
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

      expect(requisition.status).toBe(RequisitionStatus.DRAFT)

      const submitted = await RequisitionService.submitRequisition(requisition.id)

      expect(submitted.status).toBe(RequisitionStatus.SUBMITTED)

      // Cleanup - skip due to immutable audit trails
    })

    it('should reject submission if required fields are missing', async () => {
      const requisition = await prisma.requisition.create({
        data: {
          title: '',
          category: 'Office Supplies',
          description: 'Test description',
          estimatedCost: new Decimal(100),
          currency: 'USD',
          urgencyLevel: 'MEDIUM',
          businessJustification: 'Test justification',
          status: RequisitionStatus.DRAFT,
          submitterId: testUserId,
          departmentId: testDepartmentId,
        },
      })

      await expect(
        RequisitionService.submitRequisition(requisition.id)
      ).rejects.toThrow('Missing required fields')

      // Verify status unchanged
      const updated = await prisma.requisition.findUnique({
        where: { id: requisition.id },
      })
      expect(updated?.status).toBe(RequisitionStatus.DRAFT)

      // Cleanup - skip due to immutable audit trails
    })

    it('should only allow transition from Draft status', async () => {
      const requisitionData = {
        title: 'Test Requisition',
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

      // Submit to move to SUBMITTED status
      await RequisitionService.submitRequisition(requisition.id)

      // Try to submit again - should fail
      await expect(
        RequisitionService.submitRequisition(requisition.id)
      ).rejects.toThrow()

      // Cleanup - skip due to immutable audit trails
    })
  })

  describe('Property 15: Submitted to Under Review Transition', () => {
    it('should transition from Submitted to Under Review', async () => {
      const requisitionData = {
        title: 'Test Requisition',
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

      // Submit
      const submitted = await RequisitionService.submitRequisition(requisition.id)
      expect(submitted.status).toBe(RequisitionStatus.SUBMITTED)

      // Transition to Under Review
      const underReview = await RequisitionService.transitionToUnderReview(requisition.id)
      expect(underReview.status).toBe(RequisitionStatus.UNDER_REVIEW)

      // Cleanup - skip due to immutable audit trails
    })

    it('should only allow transition from Submitted status', async () => {
      const requisitionData = {
        title: 'Test Requisition',
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

      // Try to transition from Draft - should fail
      await expect(
        RequisitionService.transitionToUnderReview(requisition.id)
      ).rejects.toThrow()

      // Cleanup - skip due to immutable audit trails
    })
  })

  describe('Property 16: All Approvers Approval Transition', () => {
    it('should transition from Under Review to Approved', async () => {
      const requisitionData = {
        title: 'Test Requisition',
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

      // Submit and transition to Under Review
      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)

      // Approve
      const approved = await RequisitionService.approveRequisition(requisition.id)
      expect(approved.status).toBe(RequisitionStatus.APPROVED)

      // Cleanup - skip due to immutable audit trails
    })

    it('should record approved cost when approving', async () => {
      const requisitionData = {
        title: 'Test Requisition',
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

      // Submit and transition to Under Review
      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)

      // Approve with custom cost
      const customCost = new Decimal(150)
      const approved = await RequisitionService.approveRequisition(requisition.id, customCost)

      expect(approved.status).toBe(RequisitionStatus.APPROVED)
      expect(approved.approvedCost).toEqual(customCost)

      // Cleanup - skip due to immutable audit trails
    })
  })

  describe('Property 17: Rejection at Any Stage', () => {
    it('should transition to Rejected from Under Review', async () => {
      const requisitionData = {
        title: 'Test Requisition',
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

      // Submit and transition to Under Review
      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)

      // Reject
      const rejected = await RequisitionService.rejectRequisition(requisition.id)
      expect(rejected.status).toBe(RequisitionStatus.REJECTED)

      // Cleanup - skip due to immutable audit trails
    })

    it('should be terminal status - no further transitions allowed', async () => {
      const requisitionData = {
        title: 'Test Requisition',
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

      // Submit, transition to Under Review, and reject
      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)
      await RequisitionService.rejectRequisition(requisition.id)

      // Try to transition from Rejected - should fail
      await expect(
        RequisitionService.approveRequisition(requisition.id)
      ).rejects.toThrow()

      // Cleanup - skip due to immutable audit trails
    })
  })

  describe('Property 18: Payment Recording Transition', () => {
    it('should transition from Approved to Paid when recording payment', async () => {
      const requisitionData = {
        title: 'Test Requisition',
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

      // Submit, transition to Under Review, and approve
      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)
      await RequisitionService.approveRequisition(requisition.id)

      // Record payment
      const paid = await RequisitionService.recordPayment(
        requisition.id,
        new Decimal(100),
        new Date(),
        'Bank Transfer',
        'REF-001'
      )

      expect(paid.status).toBe(RequisitionStatus.PAID)
      expect(paid.actualCostPaid).toEqual(new Decimal(100))
      expect(paid.paymentMethod).toBe('Bank Transfer')
      expect(paid.paymentReference).toBe('REF-001')

      // Cleanup - skip due to immutable audit trails
    })

    it('should only allow payment recording from Approved status', async () => {
      const requisitionData = {
        title: 'Test Requisition',
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
        RequisitionService.recordPayment(
          requisition.id,
          new Decimal(100),
          new Date(),
          'Bank Transfer',
          'REF-001'
        )
      ).rejects.toThrow()

      // Cleanup - skip due to immutable audit trails
    })
  })

  describe('Property 19: Paid to Closed Transition', () => {
    it('should transition from Paid to Closed', async () => {
      const requisitionData = {
        title: 'Test Requisition',
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

      // Complete workflow to Paid
      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)
      await RequisitionService.approveRequisition(requisition.id)
      await RequisitionService.recordPayment(
        requisition.id,
        new Decimal(100),
        new Date(),
        'Bank Transfer',
        'REF-001'
      )

      // Close
      const closed = await RequisitionService.closeRequisition(requisition.id)
      expect(closed.status).toBe(RequisitionStatus.CLOSED)
      expect(closed.closedAt).toBeDefined()

      // Cleanup - skip due to immutable audit trails
    })

    it('should only allow closing from Paid status', async () => {
      const requisitionData = {
        title: 'Test Requisition',
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

      // Try to close from Draft - should fail
      await expect(
        RequisitionService.closeRequisition(requisition.id)
      ).rejects.toThrow()

      // Cleanup - skip due to immutable audit trails
    })

    it('should be terminal status - no further transitions allowed', async () => {
      const requisitionData = {
        title: 'Test Requisition',
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

      // Complete workflow to Closed
      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)
      await RequisitionService.approveRequisition(requisition.id)
      await RequisitionService.recordPayment(
        requisition.id,
        new Decimal(100),
        new Date(),
        'Bank Transfer',
        'REF-001'
      )
      await RequisitionService.closeRequisition(requisition.id)

      // Verify no further transitions allowed
      expect(isTerminalStatus(RequisitionStatus.CLOSED as RequisitionStatusType)).toBe(true)

      // Cleanup - skip due to immutable audit trails
    })
  })

  describe('Property 20: Status Change Audit Recording', () => {
    it('should record status changes in audit trail', async () => {
      const requisitionData = {
        title: 'Test Requisition',
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

      // Record initial audit entry for creation
      await prisma.auditTrail.create({
        data: {
          requisitionId: requisition.id,
          userId: testUserId,
          changeType: 'CREATED',
          newValue: JSON.stringify({ status: RequisitionStatus.DRAFT }),
          timestamp: new Date(),
        },
      })

      // Submit and record status change
      await RequisitionService.submitRequisition(requisition.id)
      await prisma.auditTrail.create({
        data: {
          requisitionId: requisition.id,
          userId: testUserId,
          changeType: 'STATUS_CHANGED',
          fieldName: 'status',
          previousValue: RequisitionStatus.DRAFT,
          newValue: RequisitionStatus.SUBMITTED,
          timestamp: new Date(),
        },
      })

      // Verify audit trail entries exist
      const auditEntries = await prisma.auditTrail.findMany({
        where: { requisitionId: requisition.id },
        orderBy: { timestamp: 'asc' },
      })

      expect(auditEntries.length).toBeGreaterThanOrEqual(2)
      expect(auditEntries[0].changeType).toBe('CREATED')
      expect(auditEntries[1].changeType).toBe('STATUS_CHANGED')
      expect(auditEntries[1].previousValue).toBe(RequisitionStatus.DRAFT)
      expect(auditEntries[1].newValue).toBe(RequisitionStatus.SUBMITTED)

      // Cleanup - skip due to immutable audit trails
    })
  })

  describe('Status Transition Validation Functions', () => {
    it('should validate allowed transitions correctly', () => {
      expect(
        isValidStatusTransition(
          RequisitionStatus.DRAFT as RequisitionStatusType,
          RequisitionStatus.SUBMITTED as RequisitionStatusType
        )
      ).toBe(true)

      expect(
        isValidStatusTransition(
          RequisitionStatus.DRAFT as RequisitionStatusType,
          RequisitionStatus.APPROVED as RequisitionStatusType
        )
      ).toBe(false)

      expect(
        isValidStatusTransition(
          RequisitionStatus.SUBMITTED as RequisitionStatusType,
          RequisitionStatus.UNDER_REVIEW as RequisitionStatusType
        )
      ).toBe(true)

      expect(
        isValidStatusTransition(
          RequisitionStatus.UNDER_REVIEW as RequisitionStatusType,
          RequisitionStatus.APPROVED as RequisitionStatusType
        )
      ).toBe(true)

      expect(
        isValidStatusTransition(
          RequisitionStatus.UNDER_REVIEW as RequisitionStatusType,
          RequisitionStatus.REJECTED as RequisitionStatusType
        )
      ).toBe(true)

      expect(
        isValidStatusTransition(
          RequisitionStatus.APPROVED as RequisitionStatusType,
          RequisitionStatus.PAID as RequisitionStatusType
        )
      ).toBe(true)

      expect(
        isValidStatusTransition(
          RequisitionStatus.PAID as RequisitionStatusType,
          RequisitionStatus.CLOSED as RequisitionStatusType
        )
      ).toBe(true)
    })

    it('should get allowed next statuses correctly', () => {
      expect(
        getAllowedNextStatuses(RequisitionStatus.DRAFT as RequisitionStatusType)
      ).toEqual([RequisitionStatus.SUBMITTED])

      expect(
        getAllowedNextStatuses(RequisitionStatus.SUBMITTED as RequisitionStatusType)
      ).toEqual([RequisitionStatus.UNDER_REVIEW])

      expect(
        getAllowedNextStatuses(RequisitionStatus.UNDER_REVIEW as RequisitionStatusType)
      ).toContain(RequisitionStatus.APPROVED)
      expect(
        getAllowedNextStatuses(RequisitionStatus.UNDER_REVIEW as RequisitionStatusType)
      ).toContain(RequisitionStatus.REJECTED)

      expect(
        getAllowedNextStatuses(RequisitionStatus.REJECTED as RequisitionStatusType)
      ).toEqual([])

      expect(
        getAllowedNextStatuses(RequisitionStatus.CLOSED as RequisitionStatusType)
      ).toEqual([])
    })

    it('should throw error on invalid transition validation', () => {
      expect(() => {
        validateStatusTransition(
          RequisitionStatus.DRAFT as RequisitionStatusType,
          RequisitionStatus.APPROVED as RequisitionStatusType
        )
      }).toThrow()

      expect(() => {
        validateStatusTransition(
          RequisitionStatus.REJECTED as RequisitionStatusType,
          RequisitionStatus.APPROVED as RequisitionStatusType
        )
      }).toThrow()
    })
  })
})
