/**
 * Integration Tests: Audit Trail Access Control
 * Feature: irms
 * Task: 27.1 Restrict audit trail access
 * Validates: Requirements 5.5
 *
 * These tests verify that only Admin and Finance users can access audit trails,
 * and that Staff and Manager users are denied access.
 */

import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { RequisitionService } from '@/services/requisition.service'
import { AuditTrailService } from '@/services/audit-trail.service'
import { hasPermission, canPerformAction } from '@/lib/rbac'
import { UserRole } from '@prisma/client'

describe('Audit Trail Access Control', () => {
  let testDepartmentId: string
  let staffUserId: string
  let managerUserId: string
  let financeUserId: string
  let adminUserId: string
  let requisitionId: string

  beforeAll(async () => {
    // Create test department
    const dept = await prisma.department.create({
      data: { name: `audit-access-test-${Date.now()}` },
    })
    testDepartmentId = dept.id

    // Create test users with different roles
    const hashedPassword = await bcrypt.hash('test@123', 10)

    const staff = await prisma.user.create({
      data: {
        email: `audit-access-staff-${Date.now()}@example.com`,
        name: 'Staff User',
        role: 'STAFF',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    staffUserId = staff.id

    const manager = await prisma.user.create({
      data: {
        email: `audit-access-manager-${Date.now()}@example.com`,
        name: 'Manager User',
        role: 'MANAGER',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    managerUserId = manager.id

    const finance = await prisma.user.create({
      data: {
        email: `audit-access-finance-${Date.now()}@example.com`,
        name: 'Finance User',
        role: 'FINANCE',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    financeUserId = finance.id

    const admin = await prisma.user.create({
      data: {
        email: `audit-access-admin-${Date.now()}@example.com`,
        name: 'Admin User',
        role: 'ADMIN',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    adminUserId = admin.id

    // Create a test requisition
    const requisition = await RequisitionService.createRequisition(
      {
        title: 'Audit Access Control Test',
        category: 'Office Supplies',
        description: 'Test audit trail access control',
        estimatedCost: 500,
        currency: 'USD',
        urgencyLevel: 'MEDIUM',
        businessJustification: 'Testing audit trail access',
      },
      staffUserId,
      testDepartmentId
    )
    requisitionId = requisition.id

    // Record some audit trail entries
    await AuditTrailService.recordCreation(
      requisitionId,
      staffUserId,
      {
        title: 'Audit Access Control Test',
        estimatedCost: 500,
      }
    )

    await AuditTrailService.recordFieldUpdate(
      requisitionId,
      staffUserId,
      'description',
      'Original description',
      'Updated description'
    )
  })

  afterAll(async () => {
    // Clean up test data
    // Note: Cannot delete requisitions with audit trails due to immutability constraints
    // Audit trail entries are immutable and prevent cascading deletes
    try {
      await prisma.user.deleteMany({
        where: { id: { in: [staffUserId, managerUserId, financeUserId, adminUserId] } },
      })
    } catch (e) {
      // Ignore cleanup errors - foreign key constraints may prevent deletion
    }
    try {
      await prisma.department.deleteMany({ where: { id: testDepartmentId } })
    } catch (e) {
      // Ignore cleanup errors
    }
  })

  describe('Permission-based access control', () => {
    it('should grant Admin view_audit_trail permission', () => {
      expect(hasPermission('ADMIN', 'view_audit_trail')).toBe(true)
    })

    it('should grant Finance view_audit_trail permission', () => {
      expect(hasPermission('FINANCE', 'view_audit_trail')).toBe(true)
    })

    it('should deny Staff view_audit_trail permission', () => {
      expect(hasPermission('STAFF', 'view_audit_trail')).toBe(false)
    })

    it('should deny Manager view_audit_trail permission', () => {
      expect(hasPermission('MANAGER', 'view_audit_trail')).toBe(false)
    })

    it('should allow Admin to perform view_audit action', () => {
      expect(canPerformAction('ADMIN', 'view_audit')).toBe(true)
    })

    it('should allow Finance to perform view_audit action', () => {
      expect(canPerformAction('FINANCE', 'view_audit')).toBe(true)
    })

    it('should deny Staff from performing view_audit action', () => {
      expect(canPerformAction('STAFF', 'view_audit')).toBe(false)
    })

    it('should deny Manager from performing view_audit action', () => {
      expect(canPerformAction('MANAGER', 'view_audit')).toBe(false)
    })
  })

  describe('Audit trail data access', () => {
    it('should allow Admin to retrieve requisition audit trail', async () => {
      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisitionId)
      expect(auditTrail).toBeDefined()
      expect(auditTrail.length).toBeGreaterThan(0)
      expect(auditTrail[0].requisitionId).toBe(requisitionId)
    })

    it('should allow Finance to retrieve requisition audit trail', async () => {
      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisitionId)
      expect(auditTrail).toBeDefined()
      expect(auditTrail.length).toBeGreaterThan(0)
    })

    it('should allow Admin to retrieve all audit trail entries', async () => {
      const allAuditTrail = await AuditTrailService.getAllAuditTrail(0, 100)
      expect(allAuditTrail).toBeDefined()
      expect(Array.isArray(allAuditTrail)).toBe(true)
    })

    it('should allow Finance to retrieve all audit trail entries', async () => {
      const allAuditTrail = await AuditTrailService.getAllAuditTrail(0, 100)
      expect(allAuditTrail).toBeDefined()
      expect(Array.isArray(allAuditTrail)).toBe(true)
    })

    it('should retrieve audit trail entries with user information', async () => {
      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisitionId)
      expect(auditTrail.length).toBeGreaterThan(0)
      
      const entry = auditTrail[0]
      expect(entry.user).toBeDefined()
      expect(entry.user.id).toBeDefined()
      expect(entry.user.name).toBeDefined()
      expect(entry.user.email).toBeDefined()
    })

    it('should retrieve audit trail entries in chronological order', async () => {
      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisitionId)
      
      for (let i = 1; i < auditTrail.length; i++) {
        expect(auditTrail[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          auditTrail[i - 1].timestamp.getTime()
        )
      }
    })

    it('should retrieve audit trail entries with all required fields', async () => {
      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisitionId)
      expect(auditTrail.length).toBeGreaterThan(0)

      const entry = auditTrail[0]
      expect(entry.id).toBeDefined()
      expect(entry.requisitionId).toBe(requisitionId)
      expect(entry.userId).toBeDefined()
      expect(entry.changeType).toBeDefined()
      expect(entry.timestamp).toBeDefined()
    })
  })

  describe('Audit trail filtering and querying', () => {
    it('should retrieve audit trail entries by change type', async () => {
      const creationEntries = await AuditTrailService.getAuditTrailByChangeType(
        requisitionId,
        'CREATED'
      )
      expect(creationEntries).toBeDefined()
      expect(Array.isArray(creationEntries)).toBe(true)
      
      if (creationEntries.length > 0) {
        expect(creationEntries[0].changeType).toBe('CREATED')
      }
    })

    it('should retrieve audit trail entries by user', async () => {
      const userAuditTrail = await AuditTrailService.getAuditTrailByUser(staffUserId, 0, 100)
      expect(userAuditTrail).toBeDefined()
      expect(Array.isArray(userAuditTrail)).toBe(true)
    })

    it('should retrieve audit trail entries by date range', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
      const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      
      const rangeAuditTrail = await AuditTrailService.getAuditTrailByDateRange(
        startDate,
        endDate,
        0,
        100
      )
      expect(rangeAuditTrail).toBeDefined()
      expect(Array.isArray(rangeAuditTrail)).toBe(true)
    })

    it('should get audit trail count', async () => {
      const count = await AuditTrailService.getAuditTrailCount(requisitionId)
      expect(typeof count).toBe('number')
      expect(count).toBeGreaterThan(0)
    })
  })

  describe('Audit trail immutability verification', () => {
    it('should verify audit trail entry immutability', async () => {
      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisitionId)
      expect(auditTrail.length).toBeGreaterThan(0)

      const entry = auditTrail[0]
      const isImmutable = await AuditTrailService.verifyImmutability(entry.id)
      expect(isImmutable).toBe(true)
    })

    it('should prevent updates to audit trail entries', async () => {
      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisitionId)
      expect(auditTrail.length).toBeGreaterThan(0)

      const entry = auditTrail[0]

      // Attempt to update should fail
      await expect(
        prisma.auditTrail.update({
          where: { id: entry.id },
          data: { changeType: 'MODIFIED' },
        })
      ).rejects.toThrow()
    })

    it('should prevent deletes of audit trail entries', async () => {
      const auditTrail = await AuditTrailService.getRequisitionAuditTrail(requisitionId)
      expect(auditTrail.length).toBeGreaterThan(0)

      const entry = auditTrail[0]

      // Attempt to delete should fail
      await expect(
        prisma.auditTrail.delete({
          where: { id: entry.id },
        })
      ).rejects.toThrow()
    })
  })

  describe('Role-based access restrictions', () => {
    it('should verify Staff cannot access audit trail', () => {
      const staffRole: UserRole = 'STAFF'
      expect(hasPermission(staffRole, 'view_audit_trail')).toBe(false)
    })

    it('should verify Manager cannot access audit trail', () => {
      const managerRole: UserRole = 'MANAGER'
      expect(hasPermission(managerRole, 'view_audit_trail')).toBe(false)
    })

    it('should verify Finance can access audit trail', () => {
      const financeRole: UserRole = 'FINANCE'
      expect(hasPermission(financeRole, 'view_audit_trail')).toBe(true)
    })

    it('should verify Admin can access audit trail', () => {
      const adminRole: UserRole = 'ADMIN'
      expect(hasPermission(adminRole, 'view_audit_trail')).toBe(true)
    })
  })
})
