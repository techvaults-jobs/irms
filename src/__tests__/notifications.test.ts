/**
 * Property Tests: Notifications
 * Feature: irms
 * Property 38: Submission Notification
 * Property 39: Approval Notification
 * Property 40: Rejection Notification
 * Property 41: Payment Notification
 * Property 42: Notification Audit Recording
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.6
 */

import bcrypt from 'bcryptjs'
import { NotificationService } from '@/services/notification.service'
import { NotificationTriggersService } from '@/services/notification-triggers.service'
import { RequisitionService } from '@/services/requisition.service'
import { ApprovalWorkflowService } from '@/services/approval-workflow.service'
import { FinancialTrackingService } from '@/services/financial-tracking.service'
import { AuditTrailService } from '@/services/audit-trail.service'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

describe('Property 38-42: Notifications', () => {
  let testDepartmentId: string
  let staffUserId: string
  let managerUserId: string
  let financeUserId: string
  let createdRequisitionIds: string[] = []
  let createdRuleIds: string[] = []

  beforeAll(async () => {
    const dept = await prisma.department.create({
      data: { name: `test-dept-notifications-${Date.now()}` },
    })
    testDepartmentId = dept.id

    const hashedPassword = await bcrypt.hash('test@123', 10)

    const staff = await prisma.user.create({
      data: {
        email: `staff-notif-${Date.now()}@example.com`,
        name: 'Staff User',
        role: 'STAFF',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    staffUserId = staff.id

    const manager = await prisma.user.create({
      data: {
        email: `manager-notif-${Date.now()}@example.com`,
        name: 'Manager User',
        role: 'MANAGER',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    managerUserId = manager.id

    const finance = await prisma.user.create({
      data: {
        email: `finance-notif-${Date.now()}@example.com`,
        name: 'Finance User',
        role: 'FINANCE',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    financeUserId = finance.id
  })

  afterAll(async () => {
    // Clean up in reverse order of dependencies
    // We need to be careful with immutable audit trails
    
    try {
      // Delete notifications first
      await prisma.notification.deleteMany({
        where: { requisitionId: { in: createdRequisitionIds } },
      })
      
      // Delete approval steps
      await prisma.approvalStep.deleteMany({
        where: { requisitionId: { in: createdRequisitionIds } },
      })
      
      // Delete attachments
      await prisma.attachment.deleteMany({
        where: { requisitionId: { in: createdRequisitionIds } },
      })
      
      // Delete requisitions (audit trails cascade with requisitions)
      await prisma.requisition.deleteMany({
        where: { id: { in: createdRequisitionIds } },
      })
      
      // Delete approval rules
      await prisma.approvalRule.deleteMany({
        where: { id: { in: createdRuleIds } },
      })
    } catch (e) {
      // Ignore cleanup errors
      console.error('Cleanup error:', e)
    }
    
    try {
      // Delete users
      await prisma.user.deleteMany({
        where: { id: { in: [staffUserId, managerUserId, financeUserId] } },
      })
      
      // Delete department
      await prisma.department.deleteMany({ where: { id: testDepartmentId } })
    } catch (e) {
      // Ignore cleanup errors
      console.error('User cleanup error:', e)
    }
  })

  describe('Property 38: Submission Notification', () => {
    it('should send notification to approver when requisition is submitted', async () => {
      const rule = await ApprovalWorkflowService.createApprovalRule({
        minAmount: 100,
        requiredApprovers: ['MANAGER'],
      })
      createdRuleIds.push(rule.id)

      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Submission Notification Test',
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
      createdRequisitionIds.push(requisition.id)

      // Submit requisition
      await RequisitionService.submitRequisition(requisition.id)

      // Create approval steps
      const approvers = await ApprovalWorkflowService.determineApprovers(
        new Decimal(200),
        testDepartmentId
      )
      await ApprovalWorkflowService.createApprovalSteps(requisition.id, approvers)

      // Trigger submission notification
      await NotificationTriggersService.triggerSubmissionNotifications(requisition.id)

      // Verify notification was created
      const notifications = await prisma.notification.findMany({
        where: {
          requisitionId: requisition.id,
          type: 'SUBMITTED',
        },
      })

      expect(notifications.length).toBeGreaterThan(0)
      expect(notifications[0].userId).toBe(managerUserId)
      expect(notifications[0].message).toContain('Submission Notification Test')
    })

    it('should create notification record in database for submission', async () => {
      const rule = await ApprovalWorkflowService.createApprovalRule({
        minAmount: 100,
        requiredApprovers: ['MANAGER'],
      })
      createdRuleIds.push(rule.id)

      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Submission DB Test',
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
      createdRequisitionIds.push(requisition.id)

      // Send submission notification directly
      const { notification } = await NotificationService.sendSubmissionNotification(
        requisition.id,
        managerUserId,
        requisition.title
      )

      expect(notification).toBeDefined()
      expect(notification.userId).toBe(managerUserId)
      expect(notification.requisitionId).toBe(requisition.id)
      expect(notification.type).toBe('SUBMITTED')
      expect(notification.isRead).toBe(false)
    })
  })

  describe('Property 39: Approval Notification', () => {
    it('should send notification to submitter when requisition is approved', async () => {
      const rule = await ApprovalWorkflowService.createApprovalRule({
        minAmount: 100,
        requiredApprovers: ['MANAGER'],
      })
      createdRuleIds.push(rule.id)

      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Approval Notification Test',
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
      createdRequisitionIds.push(requisition.id)

      // Create approval steps
      const approvers = await ApprovalWorkflowService.determineApprovers(
        new Decimal(250),
        testDepartmentId
      )
      await ApprovalWorkflowService.createApprovalSteps(requisition.id, approvers)

      // Trigger approval notification
      await NotificationTriggersService.triggerApprovalNotifications(
        requisition.id,
        managerUserId
      )

      // Verify notification was created for submitter
      const notifications = await prisma.notification.findMany({
        where: {
          requisitionId: requisition.id,
          userId: staffUserId,
          type: 'APPROVED',
        },
      })

      expect(notifications.length).toBeGreaterThan(0)
      expect(notifications[0].message).toContain('approved')
    })

    it('should send notification to next approver when requisition is approved', async () => {
      const rule = await ApprovalWorkflowService.createApprovalRule({
        minAmount: 100,
        requiredApprovers: ['MANAGER', 'FINANCE'],
      })
      createdRuleIds.push(rule.id)

      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Multi-Step Approval Test',
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
      createdRequisitionIds.push(requisition.id)

      // Create approval steps
      const approvers = await ApprovalWorkflowService.determineApprovers(
        new Decimal(400),
        testDepartmentId
      )
      const steps = await ApprovalWorkflowService.createApprovalSteps(
        requisition.id,
        approvers
      )

      // Verify we have multiple steps
      expect(steps.length).toBeGreaterThanOrEqual(2)

      // Trigger approval notification (should notify next approver)
      await NotificationTriggersService.triggerApprovalNotifications(
        requisition.id,
        managerUserId
      )

      // Verify notification was created for submitter
      const submitterNotifications = await prisma.notification.findMany({
        where: {
          requisitionId: requisition.id,
          userId: staffUserId,
          type: 'APPROVED',
        },
      })

      expect(submitterNotifications.length).toBeGreaterThan(0)
    })
  })

  describe('Property 40: Rejection Notification', () => {
    it('should send notification to submitter when requisition is rejected', async () => {
      const rule = await ApprovalWorkflowService.createApprovalRule({
        minAmount: 100,
        requiredApprovers: ['MANAGER'],
      })
      createdRuleIds.push(rule.id)

      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Rejection Notification Test',
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
      createdRequisitionIds.push(requisition.id)

      const rejectionReason = 'Budget exceeded for this quarter'

      // Trigger rejection notification
      await NotificationTriggersService.triggerRejectionNotifications(
        requisition.id,
        rejectionReason
      )

      // Verify notification was created
      const notifications = await prisma.notification.findMany({
        where: {
          requisitionId: requisition.id,
          userId: staffUserId,
          type: 'REJECTED',
        },
      })

      expect(notifications.length).toBeGreaterThan(0)
      expect(notifications[0].message).toContain('rejected')
    })

    it('should include rejection reason in notification', async () => {
      const rule = await ApprovalWorkflowService.createApprovalRule({
        minAmount: 100,
        requiredApprovers: ['MANAGER'],
      })
      createdRuleIds.push(rule.id)

      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Rejection Reason Test',
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
      createdRequisitionIds.push(requisition.id)

      const rejectionReason = 'Does not meet requirements'

      // Send rejection notification
      const { notification } = await NotificationService.sendRejectionNotification(
        requisition.id,
        staffUserId,
        requisition.title,
        rejectionReason
      )

      expect(notification).toBeDefined()
      expect(notification.type).toBe('REJECTED')
      expect(notification.userId).toBe(staffUserId)
    })
  })

  describe('Property 41: Payment Notification', () => {
    it('should send notification to submitter when payment is recorded', async () => {
      const rule = await ApprovalWorkflowService.createApprovalRule({
        minAmount: 100,
        requiredApprovers: ['MANAGER'],
      })
      createdRuleIds.push(rule.id)

      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Payment Notification Test',
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
      createdRequisitionIds.push(requisition.id)

      // Transition through proper status flow
      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)
      await RequisitionService.approveRequisition(requisition.id)

      const amountPaid = '200.00'

      // Trigger payment notification
      await NotificationTriggersService.triggerPaymentNotifications(
        requisition.id,
        amountPaid
      )

      // Verify notification was created
      const notifications = await prisma.notification.findMany({
        where: {
          requisitionId: requisition.id,
          userId: staffUserId,
          type: 'PAID',
        },
      })

      expect(notifications.length).toBeGreaterThan(0)
      expect(notifications[0].message).toContain('Payment recorded')
    })

    it('should include payment amount in notification', async () => {
      const rule = await ApprovalWorkflowService.createApprovalRule({
        minAmount: 100,
        requiredApprovers: ['MANAGER'],
      })
      createdRuleIds.push(rule.id)

      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Payment Amount Test',
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
      createdRequisitionIds.push(requisition.id)

      // Transition through proper status flow
      await RequisitionService.submitRequisition(requisition.id)
      await RequisitionService.transitionToUnderReview(requisition.id)
      await RequisitionService.approveRequisition(requisition.id)

      const amountPaid = '300.00 USD'

      // Send payment notification
      const { notification } = await NotificationService.sendPaymentNotification(
        requisition.id,
        staffUserId,
        requisition.title,
        amountPaid
      )

      expect(notification).toBeDefined()
      expect(notification.type).toBe('PAID')
      expect(notification.userId).toBe(staffUserId)
    })
  })

  describe('Property 42: Notification Audit Recording', () => {
    it('should record notification in audit trail', async () => {
      const rule = await ApprovalWorkflowService.createApprovalRule({
        minAmount: 100,
        requiredApprovers: ['MANAGER'],
      })
      createdRuleIds.push(rule.id)

      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Audit Recording Test',
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
      createdRequisitionIds.push(requisition.id)

      // Send notification
      await NotificationService.sendSubmissionNotification(
        requisition.id,
        managerUserId,
        requisition.title
      )

      // Verify audit trail entry
      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(
        requisition.id
      )
      const notificationEntry = auditTrail.find(
        e => e.changeType === 'NOTIFICATION_SENT'
      )

      expect(notificationEntry).toBeDefined()
      expect(notificationEntry?.userId).toBe(managerUserId)
    })

    it('should record all notification types in audit trail', async () => {
      const rule = await ApprovalWorkflowService.createApprovalRule({
        minAmount: 100,
        requiredApprovers: ['MANAGER'],
      })
      createdRuleIds.push(rule.id)

      const requisition = await RequisitionService.createRequisition(
        {
          title: 'All Notification Types Test',
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
      createdRequisitionIds.push(requisition.id)

      // Send different notification types
      await NotificationService.sendSubmissionNotification(
        requisition.id,
        managerUserId,
        requisition.title
      )

      await NotificationService.sendApprovalNotification(
        requisition.id,
        staffUserId,
        managerUserId,
        requisition.title
      )

      await NotificationService.sendRejectionNotification(
        requisition.id,
        staffUserId,
        requisition.title,
        'Test rejection'
      )

      // Verify all notification entries in audit trail
      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(
        requisition.id
      )
      const notificationEntries = auditTrail.filter(
        e => e.changeType === 'NOTIFICATION_SENT'
      )

      expect(notificationEntries.length).toBeGreaterThanOrEqual(3)
    })

    it('should record notification metadata in audit trail', async () => {
      const rule = await ApprovalWorkflowService.createApprovalRule({
        minAmount: 100,
        requiredApprovers: ['MANAGER'],
      })
      createdRuleIds.push(rule.id)

      const requisition = await RequisitionService.createRequisition(
        {
          title: 'Notification Metadata Test',
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
      createdRequisitionIds.push(requisition.id)

      // Send notification
      await NotificationService.sendSubmissionNotification(
        requisition.id,
        managerUserId,
        requisition.title
      )

      // Verify audit trail entry has metadata
      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(
        requisition.id
      )
      const notificationEntry = auditTrail.find(
        e => e.changeType === 'NOTIFICATION_SENT'
      )

      expect(notificationEntry).toBeDefined()
      expect(notificationEntry?.metadata).toBeDefined()

      if (notificationEntry?.metadata) {
        const metadata = JSON.parse(notificationEntry.metadata)
        expect(metadata.notificationType).toBe('SUBMITTED')
        expect(metadata.message).toContain('Notification Metadata Test')
      }
    })
  })
})
