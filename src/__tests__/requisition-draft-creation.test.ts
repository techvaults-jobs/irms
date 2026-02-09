/**
 * Property Test: Requisition Draft Creation and Editability
 * Feature: irms
 * Property 1: Requisition Draft Creation and Editability
 * Validates: Requirements 1.3
 * 
 * For any staff member and any valid requisition data, saving a requisition as draft 
 * should create a record in Draft status that can be edited multiple times without 
 * changing the status until explicitly submitted.
 */

import bcrypt from 'bcryptjs'
import { RequisitionService } from '@/services/requisition.service'
import { RequisitionStatus } from '@/lib/status-transitions'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

describe('Property 1: Requisition Draft Creation and Editability', () => {
  let testUserId: string
  let testDepartmentId: string

  beforeAll(async () => {
    // Create test department
    const dept = await prisma.department.create({
      data: { name: `test-dept-${Date.now()}-${Math.random()}` },
    })
    testDepartmentId = dept.id

    // Create test user
    const hashedPassword = await bcrypt.hash('test@123', 10)
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}-${Math.random()}@example.com`,
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

  it('should create a requisition in Draft status with valid data', async () => {
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

    expect(requisition).toBeDefined()
    expect(requisition.status).toBe(RequisitionStatus.DRAFT)
    expect(requisition.title).toBe(requisitionData.title)
    expect(requisition.submitterId).toBe(testUserId)
    expect(requisition.departmentId).toBe(testDepartmentId)

    // Cleanup - skip due to immutable audit trails
  })

  it('should allow editing a draft requisition without changing status', async () => {
    const initialData = {
      title: 'Initial Title',
      category: 'Office Supplies',
      description: 'Initial description',
      estimatedCost: 100,
      currency: 'USD',
      urgencyLevel: 'MEDIUM' as const,
      businessJustification: 'Initial justification',
    }

    const requisition = await RequisitionService.createRequisition(
      initialData,
      testUserId,
      testDepartmentId
    )

    expect(requisition.status).toBe(RequisitionStatus.DRAFT)

    // Edit the requisition
    const updatedData = {
      title: 'Updated Title',
      estimatedCost: 200,
    }

    const updated = await RequisitionService.updateRequisition(
      requisition.id,
      updatedData
    )

    expect(updated.status).toBe(RequisitionStatus.DRAFT)
    expect(updated.title).toBe('Updated Title')
    expect(updated.estimatedCost).toEqual(new Decimal(200))

    // Cleanup - skip due to immutable audit trails
  })

  it('should allow multiple edits to a draft requisition', async () => {
    const initialData = {
      title: 'Initial Title',
      category: 'Office Supplies',
      description: 'Initial description',
      estimatedCost: 100,
      currency: 'USD',
      urgencyLevel: 'MEDIUM' as const,
      businessJustification: 'Initial justification',
    }

    const requisition = await RequisitionService.createRequisition(
      initialData,
      testUserId,
      testDepartmentId
    )

    // First edit
    const firstUpdate = await RequisitionService.updateRequisition(
      requisition.id,
      { title: 'First Update' }
    )
    expect(firstUpdate.status).toBe(RequisitionStatus.DRAFT)
    expect(firstUpdate.title).toBe('First Update')

    // Second edit
    const secondUpdate = await RequisitionService.updateRequisition(
      requisition.id,
      { estimatedCost: 300 }
    )
    expect(secondUpdate.status).toBe(RequisitionStatus.DRAFT)
    expect(secondUpdate.estimatedCost).toEqual(new Decimal(300))

    // Third edit
    const thirdUpdate = await RequisitionService.updateRequisition(
      requisition.id,
      { category: 'Equipment' }
    )
    expect(thirdUpdate.status).toBe(RequisitionStatus.DRAFT)
    expect(thirdUpdate.category).toBe('Equipment')

    // Cleanup - skip due to immutable audit trails
  })

  it('should prevent editing a submitted requisition', async () => {
    const initialData = {
      title: 'Test Requisition',
      category: 'Office Supplies',
      description: 'Test description',
      estimatedCost: 100,
      currency: 'USD',
      urgencyLevel: 'MEDIUM' as const,
      businessJustification: 'Test justification',
    }

    const requisition = await RequisitionService.createRequisition(
      initialData,
      testUserId,
      testDepartmentId
    )

    // Submit the requisition
    await RequisitionService.submitRequisition(requisition.id)

    // Try to edit - should fail
    await expect(
      RequisitionService.updateRequisition(requisition.id, { title: 'New Title' })
    ).rejects.toThrow('Can only update requisitions in Draft status')

    // Cleanup - skip due to immutable audit trails
  })

  it('should preserve all fields when editing a draft requisition', async () => {
    const initialData = {
      title: 'Test Requisition',
      category: 'Office Supplies',
      description: 'Test description',
      estimatedCost: 100,
      currency: 'USD',
      urgencyLevel: 'HIGH' as const,
      businessJustification: 'Test justification',
    }

    const requisition = await RequisitionService.createRequisition(
      initialData,
      testUserId,
      testDepartmentId
    )

    // Edit only one field
    const updated = await RequisitionService.updateRequisition(
      requisition.id,
      { title: 'Updated Title' }
    )

    // Verify other fields are preserved
    expect(updated.title).toBe('Updated Title')
    expect(updated.category).toBe('Office Supplies')
    expect(updated.description).toBe('Test description')
    expect(updated.estimatedCost).toEqual(new Decimal(100))
    expect(updated.currency).toBe('USD')
    expect(updated.urgencyLevel).toBe('HIGH')
    expect(updated.businessJustification).toBe('Test justification')

    // Cleanup - skip due to immutable audit trails
  })
})
