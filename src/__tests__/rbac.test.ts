/**
 * Property Tests: Role-Based Access Control
 * Feature: irms
 * Property 34: Role-Based Feature Access
 * Property 35: Unauthorized Access Denial
 * Validates: Requirements 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 *
 * Property 34: For any user with a specific role, the system should display only 
 * features and data appropriate to that role. Staff should see requisition creation 
 * and their own requisitions. Managers should see assigned requisitions for approval 
 * and department spending. Finance should see approved requisitions and payment 
 * recording. Admins should see all features.
 *
 * Property 35: For any user attempting to access data or perform an action outside 
 * their role, the system should deny access and display an error message.
 */

import bcrypt from 'bcryptjs'
import {
  hasPermission,
  hasFeature,
  canAccessRequisition,
  canPerformAction,
  rolePermissions,
  roleFeatures,
} from '@/lib/rbac'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { RequisitionService } from '@/services/requisition.service'

describe('Property 34: Role-Based Feature Access', () => {
  let testDepartmentId: string
  let staffUserId: string
  let managerUserId: string
  let financeUserId: string
  let adminUserId: string

  beforeAll(async () => {
    const dept = await prisma.department.create({
      data: { name: `test-dept-${Date.now()}` },
    })
    testDepartmentId = dept.id

    const hashedPassword = await bcrypt.hash('test@123', 10)

    const staff = await prisma.user.create({
      data: {
        email: `staff-${Date.now()}@example.com`,
        name: 'Staff User',
        role: 'STAFF',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    staffUserId = staff.id

    const manager = await prisma.user.create({
      data: {
        email: `manager-${Date.now()}@example.com`,
        name: 'Manager User',
        role: 'MANAGER',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    managerUserId = manager.id

    const finance = await prisma.user.create({
      data: {
        email: `finance-${Date.now()}@example.com`,
        name: 'Finance User',
        role: 'FINANCE',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    financeUserId = finance.id

    const admin = await prisma.user.create({
      data: {
        email: `admin-${Date.now()}@example.com`,
        name: 'Admin User',
        role: 'ADMIN',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    adminUserId = admin.id
  })

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: [staffUserId, managerUserId, financeUserId, adminUserId] } },
    })
    await prisma.department.deleteMany({ where: { id: testDepartmentId } })
  })

  it('should grant staff only requisition creation and own requisition viewing', () => {
    const staffPermissions = rolePermissions.STAFF
    expect(staffPermissions).toContain('create_requisition')
    expect(staffPermissions).toContain('view_own_requisitions')
    expect(staffPermissions).not.toContain('approve_requisition')
    expect(staffPermissions).not.toContain('record_payment')
    expect(staffPermissions).not.toContain('manage_users')
  })

  it('should grant manager approval and department report permissions', () => {
    const managerPermissions = rolePermissions.MANAGER
    expect(managerPermissions).toContain('approve_requisition')
    expect(managerPermissions).toContain('reject_requisition')
    expect(managerPermissions).toContain('view_all_requisitions')
    expect(managerPermissions).toContain('view_department_reports')
    expect(managerPermissions).not.toContain('record_payment')
    expect(managerPermissions).not.toContain('manage_users')
  })

  it('should grant finance payment and audit trail permissions', () => {
    const financePermissions = rolePermissions.FINANCE
    expect(financePermissions).toContain('record_payment')
    expect(financePermissions).toContain('view_audit_trail')
    expect(financePermissions).toContain('generate_reports')
    expect(financePermissions).toContain('view_all_requisitions')
    expect(financePermissions).not.toContain('approve_requisition')
    expect(financePermissions).not.toContain('manage_users')
  })

  it('should grant admin all permissions', () => {
    const adminPermissions = rolePermissions.ADMIN
    expect(adminPermissions).toContain('create_requisition')
    expect(adminPermissions).toContain('view_all_requisitions')
    expect(adminPermissions).toContain('approve_requisition')
    expect(adminPermissions).toContain('reject_requisition')
    expect(adminPermissions).toContain('record_payment')
    expect(adminPermissions).toContain('view_audit_trail')
    expect(adminPermissions).toContain('manage_users')
    expect(adminPermissions).toContain('manage_approval_rules')
    expect(adminPermissions).toContain('generate_reports')
  })

  it('should grant staff only appropriate features', () => {
    const staffFeatures = roleFeatures.STAFF
    expect(staffFeatures).toContain('requisition_creation')
    expect(staffFeatures).toContain('requisition_view_own')
    expect(staffFeatures).not.toContain('approval_queue')
    expect(staffFeatures).not.toContain('payment_recording')
    expect(staffFeatures).not.toContain('user_management')
  })

  it('should grant manager appropriate features', () => {
    const managerFeatures = roleFeatures.MANAGER
    expect(managerFeatures).toContain('requisition_view_all')
    expect(managerFeatures).toContain('approval_queue')
    expect(managerFeatures).toContain('department_reports')
    expect(managerFeatures).not.toContain('payment_recording')
    expect(managerFeatures).not.toContain('user_management')
  })

  it('should grant finance appropriate features', () => {
    const financeFeatures = roleFeatures.FINANCE
    expect(financeFeatures).toContain('requisition_view_all')
    expect(financeFeatures).toContain('payment_recording')
    expect(financeFeatures).toContain('audit_trail')
    expect(financeFeatures).toContain('financial_reports')
    expect(financeFeatures).not.toContain('approval_queue')
    expect(financeFeatures).not.toContain('user_management')
  })

  it('should grant admin all features', () => {
    const adminFeatures = roleFeatures.ADMIN
    expect(adminFeatures).toContain('requisition_creation')
    expect(adminFeatures).toContain('requisition_view_all')
    expect(adminFeatures).toContain('approval_queue')
    expect(adminFeatures).toContain('payment_recording')
    expect(adminFeatures).toContain('audit_trail')
    expect(adminFeatures).toContain('user_management')
    expect(adminFeatures).toContain('approval_rules')
    expect(adminFeatures).toContain('all_reports')
  })

  it('should verify hasFeature works correctly for each role', () => {
    // Staff features
    expect(hasFeature('STAFF', 'requisition_creation')).toBe(true)
    expect(hasFeature('STAFF', 'approval_queue')).toBe(false)

    // Manager features
    expect(hasFeature('MANAGER', 'approval_queue')).toBe(true)
    expect(hasFeature('MANAGER', 'payment_recording')).toBe(false)

    // Finance features
    expect(hasFeature('FINANCE', 'payment_recording')).toBe(true)
    expect(hasFeature('FINANCE', 'user_management')).toBe(false)

    // Admin features
    expect(hasFeature('ADMIN', 'user_management')).toBe(true)
    expect(hasFeature('ADMIN', 'approval_rules')).toBe(true)
  })

  it('should verify hasPermission works correctly for each role', () => {
    // Staff permissions
    expect(hasPermission('STAFF', 'create_requisition')).toBe(true)
    expect(hasPermission('STAFF', 'approve_requisition')).toBe(false)

    // Manager permissions
    expect(hasPermission('MANAGER', 'approve_requisition')).toBe(true)
    expect(hasPermission('MANAGER', 'record_payment')).toBe(false)

    // Finance permissions
    expect(hasPermission('FINANCE', 'record_payment')).toBe(true)
    expect(hasPermission('FINANCE', 'manage_users')).toBe(false)

    // Admin permissions
    expect(hasPermission('ADMIN', 'manage_users')).toBe(true)
    expect(hasPermission('ADMIN', 'manage_approval_rules')).toBe(true)
  })
})

describe('Property 35: Unauthorized Access Denial', () => {
  let testDepartmentId: string
  let staffUserId: string
  let managerUserId: string
  let financeUserId: string
  let adminUserId: string
  let staffRequisitionId: string

  beforeAll(async () => {
    const dept = await prisma.department.create({
      data: { name: `test-dept-${Date.now()}` },
    })
    testDepartmentId = dept.id

    const hashedPassword = await bcrypt.hash('test@123', 10)

    const staff = await prisma.user.create({
      data: {
        email: `staff-${Date.now()}@example.com`,
        name: 'Staff User',
        role: 'STAFF',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    staffUserId = staff.id

    const manager = await prisma.user.create({
      data: {
        email: `manager-${Date.now()}@example.com`,
        name: 'Manager User',
        role: 'MANAGER',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    managerUserId = manager.id

    const finance = await prisma.user.create({
      data: {
        email: `finance-${Date.now()}@example.com`,
        name: 'Finance User',
        role: 'FINANCE',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    financeUserId = finance.id

    const admin = await prisma.user.create({
      data: {
        email: `admin-${Date.now()}@example.com`,
        name: 'Admin User',
        role: 'ADMIN',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    adminUserId = admin.id

    // Create a requisition for testing access control
    const requisition = await RequisitionService.createRequisition(
      {
        title: 'Access Control Test',
        category: 'Office Supplies',
        description: 'Test',
        estimatedCost: 100,
        currency: 'USD',
        urgencyLevel: 'MEDIUM',
        businessJustification: 'Test',
      },
      staffUserId,
      testDepartmentId
    )
    staffRequisitionId = requisition.id
  })

  afterAll(async () => {
    await prisma.requisition.deleteMany({ where: { id: staffRequisitionId } })
    await prisma.user.deleteMany({
      where: { id: { in: [staffUserId, managerUserId, financeUserId, adminUserId] } },
    })
    await prisma.department.deleteMany({ where: { id: testDepartmentId } })
  })

  it('should deny staff from approving requisitions', () => {
    expect(hasPermission('STAFF', 'approve_requisition')).toBe(false)
    expect(canPerformAction('STAFF', 'approve')).toBe(false)
  })

  it('should deny staff from recording payments', () => {
    expect(hasPermission('STAFF', 'record_payment')).toBe(false)
    expect(canPerformAction('STAFF', 'record_payment')).toBe(false)
  })

  it('should deny staff from viewing audit trail', () => {
    expect(hasPermission('STAFF', 'view_audit_trail')).toBe(false)
    expect(canPerformAction('STAFF', 'view_audit')).toBe(false)
  })

  it('should deny staff from managing users', () => {
    expect(hasPermission('STAFF', 'manage_users')).toBe(false)
  })

  it('should deny manager from recording payments', () => {
    expect(hasPermission('MANAGER', 'record_payment')).toBe(false)
    expect(canPerformAction('MANAGER', 'record_payment')).toBe(false)
  })

  it('should deny manager from viewing audit trail', () => {
    expect(hasPermission('MANAGER', 'view_audit_trail')).toBe(false)
    expect(canPerformAction('MANAGER', 'view_audit')).toBe(false)
  })

  it('should deny manager from managing users', () => {
    expect(hasPermission('MANAGER', 'manage_users')).toBe(false)
  })

  it('should deny finance from approving requisitions', () => {
    expect(hasPermission('FINANCE', 'approve_requisition')).toBe(false)
    expect(canPerformAction('FINANCE', 'approve')).toBe(false)
  })

  it('should deny finance from managing users', () => {
    expect(hasPermission('FINANCE', 'manage_users')).toBe(false)
  })

  it('should deny finance from managing approval rules', () => {
    expect(hasPermission('FINANCE', 'manage_approval_rules')).toBe(false)
    expect(canPerformAction('FINANCE', 'manage_rules')).toBe(false)
  })

  it('should deny staff from accessing other staff requisitions', () => {
    const otherStaffId = 'other-staff-id'
    const canAccess = canAccessRequisition(
      'STAFF',
      testDepartmentId,
      testDepartmentId,
      staffUserId,
      otherStaffId
    )
    expect(canAccess).toBe(false)
  })

  it('should allow staff to access their own requisitions', () => {
    const canAccess = canAccessRequisition(
      'STAFF',
      testDepartmentId,
      testDepartmentId,
      staffUserId,
      staffUserId
    )
    expect(canAccess).toBe(true)
  })

  it('should allow manager to access requisitions from their department', () => {
    const canAccess = canAccessRequisition(
      'MANAGER',
      testDepartmentId,
      testDepartmentId,
      staffUserId,
      managerUserId
    )
    expect(canAccess).toBe(true)
  })

  it('should deny manager from accessing requisitions from other departments', () => {
    const otherDepartmentId = 'other-dept-id'
    const canAccess = canAccessRequisition(
      'MANAGER',
      testDepartmentId,
      otherDepartmentId,
      staffUserId,
      managerUserId
    )
    expect(canAccess).toBe(false)
  })

  it('should allow finance to access all requisitions', () => {
    const canAccess = canAccessRequisition(
      'FINANCE',
      testDepartmentId,
      testDepartmentId,
      staffUserId,
      financeUserId
    )
    expect(canAccess).toBe(true)
  })

  it('should allow admin to access all requisitions', () => {
    const canAccess = canAccessRequisition(
      'ADMIN',
      testDepartmentId,
      testDepartmentId,
      staffUserId,
      adminUserId
    )
    expect(canAccess).toBe(true)
  })

  it('should deny invalid actions for all roles', () => {
    expect(canPerformAction('STAFF', 'approve')).toBe(false)
    expect(canPerformAction('STAFF', 'record_payment')).toBe(false)
    expect(canPerformAction('MANAGER', 'record_payment')).toBe(false)
    expect(canPerformAction('FINANCE', 'approve')).toBe(false)
  })

  it('should allow admin to perform all actions', () => {
    expect(canPerformAction('ADMIN', 'approve')).toBe(true)
    expect(canPerformAction('ADMIN', 'reject')).toBe(true)
    expect(canPerformAction('ADMIN', 'record_payment')).toBe(true)
    expect(canPerformAction('ADMIN', 'view_audit')).toBe(true)
    expect(canPerformAction('ADMIN', 'manage_rules')).toBe(true)
  })
})
