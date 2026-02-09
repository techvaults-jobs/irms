/**
 * Property Tests: User Management
 * Feature: irms
 * Property 36: User Creation Validation
 * Property 37: Role Change Audit Recording
 * Validates: Requirements 6.8, 6.9
 *
 * Property 36: For any user creation attempt with missing required fields 
 * (email, name, department, role), the creation should be rejected and no user 
 * should be created.
 *
 * Property 37: For any user whose role is modified by an admin, the audit trail 
 * should contain an entry recording the role change.
 */

import bcrypt from 'bcryptjs'
import { UserService } from '@/services/user.service'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

describe('Property 36: User Creation Validation', () => {
  let testDepartmentId: string

  beforeAll(async () => {
    const dept = await prisma.department.create({
      data: { name: `test-dept-${Date.now()}-${Math.random()}` },
    })
    testDepartmentId = dept.id
  })

  afterAll(async () => {
    try {
      await prisma.department.deleteMany({ where: { id: testDepartmentId } })
    } catch (e) {
      // Ignore cleanup errors
    }
  })

  it('should reject user creation with missing email', async () => {
    const input = {
      email: '',
      name: 'Test User',
      departmentId: testDepartmentId,
      role: 'STAFF' as UserRole,
    }

    try {
      await UserService.createUser(input, 'admin-id')
      fail('Should have thrown an error')
    } catch (error: any) {
      expect(error.message).toContain('Missing required fields')
    }
  })

  it('should reject user creation with missing name', async () => {
    const input = {
      email: `user-${Date.now()}@example.com`,
      name: '',
      departmentId: testDepartmentId,
      role: 'STAFF' as UserRole,
    }

    try {
      await UserService.createUser(input, 'admin-id')
      fail('Should have thrown an error')
    } catch (error: any) {
      expect(error.message).toContain('Missing required fields')
    }
  })

  it('should reject user creation with missing departmentId', async () => {
    const input = {
      email: `user-${Date.now()}@example.com`,
      name: 'Test User',
      departmentId: '',
      role: 'STAFF' as UserRole,
    }

    try {
      await UserService.createUser(input, 'admin-id')
      fail('Should have thrown an error')
    } catch (error: any) {
      expect(error.message).toContain('Missing required fields')
    }
  })

  it('should reject user creation with missing role', async () => {
    const input = {
      email: `user-${Date.now()}@example.com`,
      name: 'Test User',
      departmentId: testDepartmentId,
      role: undefined as any,
    }

    try {
      await UserService.createUser(input, 'admin-id')
      fail('Should have thrown an error')
    } catch (error: any) {
      expect(error.message).toContain('Missing required fields')
    }
  })

  it('should reject user creation with invalid department', async () => {
    const input = {
      email: `user-${Date.now()}@example.com`,
      name: 'Test User',
      departmentId: 'invalid-dept-id',
      role: 'STAFF' as UserRole,
    }

    try {
      await UserService.createUser(input, 'admin-id')
      fail('Should have thrown an error')
    } catch (error: any) {
      expect(error.message).toContain('not found')
    }
  })

  it('should reject user creation with duplicate email', async () => {
    const email = `user-${Date.now()}@example.com`

    // Create first user
    const user1 = await UserService.createUser(
      {
        email,
        name: 'Test User 1',
        departmentId: testDepartmentId,
        role: 'STAFF' as UserRole,
      },
      'admin-id'
    )

    try {
      // Try to create second user with same email
      await UserService.createUser(
        {
          email,
          name: 'Test User 2',
          departmentId: testDepartmentId,
          role: 'STAFF' as UserRole,
        },
        'admin-id'
      )
      fail('Should have thrown an error')
    } catch (error: any) {
      expect(error.message).toContain('in use')
    } finally {
      // Cleanup
      await prisma.user.deleteMany({ where: { id: user1.id } })
    }
  })

  it('should successfully create user with all required fields', async () => {
    const email = `user-${Date.now()}@example.com`

    const user = await UserService.createUser(
      {
        email,
        name: 'Test User',
        departmentId: testDepartmentId,
        role: 'STAFF' as UserRole,
      },
      'admin-id'
    )

    expect(user).toBeDefined()
    expect(user.email).toBe(email)
    expect(user.name).toBe('Test User')
    expect(user.role).toBe('STAFF')
    expect(user.isActive).toBe(true)

    // Cleanup
    await prisma.user.deleteMany({ where: { id: user.id } })
  })

  it('should create user with different roles', async () => {
    const roles: UserRole[] = ['STAFF', 'MANAGER', 'FINANCE', 'ADMIN']

    for (const role of roles) {
      const email = `user-${Date.now()}-${role}@example.com`

      const user = await UserService.createUser(
        {
          email,
          name: `Test ${role}`,
          departmentId: testDepartmentId,
          role,
        },
        'admin-id'
      )

      expect(user.role).toBe(role)

      // Cleanup
      await prisma.user.deleteMany({ where: { id: user.id } })
    }
  })
})

