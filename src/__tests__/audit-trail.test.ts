/**
 * Property Tests: Audit Trail System
 * Feature: irms
 * Property 26: Audit Trail Immutability
 * Property 27: Audit Trail Completeness
 * Property 28: Audit Trail Sequential IDs
 * Property 29: Audit Trail Chronological Order
 * Property 30: Creation Audit Recording
 * Property 31: Field Edit Audit Recording
 * Property 32: Approval Decision Audit Recording
 * Property 33: Payment Audit Recording
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.7, 5.8, 5.9, 5.10
 */

import bcrypt from 'bcryptjs'
import { RequisitionService } from '@/services/requisition.service'
import { RequisitionStatus } from '@/lib/status-transitions'
import { ApprovalWorkflowService } from '@/services/approval-workflow.service'
import { AuditTrailService, AuditChangeType } from '@/services/audit-trail.service'
import { prisma } from '@/lib/prisma'

describe('Property 26-33: Audit Trail System', () => {
  let testDepartmentId: string
  let staffUserId: string
  let managerUserId: string
  let financeUserId: string

  beforeAll(async () => {
    const dept = await prisma.department.create({
      data: { name: `audit-test-dept-${Date.now()}` },
    })
    testDepartmentId = dept.id

    const hashedPassword = await bcrypt.hash('test@123', 10)

    const staff = await prisma.user.create({
      data: {
        email: `audit-staff-${Date.now()}@example.com`,
        name: 'Audit Staff User',
        role: 'STAFF',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    staffUserId = staff.id

    const manager = await prisma.user.create({
      data: {
        email: `audit-manager-${Date.now()}@example.com`,
        name: 'Audit Manager User',
        role: 'MANAGER',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    managerUserId = manager.id

    const finance = await prisma.user.create({
      data: {
        email: `audit-finance-${Date.now()}@example.com`,
        name: 'Audit Finance User',
        role: 'FINANCE',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    financeUserId = finance.id
  })

  describe('Property 26: Audit Trail Immutability', () => {
    it('should prevent updates to audit trail entries', async () => {
      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Immutability Test',
          category: 'Office Supplies',
          description: 'Test immutability',
          estimatedCost: 100,
          currency: 'USD',
          urgencyLevel: 'MEDIUM',
          businessJustification: 'Test',
        },
        staffUserId,
        testDepartmentId
      )

      // Manually record creation
      await AuditTrailService.recordCreation(
        requisition.id,
        staffUserId,
        { title: requisition.title, estimatedCost: requisition.estimatedCost }
      )

      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisition.id)
      const creationEntry = auditTrail[0]

      // Attempt to update should fail
      await expect(
        prisma.auditTrail.update({
          where: { id: creationEntry.id },
          data: { changeType: 'MODIFIED' },
        })
      ).rejects.toThrow()
    })

    it('should prevent deletes of audit trail entries', async () => {
      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Delete Prevention Test',
          category: 'Equipment',
          description: 'Test delete prevention',
          estimatedCost: 200,
          currency: 'USD',
          urgencyLevel: 'HIGH',
          businessJustification: 'Test',
        },
        staffUserId,
        testDepartmentId
      )

      // Manually record creation
      await AuditTrailService.recordCreation(
        requisition.id,
        staffUserId,
        { title: requisition.title, estimatedCost: requisition.estimatedCost }
      )

      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisition.id)
      const creationEntry = auditTrail[0]

      // Attempt to delete should fail
      await expect(
        prisma.auditTrail.delete({
          where: { id: creationEntry.id },
        })
      ).rejects.toThrow()
    })
  })

  describe('Property 27: Audit Trail Completeness', () => {
    it('should record all required fields for each change', async () => {
      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Completeness Test',
          category: 'Services',
          description: 'Test completeness',
          estimatedCost: 150,
          currency: 'USD',
          urgencyLevel: 'MEDIUM',
          businessJustification: 'Test',
        },
        staffUserId,
        testDepartmentId
      )

      // Manually record creation
      await AuditTrailService.recordCreation(
        requisition.id,
        staffUserId,
        { title: requisition.title, estimatedCost: requisition.estimatedCost }
      )

      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisition.id)
      const creationEntry = auditTrail[0]

      // Verify all required fields are present
      expect(creationEntry.id).toBeDefined()
      expect(creationEntry.requisitionId).toBe(requisition.id)
      expect(creationEntry.userId).toBe(staffUserId)
      expect(creationEntry.changeType).toBe(AuditChangeType.CREATED)
      expect(creationEntry.timestamp).toBeDefined()
      expect(creationEntry.newValue).toBeDefined()
    })

    it('should capture previous and new values for field updates', async () => {
      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Field Update Test',
          category: 'Office Supplies',
          description: 'Original description',
          estimatedCost: 100,
          currency: 'USD',
          urgencyLevel: 'MEDIUM',
          businessJustification: 'Test',
        },
        staffUserId,
        testDepartmentId
      )

      // Update a field
      await AuditTrailService.recordFieldUpdate(
        requisition.id,
        staffUserId,
        'description',
        'Original description',
        'Updated description'
      )

      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisition.id)
      const updateEntry = auditTrail.find(e => e.changeType === AuditChangeType.FIELD_UPDATED)

      expect(updateEntry).toBeDefined()
      expect(updateEntry?.fieldName).toBe('description')
      expect(updateEntry?.previousValue).toContain('Original description')
      expect(updateEntry?.newValue).toContain('Updated description')
    })
  })

  describe('Property 28: Audit Trail Sequential IDs', () => {
    it('should assign unique IDs to each audit entry', async () => {
      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Sequential ID Test',
          category: 'Equipment',
          description: 'Test sequential IDs',
          estimatedCost: 300,
          currency: 'USD',
          urgencyLevel: 'HIGH',
          businessJustification: 'Test',
        },
        staffUserId,
        testDepartmentId
      )

      // Create multiple audit entries
      await AuditTrailService.recordFieldUpdate(
        requisition.id,
        staffUserId,
        'title',
        'Sequential ID Test',
        'Updated Title'
      )

      await AuditTrailService.recordStatusChange(
        requisition.id,
        staffUserId,
        RequisitionStatus.DRAFT,
        RequisitionStatus.SUBMITTED
      )

      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisition.id)

      // Verify all IDs are unique
      const ids = auditTrail.map(e => e.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  describe('Property 29: Audit Trail Chronological Order', () => {
    it('should return audit entries in chronological order', async () => {
      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Chronological Order Test',
          category: 'Services',
          description: 'Test chronological order',
          estimatedCost: 250,
          currency: 'USD',
          urgencyLevel: 'MEDIUM',
          businessJustification: 'Test',
        },
        staffUserId,
        testDepartmentId
      )

      // Create multiple audit entries with delays
      await new Promise(resolve => setTimeout(resolve, 10))
      await AuditTrailService.recordFieldUpdate(
        requisition.id,
        staffUserId,
        'title',
        'Chronological Order Test',
        'Updated Title'
      )

      await new Promise(resolve => setTimeout(resolve, 10))
      await AuditTrailService.recordStatusChange(
        requisition.id,
        staffUserId,
        RequisitionStatus.DRAFT,
        RequisitionStatus.SUBMITTED
      )

      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisition.id)

      // Verify chronological order
      for (let i = 1; i < auditTrail.length; i++) {
        expect(auditTrail[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          auditTrail[i - 1].timestamp.getTime()
        )
      }
    })
  })

  describe('Property 30: Creation Audit Recording', () => {
    it('should record creation event with all initial values', async () => {
      const requisitionData = {
        title: 'Creation Recording Test',
        category: 'Office Supplies',
        description: 'Test creation recording',
        estimatedCost: 175,
        currency: 'USD',
        urgencyLevel: 'MEDIUM' as const,
        businessJustification: 'Test',
      }

      const requisition = await RequisitionService.createRequisition(
        requisitionData,
        staffUserId,
        testDepartmentId
      )

      // Manually record creation
      await AuditTrailService.recordCreation(
        requisition.id,
        staffUserId,
        requisitionData
      )

      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisition.id)
      const creationEntry = auditTrail.find(e => e.changeType === AuditChangeType.CREATED)

      expect(creationEntry).toBeDefined()
      expect(creationEntry?.changeType).toBe(AuditChangeType.CREATED)
      expect(creationEntry?.userId).toBe(staffUserId)
      expect(creationEntry?.newValue).toContain(requisitionData.title)
    })
  })

  describe('Property 31: Field Edit Audit Recording', () => {
    it('should record field edits with field name and values', async () => {
      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Field Edit Test',
          category: 'Equipment',
          description: 'Original description',
          estimatedCost: 200,
          currency: 'USD',
          urgencyLevel: 'MEDIUM',
          businessJustification: 'Test',
        },
        staffUserId,
        testDepartmentId
      )

      const originalDescription = 'Original description'
      const updatedDescription = 'Updated description'

      await AuditTrailService.recordFieldUpdate(
        requisition.id,
        staffUserId,
        'description',
        originalDescription,
        updatedDescription
      )

      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisition.id)
      const editEntry = auditTrail.find(e => e.changeType === AuditChangeType.FIELD_UPDATED)

      expect(editEntry).toBeDefined()
      expect(editEntry?.fieldName).toBe('description')
      expect(editEntry?.previousValue).toContain(originalDescription)
      expect(editEntry?.newValue).toContain(updatedDescription)
    })
  })

  describe('Property 32: Approval Decision Audit Recording', () => {
    it('should record approval decisions with approver and timestamp', async () => {
      const rule = await ApprovalWorkflowService.createApprovalRule({
        minAmount: 100,
        requiredApprovers: ['MANAGER'],
      })

      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Approval Decision Test',
          category: 'Services',
          description: 'Test approval recording',
          estimatedCost: 300,
          currency: 'USD',
          urgencyLevel: 'HIGH',
          businessJustification: 'Test',
        },
        staffUserId,
        testDepartmentId
      )

      const beforeApproval = new Date()

      await AuditTrailService.recordApproval(
        requisition.id,
        managerUserId,
        'Approved'
      )

      const afterApproval = new Date()

      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisition.id)
      const approvalEntry = auditTrail.find(e => e.changeType === AuditChangeType.APPROVED)

      expect(approvalEntry).toBeDefined()
      expect(approvalEntry?.userId).toBe(managerUserId)
      expect(approvalEntry?.timestamp.getTime()).toBeGreaterThanOrEqual(beforeApproval.getTime())
      expect(approvalEntry?.timestamp.getTime()).toBeLessThanOrEqual(afterApproval.getTime())
    })

    it('should record rejection decisions with comment', async () => {
      const rule = await ApprovalWorkflowService.createApprovalRule({
        minAmount: 100,
        requiredApprovers: ['MANAGER'],
      })

      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Rejection Decision Test',
          category: 'Equipment',
          description: 'Test rejection recording',
          estimatedCost: 250,
          currency: 'USD',
          urgencyLevel: 'MEDIUM',
          businessJustification: 'Test',
        },
        staffUserId,
        testDepartmentId
      )

      const rejectionComment = 'Budget exceeded'

      await AuditTrailService.recordRejection(
        requisition.id,
        managerUserId,
        rejectionComment
      )

      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisition.id)
      const rejectionEntry = auditTrail.find(e => e.changeType === AuditChangeType.REJECTED)

      expect(rejectionEntry).toBeDefined()
      expect(rejectionEntry?.userId).toBe(managerUserId)
      expect(rejectionEntry?.newValue).toContain(rejectionComment)
    })
  })

  describe('Property 33: Payment Audit Recording', () => {
    it('should record payment details in audit trail', async () => {
      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Payment Recording Test',
          category: 'Office Supplies',
          description: 'Test payment recording',
          estimatedCost: 500,
          currency: 'USD',
          urgencyLevel: 'MEDIUM',
          businessJustification: 'Test',
        },
        staffUserId,
        testDepartmentId
      )

      const paymentData = {
        amount: 500,
        paymentDate: new Date(),
        paymentMethod: 'Bank Transfer',
        paymentReference: 'REF-12345',
      }

      await AuditTrailService.recordPayment(
        requisition.id,
        financeUserId,
        paymentData
      )

      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisition.id)
      const paymentEntry = auditTrail.find(e => e.changeType === AuditChangeType.PAYMENT_RECORDED)

      expect(paymentEntry).toBeDefined()
      expect(paymentEntry?.userId).toBe(financeUserId)
      expect(paymentEntry?.newValue).toContain('Bank Transfer')
      expect(paymentEntry?.newValue).toContain('REF-12345')
    })
  })
})
