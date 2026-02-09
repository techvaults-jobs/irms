import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import { NotificationService } from '@/services/notification.service'
import { NotificationTriggersService } from '@/services/notification-triggers.service'
import { RequisitionService } from '@/services/requisition.service'
import { UserRole } from '@prisma/client'

describe('Notification System E2E', () => {
  let testUserId: string
  let testApproverId: string
  let testRequisitionId: string
  let testDepartmentId: string

  beforeAll(async () => {
    // Create test department
    const dept = await prisma.department.create({
      data: { name: `Test Dept ${Date.now()}` },
    })
    testDepartmentId = dept.id

    // Create test staff user
    const staffUser = await prisma.user.create({
      data: {
        email: `staff-${Date.now()}@test.com`,
        name: 'Test Staff',
        password: 'hashed_password',
        role: 'STAFF' as UserRole,
        departmentId: testDepartmentId,
      },
    })
    testUserId = staffUser.id

    // Create test manager user
    const managerUser = await prisma.user.create({
      data: {
        email: `manager-${Date.now()}@test.com`,
        name: 'Test Manager',
        password: 'hashed_password',
        role: 'MANAGER' as UserRole,
        departmentId: testDepartmentId,
      },
    })
    testApproverId = managerUser.id

    // Create test requisition
    const req = await prisma.requisition.create({
      data: {
        title: 'Test Requisition',
        category: 'Office Supplies',
        description: 'Test description',
        estimatedCost: 50000,
        currency: 'NGN',
        urgencyLevel: 'MEDIUM',
        businessJustification: 'Test justification',
        status: 'DRAFT',
        submitterId: testUserId,
        departmentId: testDepartmentId,
      },
    })
    testRequisitionId = req.id
  })

  afterAll(async () => {
    // Cleanup
    await prisma.notification.deleteMany({
      where: { requisitionId: testRequisitionId },
    })
    await prisma.requisition.delete({
      where: { id: testRequisitionId },
    })
    await prisma.user.deleteMany({
      where: { departmentId: testDepartmentId },
    })
    await prisma.department.delete({
      where: { id: testDepartmentId },
    })
  })

  it('should create a notification when requisition is submitted', async () => {
    // Submit requisition
    await RequisitionService.submitRequisition(testRequisitionId)

    // Trigger submission notifications
    await NotificationTriggersService.triggerSubmissionNotifications(testRequisitionId)

    // Check if notification was created
    const notifications = await prisma.notification.findMany({
      where: {
        requisitionId: testRequisitionId,
        type: 'SUBMITTED',
      },
    })

    expect(notifications.length).toBeGreaterThan(0)
    expect(notifications[0].message).toContain('Test Requisition')
  })

  it('should create a notification when requisition is approved', async () => {
    // Create approval step
    await prisma.approvalStep.create({
      data: {
        requisitionId: testRequisitionId,
        stepNumber: 1,
        requiredRole: 'MANAGER',
        assignedUserId: testApproverId,
        status: 'PENDING',
      },
    })

    // Approve requisition
    await RequisitionService.approveRequisition(testRequisitionId)

    // Trigger approval notifications
    await NotificationTriggersService.triggerApprovalNotifications(testRequisitionId, testApproverId)

    // Check if notification was created
    const notifications = await prisma.notification.findMany({
      where: {
        requisitionId: testRequisitionId,
        type: 'APPROVED',
      },
    })

    expect(notifications.length).toBeGreaterThan(0)
  })

  it('should create a notification when requisition is rejected', async () => {
    // Reject requisition
    await RequisitionService.rejectRequisition(testRequisitionId)

    // Trigger rejection notifications
    await NotificationTriggersService.triggerRejectionNotifications(
      testRequisitionId,
      'Test rejection reason'
    )

    // Check if notification was created
    const notifications = await prisma.notification.findMany({
      where: {
        requisitionId: testRequisitionId,
        type: 'REJECTED',
      },
    })

    expect(notifications.length).toBeGreaterThan(0)
    expect(notifications[0].message).toContain('rejected')
  })

  it('should create a notification when payment is recorded', async () => {
    // Trigger payment notifications
    await NotificationTriggersService.triggerPaymentNotifications(
      testRequisitionId,
      '₦50,000'
    )

    // Check if notification was created
    const notifications = await prisma.notification.findMany({
      where: {
        requisitionId: testRequisitionId,
        type: 'PAID',
      },
    })

    expect(notifications.length).toBeGreaterThan(0)
    expect(notifications[0].message).toContain('Payment recorded')
  })

  it('should mark notification as read', async () => {
    const notification = await prisma.notification.create({
      data: {
        userId: testUserId,
        requisitionId: testRequisitionId,
        type: 'SUBMITTED',
        message: 'Test notification',
        isRead: false,
      },
    })

    await NotificationService.markAsRead(notification.id)

    const updated = await prisma.notification.findUnique({
      where: { id: notification.id },
    })

    expect(updated?.isRead).toBe(true)
  })

  it('should get user notifications', async () => {
    const notifications = await NotificationService.getUserNotifications(testUserId)

    expect(Array.isArray(notifications)).toBe(true)
  })

  it('should get unread count', async () => {
    const count = await NotificationService.getUnreadCount(testUserId)

    expect(typeof count).toBe('number')
    expect(count).toBeGreaterThanOrEqual(0)
  })

  it('should mark all notifications as read', async () => {
    await NotificationService.markAllAsRead(testUserId)

    const unreadCount = await NotificationService.getUnreadCount(testUserId)

    expect(unreadCount).toBe(0)
  })

  it('should delete notification', async () => {
    const notification = await prisma.notification.create({
      data: {
        userId: testUserId,
        requisitionId: testRequisitionId,
        type: 'SUBMITTED',
        message: 'Test notification to delete',
        isRead: false,
      },
    })

    await NotificationService.deleteNotification(notification.id)

    const deleted = await prisma.notification.findUnique({
      where: { id: notification.id },
    })

    expect(deleted).toBeNull()
  })
})
