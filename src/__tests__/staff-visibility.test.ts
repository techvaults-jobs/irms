/**
 * Property Test: Staff Requisition Visibility
 * Feature: irms
 * Property 4: Staff Requisition Visibility
 * Validates: Requirements 1.7
 * 
 * For any staff member, querying their requisition list should return only 
 * requisitions they created, and should not return requisitions created by 
 * other staff members.
 */

import bcrypt from 'bcryptjs'
import { RequisitionService } from '@/services/requisition.service'
import { prisma } from '@/lib/prisma'

describe('Property 4: Staff Requisition Visibility', () => {
  let testDepartmentId: string
  let staff1Id: string
  let staff2Id: string

  beforeAll(async () => {
    const dept = await prisma.department.create({
      data: { name: `test-dept-${Date.now()}-${Math.random()}` },
    })
    testDepartmentId = dept.id

    const hashedPassword = await bcrypt.hash('test@123', 10)

    const staff1 = await prisma.user.create({
      data: {
        email: `staff1-${Date.now()}-${Math.random()}@example.com`,
        name: 'Staff 1',
        role: 'STAFF',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    staff1Id = staff1.id

    const staff2 = await prisma.user.create({
      data: {
        email: `staff2-${Date.now()}-${Math.random()}@example.com`,
        name: 'Staff 2',
        role: 'STAFF',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    staff2Id = staff2.id
  })

  afterAll(async () => {
    // Cleanup - delete requisitions first (audit trails cascade)
    try {
      await prisma.requisition.deleteMany({ where: { submitterId: { in: [staff1Id, staff2Id] } } })
    } catch (e) {
      // Ignore cleanup errors due to immutable audit trails
    }
    
    try {
      await prisma.user.deleteMany({ where: { id: { in: [staff1Id, staff2Id] } } })
    } catch (e) {
      // Ignore cleanup errors
    }
    
    try {
      await prisma.department.deleteMany({ where: { id: testDepartmentId } })
    } catch (e) {
      // Ignore cleanup errors
    }
  })

  it('should return only requisitions created by the staff member', async () => {
    const requisitionData = {
      title: 'Staff 1 Requisition',
      category: 'Office Supplies',
      description: 'Test description',
      estimatedCost: 100,
      currency: 'USD',
      urgencyLevel: 'MEDIUM' as const,
      businessJustification: 'Test justification',
    }

    // Create requisition for staff1
    const staff1Req = await RequisitionService.createRequisition(
      requisitionData,
      staff1Id,
      testDepartmentId
    )

    // Create requisition for staff2
    const staff2Req = await RequisitionService.createRequisition(
      { ...requisitionData, title: 'Staff 2 Requisition' },
      staff2Id,
      testDepartmentId
    )

    // List requisitions for staff1
    const staff1List = await RequisitionService.listRequisitions({
      submitterId: staff1Id,
    })

    // Verify staff1 only sees their own requisition
    expect(staff1List.length).toBeGreaterThanOrEqual(1)
    expect(staff1List.some(r => r.id === staff1Req.id)).toBe(true)
    expect(staff1List.some(r => r.id === staff2Req.id)).toBe(false)

    // List requisitions for staff2
    const staff2List = await RequisitionService.listRequisitions({
      submitterId: staff2Id,
    })

    // Verify staff2 only sees their own requisition
    expect(staff2List.length).toBeGreaterThanOrEqual(1)
    expect(staff2List.some(r => r.id === staff2Req.id)).toBe(true)
    expect(staff2List.some(r => r.id === staff1Req.id)).toBe(false)

    // Cleanup - skip due to immutable audit trails
  })

  it('should not return other staff members requisitions when filtering by submitter', async () => {
    const requisitionData = {
      title: 'Visibility Test',
      category: 'Equipment',
      description: 'Test description',
      estimatedCost: 500,
      currency: 'USD',
      urgencyLevel: 'HIGH' as const,
      businessJustification: 'Test justification',
    }

    // Create multiple requisitions for staff1
    const req1 = await RequisitionService.createRequisition(
      requisitionData,
      staff1Id,
      testDepartmentId
    )

    const req2 = await RequisitionService.createRequisition(
      { ...requisitionData, title: 'Second Requisition' },
      staff1Id,
      testDepartmentId
    )

    // Create requisition for staff2
    const req3 = await RequisitionService.createRequisition(
      { ...requisitionData, title: 'Staff 2 Requisition' },
      staff2Id,
      testDepartmentId
    )

    // List only staff1's requisitions
    const staff1Requisitions = await RequisitionService.listRequisitions({
      submitterId: staff1Id,
    })

    // Verify all returned requisitions belong to staff1
    for (const req of staff1Requisitions) {
      expect(req.submitter.id).toBe(staff1Id)
    }

    // Verify staff2's requisition is not in the list
    expect(staff1Requisitions.some(r => r.id === req3.id)).toBe(false)

    // Cleanup - skip due to immutable audit trails
  })

  it('should return empty list when staff member has no requisitions', async () => {
    const hashedPassword = await bcrypt.hash('test@123', 10)
    const newStaff = await prisma.user.create({
      data: {
        email: `new-staff-${Date.now()}@example.com`,
        name: 'New Staff',
        role: 'STAFF',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })

    const requisitions = await RequisitionService.listRequisitions({
      submitterId: newStaff.id,
    })

    expect(requisitions.length).toBe(0)

    // Cleanup - skip due to immutable audit trails
  })

  it('should maintain visibility isolation across multiple queries', async () => {
    const requisitionData = {
      title: 'Isolation Test',
      category: 'Services',
      description: 'Test description',
      estimatedCost: 300,
      currency: 'USD',
      urgencyLevel: 'MEDIUM' as const,
      businessJustification: 'Test justification',
    }

    // Create requisitions
    const req1 = await RequisitionService.createRequisition(
      requisitionData,
      staff1Id,
      testDepartmentId
    )

    const req2 = await RequisitionService.createRequisition(
      { ...requisitionData, title: 'Second' },
      staff2Id,
      testDepartmentId
    )

    // Query staff1 multiple times
    const query1 = await RequisitionService.listRequisitions({
      submitterId: staff1Id,
    })
    const query2 = await RequisitionService.listRequisitions({
      submitterId: staff1Id,
    })

    // Both queries should return the same results
    expect(query1.some(r => r.id === req1.id)).toBe(true)
    expect(query1.some(r => r.id === req2.id)).toBe(false)
    expect(query2.some(r => r.id === req1.id)).toBe(true)
    expect(query2.some(r => r.id === req2.id)).toBe(false)

    // Cleanup - skip due to immutable audit trails
  })
})
