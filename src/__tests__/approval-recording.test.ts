/**
 * Property Tests: Approval Recording and Routing
 * Feature: irms
 * Property 8: Approval Status Transition
 * Property 9: Approval Recording and Routing
 * Property 10: Rejection Comment Requirement
 * Property 11: Final Approval Transition
 * Property 12: Rejection Status Transition
 * Validates: Requirements 2.5, 2.7, 2.8, 2.9, 2.10, 2.11
 */

import bcrypt from 'bcryptjs'
import { RequisitionService } from '@/services/requisition.service'
import { RequisitionStatus } from '@/lib/status-transitions'
import { ApprovalWorkflowService } from '@/services/approval-workflow.service'
import { AuditTrailService } from '@/services/audit-trail.service'
import { prisma } from '@/lib/prisma'

describe('Property 8-12: Approval Recording and Routing', () => {
  let testDepartmentId: string
  let staffUserId: string
  let managerUserId: string
  let financeUserId: string

  beforeAll(async () => {
    const dept = await prisma.department.create({
      data: { name: `test-dept-${Date.now()}-${Math.random()}` },
    })
    testDepartmentId = dept.id

    const hashedPassword = await bcrypt.hash('test@123', 10)

    const staff = await prisma.user.create({
      data: {
        email: `staff-${Date.now()}-${Math.random()}@example.com`,
        name: 'Staff User',
        role: 'STAFF',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    staffUserId = staff.id

    const manager = await prisma.user.create({
      data: {
        email: `manager-${Date.now()}-${Math.random()}@example.com`,
        name: 'Manager User',
        role: 'MANAGER',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    managerUserId = manager.id

    const finance = await prisma.user.create({
      data: {
        email: `finance-${Date.now()}-${Math.random()}@example.com`,
        name: 'Finance User',
        role: 'FINANCE',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    financeUserId = finance.id
  })

  afterAll(async () => {
    // Cleanup - delete requisitions first (audit trails cascade)
    try {
      await prisma.requisition.deleteMany({
        where: { submitterId: { in: [staffUserId, managerUserId, financeUserId] } },
      })
    } catch (e) {
      // Ignore cleanup errors due to immutable audit trails
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

  it('should transition to Under Review when routed to approver', async () => {
    const rule = await ApprovalWorkflowService.createApprovalRule({
      minAmount: 100,
      requiredApprovers: ['MANAGER'],
    })

    const requisition = await RequisitionService.createRequisition(
      {
        title: 'Under Review Test',
        category: 'Office Supplies',
        description: 'Test',
        estimatedCost: 200,
        currency: 'USD',
        urgencyLevel: 'MEDIUM',
        businessJustification: 'Test',
      },
      staffUserId,
      testDepartmentId
    )

    // Submit and transition to Under Review
    await RequisitionService.submitRequisition(requisition.id)
    const underReview = await RequisitionService.transitionToUnderReview(requisition.id)

    expect(underReview.status).toBe(RequisitionStatus.UNDER_REVIEW)

    // Cleanup - skip due to immutable audit trails
  })

  it('should record approval with timestamp and approver identity', async () => {
    const rule = await ApprovalWorkflowService.createApprovalRule({
      minAmount: 100,
      requiredApprovers: ['MANAGER'],
    })

    const requisition = await RequisitionService.createRequisition(
      {
        title: 'Approval Recording Test',
        category: 'Equipment',
        description: 'Test',
        estimatedCost: 300,
        currency: 'USD',
        urgencyLevel: 'HIGH',
        businessJustification: 'Test',
      },
      staffUserId,
      testDepartmentId
    )

    const steps = await ApprovalWorkflowService.createApprovalSteps(
      requisition.id,
      ['MANAGER']
    )

    const beforeApproval = new Date()

    // Approve
    await ApprovalWorkflowService.approveStep(steps[0].id, managerUserId, 'Looks good')

    const afterApproval = new Date()

    // Record approval
    await AuditTrailService.recordApproval(
      requisition.id,
      managerUserId,
      'Looks good'
    )

    // Get audit trail
    const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisition.id)
    const approvalEntry = auditTrail.find(e => e.changeType === 'APPROVED')

    expect(approvalEntry).toBeDefined()
    expect(approvalEntry?.userId).toBe(managerUserId)
    expect(approvalEntry?.timestamp.getTime()).toBeGreaterThanOrEqual(beforeApproval.getTime())
    expect(approvalEntry?.timestamp.getTime()).toBeLessThanOrEqual(afterApproval.getTime() + 1)

    // Cleanup - skip due to immutable audit trails
  })

  it('should require rejection comment', async () => {
    const rule = await ApprovalWorkflowService.createApprovalRule({
      minAmount: 100,
      requiredApprovers: ['MANAGER'],
    })

    const requisition = await RequisitionService.createRequisition(
      {
        title: 'Rejection Comment Test',
        category: 'Services',
        description: 'Test',
        estimatedCost: 250,
        currency: 'USD',
        urgencyLevel: 'MEDIUM',
        businessJustification: 'Test',
      },
      staffUserId,
      testDepartmentId
    )

    const steps = await ApprovalWorkflowService.createApprovalSteps(
      requisition.id,
      ['MANAGER']
    )

    // Try to reject without comment - should fail
    await expect(
      ApprovalWorkflowService.rejectStep(steps[0].id, managerUserId, '')
    ).rejects.toThrow('Rejection comment is required')

    // Reject with comment - should succeed
    const rejected = await ApprovalWorkflowService.rejectStep(
      steps[0].id,
      managerUserId,
      'Does not meet requirements'
    )

    expect(rejected.status).toBe('REJECTED')
    expect(rejected.approverComment).toBe('Does not meet requirements')

    // Cleanup - skip due to immutable audit trails
  })

  it('should transition to Approved when all approvers approve', async () => {
    const rule = await ApprovalWorkflowService.createApprovalRule({
      minAmount: 100,
      requiredApprovers: ['MANAGER', 'FINANCE'],
    })

    const requisition = await RequisitionService.createRequisition(
      {
        title: 'Final Approval Test',
        category: 'Office Supplies',
        description: 'Test',
        estimatedCost: 400,
        currency: 'USD',
        urgencyLevel: 'MEDIUM',
        businessJustification: 'Test',
      },
      staffUserId,
      testDepartmentId
    )

    const steps = await ApprovalWorkflowService.createApprovalSteps(
      requisition.id,
      ['MANAGER', 'FINANCE']
    )

    // Submit and transition to Under Review first
    await RequisitionService.submitRequisition(requisition.id)
    await RequisitionService.transitionToUnderReview(requisition.id)

    // Approve first step
    await ApprovalWorkflowService.approveStep(steps[0].id, managerUserId)

    // Check not all approved yet
    let allApproved = await ApprovalWorkflowService.allStepsApproved(requisition.id)
    expect(allApproved).toBe(false)

    // Approve second step
    await ApprovalWorkflowService.approveStep(steps[1].id, financeUserId)

    // Check all approved
    allApproved = await ApprovalWorkflowService.allStepsApproved(requisition.id)
    expect(allApproved).toBe(true)

    // Transition to Approved
    const approved = await RequisitionService.approveRequisition(requisition.id)
    expect(approved.status).toBe(RequisitionStatus.APPROVED)

    // Cleanup - skip due to immutable audit trails
  })

  it('should transition to Rejected when any approver rejects', async () => {
    const rule = await ApprovalWorkflowService.createApprovalRule({
      minAmount: 100,
      requiredApprovers: ['MANAGER', 'FINANCE'],
    })

    const requisition = await RequisitionService.createRequisition(
      {
        title: 'Rejection Test',
        category: 'Equipment',
        description: 'Test',
        estimatedCost: 500,
        currency: 'USD',
        urgencyLevel: 'HIGH',
        businessJustification: 'Test',
      },
      staffUserId,
      testDepartmentId
    )

    const steps = await ApprovalWorkflowService.createApprovalSteps(
      requisition.id,
      ['MANAGER', 'FINANCE']
    )

    // Submit and transition to Under Review first
    await RequisitionService.submitRequisition(requisition.id)
    await RequisitionService.transitionToUnderReview(requisition.id)

    // Reject first step
    await ApprovalWorkflowService.rejectStep(
      steps[0].id,
      managerUserId,
      'Not approved'
    )

    // Check any rejected
    const anyRejected = await ApprovalWorkflowService.anyStepRejected(requisition.id)
    expect(anyRejected).toBe(true)

    // Transition to Rejected
    const rejected = await RequisitionService.rejectRequisition(requisition.id)
    expect(rejected.status).toBe(RequisitionStatus.REJECTED)

    // Cleanup - skip due to immutable audit trails
  })

  it('should record rejection in audit trail with comment', async () => {
    const rule = await ApprovalWorkflowService.createApprovalRule({
      minAmount: 100,
      requiredApprovers: ['MANAGER'],
    })

    const requisition = await RequisitionService.createRequisition(
      {
        title: 'Rejection Audit Test',
        category: 'Services',
        description: 'Test',
        estimatedCost: 350,
        currency: 'USD',
        urgencyLevel: 'MEDIUM',
        businessJustification: 'Test',
      },
      staffUserId,
      testDepartmentId
    )

    const steps = await ApprovalWorkflowService.createApprovalSteps(
      requisition.id,
      ['MANAGER']
    )

    const rejectionComment = 'Budget exceeded for this quarter'

    // Reject
    await ApprovalWorkflowService.rejectStep(
      steps[0].id,
      managerUserId,
      rejectionComment
    )

    // Record rejection
    await AuditTrailService.recordRejection(
      requisition.id,
      managerUserId,
      rejectionComment
    )

    // Get audit trail
    const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisition.id)
    const rejectionEntry = auditTrail.find(e => e.changeType === 'REJECTED')

    expect(rejectionEntry).toBeDefined()
    expect(rejectionEntry?.userId).toBe(managerUserId)

    // Cleanup - skip due to immutable audit trails
  })
})
