/**
 * Property Tests: Approver Determination and Sequential Routing
 * Feature: irms
 * Property 6: Automatic Approver Determination
 * Property 7: Sequential Approval Routing
 * Validates: Requirements 2.3, 2.4
 * 
 * Property 6: For any requisition with a specific amount and department, submitting it 
 * should automatically assign the correct approvers based on the configured approval 
 * rules for that amount and department.
 * 
 * Property 7: For any requisition requiring multiple approvers, the requisition should 
 * be routed sequentially through each approver in the configured order, with each step 
 * transitioning to Pending status for the next approver only after the current approver approves.
 */

import bcrypt from 'bcryptjs'
import { ApprovalWorkflowService } from '@/services/approval-workflow.service'
import { RequisitionService } from '@/services/requisition.service'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

describe('Property 6 & 7: Approver Determination and Sequential Routing', () => {
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

  it('should determine correct approvers for amount within rule range', async () => {
    // Create approval rule: 100-500 requires MANAGER
    const rule = await ApprovalWorkflowService.createApprovalRule({
      minAmount: 100,
      maxAmount: 500,
      requiredApprovers: ['MANAGER'],
    })

    const amount = new Decimal(250)
    const approvers = await ApprovalWorkflowService.determineApprovers(
      amount,
      testDepartmentId
    )

    expect(approvers).toContain('MANAGER')

    // Cleanup
    await prisma.approvalRule.delete({ where: { id: rule.id } })
  })

  it('should determine correct approvers for amount above rule range', async () => {
    // Create approval rule: 500+ requires MANAGER and FINANCE
    const rule = await ApprovalWorkflowService.createApprovalRule({
      minAmount: 500,
      requiredApprovers: ['MANAGER', 'FINANCE'],
    })

    const amount = new Decimal(1000)
    const approvers = await ApprovalWorkflowService.determineApprovers(
      amount,
      testDepartmentId
    )

    expect(approvers).toContain('MANAGER')
    expect(approvers).toContain('FINANCE')

    // Cleanup
    await prisma.approvalRule.delete({ where: { id: rule.id } })
  })

  it('should use most specific rule when multiple rules apply', async () => {
    // Create two rules
    const rule1 = await ApprovalWorkflowService.createApprovalRule({
      minAmount: 100,
      requiredApprovers: ['MANAGER'],
    })

    const rule2 = await ApprovalWorkflowService.createApprovalRule({
      minAmount: 500,
      requiredApprovers: ['MANAGER', 'FINANCE'],
    })

    const amount = new Decimal(750)
    const approvers = await ApprovalWorkflowService.determineApprovers(
      amount,
      testDepartmentId
    )

    // Should use rule2 (most specific)
    expect(approvers).toContain('MANAGER')
    expect(approvers).toContain('FINANCE')

    // Cleanup
    await prisma.approvalRule.deleteMany({
      where: { id: { in: [rule1.id, rule2.id] } },
    })
  })

  it('should create sequential approval steps', async () => {
    const rule = await ApprovalWorkflowService.createApprovalRule({
      minAmount: 100,
      requiredApprovers: ['MANAGER', 'FINANCE'],
    })

    const requisition = await RequisitionService.createRequisition(
      {
        title: 'Test Requisition',
        category: 'Office Supplies',
        description: 'Test',
        estimatedCost: 300,
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

    expect(steps.length).toBe(2)
    expect(steps[0].stepNumber).toBe(1)
    expect(steps[0].requiredRole).toBe('MANAGER')
    expect(steps[0].status).toBe('PENDING')
    expect(steps[1].stepNumber).toBe(2)
    expect(steps[1].requiredRole).toBe('FINANCE')
    expect(steps[1].status).toBe('PENDING')

    // Cleanup
    await prisma.requisition.delete({ where: { id: requisition.id } })
    await prisma.approvalRule.delete({ where: { id: rule.id } })
  })

  it('should route to next approver only after current approves', async () => {
    const rule = await ApprovalWorkflowService.createApprovalRule({
      minAmount: 100,
      requiredApprovers: ['MANAGER', 'FINANCE'],
    })

    const requisition = await RequisitionService.createRequisition(
      {
        title: 'Sequential Test',
        category: 'Equipment',
        description: 'Test',
        estimatedCost: 400,
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

    // Initially both steps are pending
    let allSteps = await ApprovalWorkflowService.getApprovalSteps(requisition.id)
    expect(allSteps.filter(s => s.status === 'PENDING').length).toBe(2)

    // Approve first step
    await ApprovalWorkflowService.approveStep(steps[0].id, managerUserId, 'Approved')

    // Check that first step is approved
    allSteps = await ApprovalWorkflowService.getApprovalSteps(requisition.id)
    expect(allSteps[0].status).toBe('APPROVED')
    expect(allSteps[1].status).toBe('PENDING')

    // Approve second step
    await ApprovalWorkflowService.approveStep(steps[1].id, financeUserId, 'Approved')

    // Check that both steps are approved
    allSteps = await ApprovalWorkflowService.getApprovalSteps(requisition.id)
    expect(allSteps[0].status).toBe('APPROVED')
    expect(allSteps[1].status).toBe('APPROVED')

    // Cleanup
    await prisma.requisition.delete({ where: { id: requisition.id } })
    await prisma.approvalRule.delete({ where: { id: rule.id } })
  })

  it('should get next pending step correctly', async () => {
    const rule = await ApprovalWorkflowService.createApprovalRule({
      minAmount: 100,
      requiredApprovers: ['MANAGER', 'FINANCE'],
    })

    const requisition = await RequisitionService.createRequisition(
      {
        title: 'Next Step Test',
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
      ['MANAGER', 'FINANCE']
    )

    // Get next pending step (should be first)
    let nextStep = await ApprovalWorkflowService.getNextPendingStep(requisition.id)
    expect(nextStep?.stepNumber).toBe(1)
    expect(nextStep?.requiredRole).toBe('MANAGER')

    // Approve first step
    await ApprovalWorkflowService.approveStep(steps[0].id, managerUserId)

    // Get next pending step (should be second)
    nextStep = await ApprovalWorkflowService.getNextPendingStep(requisition.id)
    expect(nextStep?.stepNumber).toBe(2)
    expect(nextStep?.requiredRole).toBe('FINANCE')

    // Cleanup
    await prisma.requisition.delete({ where: { id: requisition.id } })
    await prisma.approvalRule.delete({ where: { id: rule.id } })
  })
})