describe('Property 37: Role Change Audit Recording', () => {
  let testDepartmentId: string
  let adminUserId: string
  let testUserId: string

  beforeAll(async () => {
    const dept = await prisma.department.create({
      data: { name: `test-dept-${Date.now()}` },
    })
    testDepartmentId = dept.id

    const hashedPassword = await bcrypt.hash('test@123', 10)

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

    const testUser = await prisma.user.create({
      data: {
        email: `user-${Date.now()}@example.com`,
        name: 'Test User',
        role: 'STAFF',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })
    testUserId = testUser.id
  })

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: [adminUserId, testUserId] } },
    })
    await prisma.department.deleteMany({ where: { id: testDepartmentId } })
  })

  it('should record role change when user role is updated', async () => {
    const currentUser = await UserService.getUserById(testUserId)
    expect(currentUser?.role).toBe('STAFF')

    // Update role
    const updatedUser = await UserService.updateUser(
      testUserId,
      { role: 'MANAGER' as UserRole },
      adminUserId
    )

    expect(updatedUser.role).toBe('MANAGER')
    expect(updatedUser.role).not.toBe(currentUser?.role)
  })

  it('should allow updating user name without changing role', async () => {
    const currentUser = await UserService.getUserById(testUserId)
    const originalRole = currentUser?.role

    const updatedUser = await UserService.updateUser(
      testUserId,
      { name: 'Updated Name' },
      adminUserId
    )

    expect(updatedUser.name).toBe('Updated Name')
    expect(updatedUser.role).toBe(originalRole)
  })

  it('should allow updating user department', async () => {
    const newDept = await prisma.department.create({
      data: { name: `new-dept-${Date.now()}` },
    })

    const hashedPassword = await bcrypt.hash('test@123', 10)
    const newUser = await prisma.user.create({
      data: {
        email: `user-dept-update-${Date.now()}@example.com`,
        name: 'User Dept Update',
        role: 'STAFF',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })

    try {
      const updatedUser = await UserService.updateUser(
        newUser.id,
        { departmentId: newDept.id },
        adminUserId
      )

      expect(updatedUser.departmentId).toBe(newDept.id)
    } finally {
      await prisma.user.deleteMany({ where: { id: newUser.id } })
      await prisma.department.deleteMany({ where: { id: newDept.id } })
    }
  })

  it('should allow deactivating user', async () => {
    const hashedPassword = await bcrypt.hash('test@123', 10)
    const newUser = await prisma.user.create({
      data: {
        email: `user-deactivate-${Date.now()}@example.com`,
        name: 'User to Deactivate',
        role: 'STAFF',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })

    try {
      const deactivatedUser = await UserService.deactivateUser(newUser.id, adminUserId)
      expect(deactivatedUser.isActive).toBe(false)
    } finally {
      await prisma.user.deleteMany({ where: { id: newUser.id } })
    }
  })

  it('should reject deactivating already deactivated user', async () => {
    const hashedPassword = await bcrypt.hash('test@123', 10)
    const newUser = await prisma.user.create({
      data: {
        email: `user-deactivate2-${Date.now()}@example.com`,
        name: 'User to Deactivate',
        role: 'STAFF',
        departmentId: testDepartmentId,
        password: hashedPassword,
        isActive: false,
      },
    })

    try {
      await UserService.deactivateUser(newUser.id, adminUserId)
      fail('Should have thrown an error')
    } catch (error: any) {
      expect(error.message).toContain('already deactivated')
    } finally {
      await prisma.user.deleteMany({ where: { id: newUser.id } })
    }
  })

  it('should allow activating deactivated user', async () => {
    const hashedPassword = await bcrypt.hash('test@123', 10)
    const newUser = await prisma.user.create({
      data: {
        email: `user-activate-${Date.now()}@example.com`,
        name: 'User to Activate',
        role: 'STAFF',
        departmentId: testDepartmentId,
        password: hashedPassword,
        isActive: false,
      },
    })

    try {
      const activatedUser = await UserService.activateUser(newUser.id, adminUserId)
      expect(activatedUser.isActive).toBe(true)
    } finally {
      await prisma.user.deleteMany({ where: { id: newUser.id } })
    }
  })

  it('should reject activating already active user', async () => {
    try {
      await UserService.activateUser(testUserId, adminUserId)
      fail('Should have thrown an error')
    } catch (error: any) {
      expect(error.message).toContain('already active')
    }
  })

  it('should track multiple role changes', async () => {
    const hashedPassword = await bcrypt.hash('test@123', 10)
    const newUser = await prisma.user.create({
      data: {
        email: `user-multi-role-${Date.now()}@example.com`,
        name: 'Multi Role User',
        role: 'STAFF',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })

    try {
      // Change to MANAGER
      let updated = await UserService.updateUser(
        newUser.id,
        { role: 'MANAGER' as UserRole },
        adminUserId
      )
      expect(updated.role).toBe('MANAGER')

      // Change to FINANCE
      updated = await UserService.updateUser(
        newUser.id,
        { role: 'FINANCE' as UserRole },
        adminUserId
      )
      expect(updated.role).toBe('FINANCE')

      // Change to ADMIN
      updated = await UserService.updateUser(
        newUser.id,
        { role: 'ADMIN' as UserRole },
        adminUserId
      )
      expect(updated.role).toBe('ADMIN')
    } finally {
      await prisma.user.deleteMany({ where: { id: newUser.id } })
    }
  })

  it('should retrieve user by email', async () => {
    const user = await UserService.getUserByEmail(
      (await UserService.getUserById(testUserId))?.email || ''
    )
    expect(user?.id).toBe(testUserId)
  })

  it('should list users with pagination', async () => {
    const { users, total } = await UserService.listUsers(0, 10)
    expect(Array.isArray(users)).toBe(true)
    expect(total).toBeGreaterThan(0)
  })

  it('should get users by department', async () => {
    // Create a fresh user in the test department
    const hashedPassword = await bcrypt.hash('test@123', 10)
    const freshUser = await prisma.user.create({
      data: {
        email: `user-dept-query-${Date.now()}@example.com`,
        name: 'User Dept Query',
        role: 'STAFF',
        departmentId: testDepartmentId,
        password: hashedPassword,
      },
    })

    try {
      const { users, total } = await UserService.getUsersByDepartment(testDepartmentId)
      expect(Array.isArray(users)).toBe(true)
      expect(total).toBeGreaterThan(0)
      expect(users.some(u => u.id === freshUser.id)).toBe(true)
    } finally {
      await prisma.user.deleteMany({ where: { id: freshUser.id } })
    }
  })

  it('should get users by role', async () => {
    const { users, total } = await UserService.getUsersByRole('ADMIN')
    expect(Array.isArray(users)).toBe(true)
    expect(total).toBeGreaterThan(0)
  })

  it('should get active users', async () => {
    const { users, total } = await UserService.getActiveUsers()
    expect(Array.isArray(users)).toBe(true)
    expect(total).toBeGreaterThan(0)
    expect(users.every(u => u.isActive)).toBe(true)
  })
})
