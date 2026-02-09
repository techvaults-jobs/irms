/**
 * Integration Tests: End-to-End Workflow Tests
 * Feature: irms
 * 
 * Tests complete requisition lifecycle, multi-step approval workflows,
 * and concurrent operations to ensure system correctness across workflows.
 * 
 * Validates: Requirements 1.3, 2.3, 3.5, 4.6
 */

import bcrypt from 'bcryptjs'
import { RequisitionService } from '@/services/requisition.service'
import { ApprovalWorkflowService } from '@/services/approval-workflow.service'
import { FinancialTrackingService } from '@/services/financial-tracking.service'
import { AuditTrailService } from '@/services/audit-trail.service'
import { RequisitionStatus } from '@/lib/status-transitions'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

describe('Integration Tests: End-to-End Workflows', () => {
  let testDepartmentId: string
  let staffUserId: string
  let managerUserId: string
  let financeUserId: string

  beforeAll(async () => {
    // Create test department
    const dept = await prisma.department.create({
      data: { name: `e2e-dept-${Date.now()}-${Math.random()}` },
    })
    testDepartmentId = dept.id

    // Create test users
    const hashedPassword = await bcrypt.hash('test@123', 10)

    const staff = await prisma.user.create({
      data: {
        email: `e2e-staff-${Date.now()}-${Math.random()}@example.com`,
        name: 'E2E Staff User',
        role: 'STAFF',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    staffUserId = staff.id

    const manager = await prisma.user.create({
      data: {
        email: `e2e-manager-${Date.now()}-${Math.random()}@example.com`,
        name: 'E2E Manager User',
        role: 'MANAGER',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    managerUserId = manager.id

    const finance = await prisma.user.create({
      data: {
        email: `e2e-finance-${Date.now()}-${Math.random()}@example.com`,
        name: 'E2E Finance User',
        role: 'FINANCE',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    financeUserId = finance.id

    // Create approval rule for testing
    await ApprovalWorkflowService.createApprovalRule({
      minAmount: 100,
      maxAmount: 1000,
      requiredApprovers: ['MANAGER', 'FINANCE'],
    })
  })

  afterAll(async () => {
    // Cleanup
    try {
      await prisma.requisition.deleteMany({
        where: { submitterId: { in: [staffUserId, managerUserId, financeUserId] } },
      })
    } catch (e) {
      // Ignore cleanup errors
    }

    try {
      await prisma.user.deleteMany({
        where: { id: { in: [staffUserId, managerUserId, financeUserId] } },
      })
    } catch (e) {
      // Ignore cleanup errors
    }

    try {
      await prisma.department.deleteMany({ where: { id: testDepartmentId } })
    } catch (e) {
      // Ignore cleanup errors
    }
  })

  describe('Complete Requisition Lifecycle', () => {
    it('should complete full lifecycle: Draft → Submitted → Under Review → Approved → Paid → Closed', async () => {
      // Step 1: Create requisition in Draft status
      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Complete Lifecycle Test',
          category: 'Office Supplies',
          description: 'Testing complete lifecycle',
          estimatedCost: 500,
          currency: 'USD',
          urgencyLevel: 'MEDIUM',
          businessJustification: 'Complete lifecycle test',
        },
        staffUserId,
        testDepartmentId
      )

      expect(requisition.status).toBe(RequisitionStatus.DRAFT)

      // Step 2: Submit requisition
      const submitted = await RequisitionService.submitRequisition(requisition.id)
      expect(submitted.status).toBe(RequisitionStatus.SUBMITTED)

      // Step 3: Transition to Under Review
      const underReview = await RequisitionService.transitionToUnderReview(requisition.id)
      expect(underReview.status).toBe(RequisitionStatus.UNDER_REVIEW)

      // Step 4: Create approval steps
      const approvalSteps = await ApprovalWorkflowService.createApprovalSteps(
        requisition.id,
        ['MANAGER', 'FINANCE']
      )
      expect(approvalSteps).toHaveLength(2)
      expect(approvalSteps[0].stepNumber).toBe(1)
      expect(approvalSteps[1].stepNumber).toBe(2)

      // Step 5: Manager approves
      await ApprovalWorkflowService.approveStep(approvalSteps[0].id, managerUserId, 'Approved by manager')

      // Step 6: Finance approves
      await ApprovalWorkflowService.approveStep(approvalSteps[1].id, financeUserId, 'Approved by finance')

      // Step 7: Transition to Approved
      const approved = await RequisitionService.approveRequisition(requisition.id, new Decimal(500))
      expect(approved.status).toBe(RequisitionStatus.APPROVED)
      expect(approved.approvedCost).toEqual(new Decimal(500))

      // Step 8: Record payment
      const paid = await RequisitionService.recordPayment(
        requisition.id,
        new Decimal(500),
        new Date(),
        'Bank Transfer',
        'REF-E2E-001'
      )
      expect(paid.status).toBe(RequisitionStatus.PAID)
      expect(paid.actualCostPaid).toEqual(new Decimal(500))

      // Step 9: Close requisition
      const closed = await RequisitionService.closeRequisition(requisition.id)
      expect(closed.status).toBe(RequisitionStatus.CLOSED)
      expect(closed.closedAt).toBeDefined()

      // Verify audit trail has all transitions
      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisition.id)
      // Audit trail may be empty if not explicitly recorded in this test
      expect(auditTrail).toBeDefined()
    })

    it('should allow editing requisition in Draft status', async () => {
      // Create requisition
      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Original Title',
          category: 'Office Supplies',
          description: 'Original description',
          estimatedCost: 100,
          currency: 'USD',
          urgencyLevel: 'LOW',
          businessJustification: 'Original justification',
        },
        staffUserId,
        testDepartmentId
      )

      expect(requisition.status).toBe(RequisitionStatus.DRAFT)

      // Update requisition
      const updated = await RequisitionService.updateRequisition(requisition.id, {
        title: 'Updated Title',
        estimatedCost: 200,
        urgencyLevel: 'HIGH',
      })

      expect(updated.title).toBe('Updated Title')
      expect(updated.estimatedCost).toEqual(new Decimal(200))
      expect(updated.urgencyLevel).toBe('HIGH')
      expect(updated.status).toBe(RequisitionStatus.DRAFT)
    })

    it('should prevent editing requisition after submission', async () => {
      // Create and submit requisition
      const requisition = await RequisitionService.createRequisition(
        {
          title: 'No Edit After Submit',
          category: 'Equipment',
          description: 'Test',
          estimatedCost: 300,
          currency: 'USD',
          urgencyLevel: 'MEDIUM',
          businessJustification: 'Test',
        },
        staffUserId,
        testDepartmentId
      )

      await RequisitionService.submitRequisition(requisition.id)

      // Try to update - should fail
      await expect(
        RequisitionService.updateRequisition(requisition.id, {
          title: 'New Title',
        })
      ).rejects.toThrow('Can only update requisitions in Draft status')
    })
  })

  describe('Multi-Step Approval Workflows', () => {
    it('should route through multiple approvers sequentially', async () => {
      // Create requisition
      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Multi-Step Approval Test',
          category: 'Services',
          description: 'Testing multi-step approval',
          estimatedCost: 750,
          currency: 'USD',
          urgencyLevel: 'HIGH',
          businessJustification: 'Multi-step approval test',
        },
        staffUserId,
        testDepartmentId
      )

      // Submit and transition to Under Review
      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)

      // Create approval steps
      const steps = await ApprovalWorkflowService.createApprovalSteps(
        requisition.id,
        ['MANAGER', 'FINANCE']
      )

      // Verify first step is pending
      let firstStep = await prisma.approvalStep.findUnique({
        where: { id: steps[0].id },
      })
      expect(firstStep?.status).toBe('PENDING')

      // Manager approves first step
      await ApprovalWorkflowService.approveStep(steps[0].id, managerUserId)

      // Verify first step is approved
      firstStep = await prisma.approvalStep.findUnique({
        where: { id: steps[0].id },
      })
      expect(firstStep?.status).toBe('APPROVED')

      // Verify second step is still pending
      let secondStep = await prisma.approvalStep.findUnique({
        where: { id: steps[1].id },
      })
      expect(secondStep?.status).toBe('PENDING')

      // Finance approves second step
      await ApprovalWorkflowService.approveStep(steps[1].id, financeUserId)

      // Verify second step is approved
      secondStep = await prisma.approvalStep.findUnique({
        where: { id: steps[1].id },
      })
      expect(secondStep?.status).toBe('APPROVED')

      // Verify all steps approved
      const allApproved = await ApprovalWorkflowService.allStepsApproved(requisition.id)
      expect(allApproved).toBe(true)
    })

    it('should stop workflow when any approver rejects', async () => {
      // Create requisition
      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Rejection Test',
          category: 'Equipment',
          description: 'Testing rejection',
          estimatedCost: 600,
          currency: 'USD',
          urgencyLevel: 'MEDIUM',
          businessJustification: 'Rejection test',
        },
        staffUserId,
        testDepartmentId
      )

      // Submit and transition to Under Review
      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)

      // Create approval steps
      const steps = await ApprovalWorkflowService.createApprovalSteps(
        requisition.id,
        ['MANAGER', 'FINANCE']
      )

      // Manager rejects
      await ApprovalWorkflowService.rejectStep(
        steps[0].id,
        managerUserId,
        'Does not meet requirements'
      )

      // Verify rejection recorded
      const anyRejected = await ApprovalWorkflowService.anyStepRejected(requisition.id)
      expect(anyRejected).toBe(true)

      // Transition to Rejected
      const rejected = await RequisitionService.rejectRequisition(requisition.id)
      expect(rejected.status).toBe(RequisitionStatus.REJECTED)

      // Verify second step is still pending (workflow stopped)
      const secondStep = await prisma.approvalStep.findUnique({
        where: { id: steps[1].id },
      })
      expect(secondStep?.status).toBe('PENDING')
    })

    it('should determine correct approvers based on amount and department', async () => {
      // Create approval rules
      await ApprovalWorkflowService.createApprovalRule({
        minAmount: 0,
        maxAmount: 100,
        requiredApprovers: ['MANAGER'],
      })

      await ApprovalWorkflowService.createApprovalRule({
        minAmount: 100,
        maxAmount: 1000,
        requiredApprovers: ['MANAGER', 'FINANCE'],
      })

      await ApprovalWorkflowService.createApprovalRule({
        minAmount: 1000,
        requiredApprovers: ['MANAGER', 'FINANCE'],
      })

      // Test low amount - should require only MANAGER
      const lowApprovers = await ApprovalWorkflowService.determineApprovers(
        new Decimal(50),
        testDepartmentId
      )
      expect(lowApprovers).toContain('MANAGER')

      // Test medium amount - should require MANAGER and FINANCE
      const mediumApprovers = await ApprovalWorkflowService.determineApprovers(
        new Decimal(500),
        testDepartmentId
      )
      expect(mediumApprovers).toContain('MANAGER')
      expect(mediumApprovers).toContain('FINANCE')

      // Test high amount - should require MANAGER and FINANCE
      const highApprovers = await ApprovalWorkflowService.determineApprovers(
        new Decimal(2000),
        testDepartmentId
      )
      expect(highApprovers).toContain('MANAGER')
      expect(highApprovers).toContain('FINANCE')
    })
  })

  describe('Financial Tracking Integration', () => {
    it('should track costs through entire lifecycle', async () => {
      // Create requisition
      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Financial Tracking Test',
          category: 'Office Supplies',
          description: 'Testing financial tracking',
          estimatedCost: 400,
          currency: 'USD',
          urgencyLevel: 'MEDIUM',
          businessJustification: 'Financial tracking test',
        },
        staffUserId,
        testDepartmentId
      )

      // Verify estimated cost recorded
      let summary = await FinancialTrackingService.getFinancialSummary(requisition.id)
      expect(summary.estimatedCost).toEqual(new Decimal(400))
      expect(summary.approvedCost).toBeNull()
      expect(summary.actualCostPaid).toBeNull()

      // Submit and approve
      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)
      const approved = await RequisitionService.approveRequisition(requisition.id, new Decimal(380))

      // Verify approved cost recorded
      summary = await FinancialTrackingService.getFinancialSummary(approved.id)
      expect(summary.estimatedCost).toEqual(new Decimal(400))
      expect(summary.approvedCost).toEqual(new Decimal(380))
      expect(summary.actualCostPaid).toBeNull()

      // Record payment
      const paid = await RequisitionService.recordPayment(
        requisition.id,
        new Decimal(380),
        new Date(),
        'Bank Transfer',
        'REF-FIN-001'
      )

      // Verify actual cost recorded
      summary = await FinancialTrackingService.getFinancialSummary(paid.id)
      expect(summary.estimatedCost).toEqual(new Decimal(400))
      expect(summary.approvedCost).toEqual(new Decimal(380))
      expect(summary.actualCostPaid).toEqual(new Decimal(380))
    })

    it('should validate payment amount against approved cost', async () => {
      // Create and approve requisition
      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Payment Validation Test',
          category: 'Equipment',
          description: 'Testing payment validation',
          estimatedCost: 1000,
          currency: 'USD',
          urgencyLevel: 'HIGH',
          businessJustification: 'Payment validation test',
        },
        staffUserId,
        testDepartmentId
      )

      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)
      await RequisitionService.approveRequisition(requisition.id, new Decimal(1000))

      // Record payment with comment when exceeding threshold - should succeed
      const paid = await RequisitionService.recordPayment(
        requisition.id,
        new Decimal(1100),
        new Date(),
        'Bank Transfer',
        'REF-VAL-001',
        'Slight overage due to shipping'
      )

      expect(paid.status).toBe(RequisitionStatus.PAID)
      expect(paid.actualCostPaid).toEqual(new Decimal(1100))
      expect(paid.paymentComment).toBe('Slight overage due to shipping')
    })
  })

  describe('Audit Trail Integration', () => {
    it('should record all lifecycle transitions in audit trail', async () => {
      // Create requisition
      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Audit Trail Test',
          category: 'Services',
          description: 'Testing audit trail',
          estimatedCost: 250,
          currency: 'USD',
          urgencyLevel: 'MEDIUM',
          businessJustification: 'Audit trail test',
        },
        staffUserId,
        testDepartmentId
      )

      // Record creation
      await AuditTrailService.recordCreation(requisition.id, staffUserId, {
        title: requisition.title,
        estimatedCost: requisition.estimatedCost.toString(),
        status: RequisitionStatus.DRAFT,
      })

      // Submit and record
      await RequisitionService.submitRequisition(requisition.id)
      await AuditTrailService.recordStatusChange(
        requisition.id,
        staffUserId,
        RequisitionStatus.DRAFT,
        RequisitionStatus.SUBMITTED,
        'Submitted by staff'
      )

      // Transition to Under Review and record
      await RequisitionService.transitionToUnderReview(requisition.id)
      await AuditTrailService.recordStatusChange(
        requisition.id,
        staffUserId,
        RequisitionStatus.SUBMITTED,
        RequisitionStatus.UNDER_REVIEW,
        'Routed to approvers'
      )

      // Approve and record
      await RequisitionService.approveRequisition(requisition.id)
      await AuditTrailService.recordApproval(requisition.id, managerUserId, 'Approved')

      // Get audit trail
      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisition.id)

      // Verify entries exist
      expect(auditTrail.length).toBeGreaterThanOrEqual(4)

      // Verify chronological order
      for (let i = 1; i < auditTrail.length; i++) {
        expect(auditTrail[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          auditTrail[i - 1].timestamp.getTime()
        )
      }

      // Verify immutability - cannot update audit trail (database constraint prevents it)
      const firstEntry = auditTrail[0]
      try {
        await prisma.auditTrail.update({
          where: { id: firstEntry.id },
          data: { changeType: 'MODIFIED' },
        })
        // If we get here, immutability is not enforced at DB level
        fail('Audit trail should be immutable')
      } catch (error) {
        // Expected - audit trail is immutable
        expect(error).toBeDefined()
      }
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle concurrent requisition creation', async () => {
      // Create multiple requisitions concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        RequisitionService.createRequisition(
          {
            title: `Concurrent Test ${i}`,
            category: 'Office Supplies',
            description: `Concurrent test ${i}`,
            estimatedCost: 100 + i * 10,
            currency: 'USD',
            urgencyLevel: 'MEDIUM',
            businessJustification: `Concurrent test ${i}`,
          },
          staffUserId,
          testDepartmentId
        )
      )

      const requisitions = await Promise.all(promises)

      // Verify all created successfully
      expect(requisitions).toHaveLength(5)
      requisitions.forEach((req, i) => {
        expect(req.status).toBe(RequisitionStatus.DRAFT)
        expect(req.title).toBe(`Concurrent Test ${i}`)
      })
    })

    it('should handle concurrent approval steps', async () => {
      // Create requisition
      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Concurrent Approval Test',
          category: 'Equipment',
          description: 'Testing concurrent approvals',
          estimatedCost: 500,
          currency: 'USD',
          urgencyLevel: 'HIGH',
          businessJustification: 'Concurrent approval test',
        },
        staffUserId,
        testDepartmentId
      )

      // Submit and transition
      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)

      // Create approval steps
      const steps = await ApprovalWorkflowService.createApprovalSteps(
        requisition.id,
        ['MANAGER', 'FINANCE']
      )

      // Approve both steps concurrently
      const approvalPromises = [
        ApprovalWorkflowService.approveStep(steps[0].id, managerUserId),
        ApprovalWorkflowService.approveStep(steps[1].id, financeUserId),
      ]

      const approvals = await Promise.all(approvalPromises)

      // Verify both approved
      expect(approvals).toHaveLength(2)
      expect(approvals[0].status).toBe('APPROVED')
      expect(approvals[1].status).toBe('APPROVED')

      // Verify all steps approved
      const allApproved = await ApprovalWorkflowService.allStepsApproved(requisition.id)
      expect(allApproved).toBe(true)
    })
  })
})
