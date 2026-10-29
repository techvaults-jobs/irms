/**
 * Tests: Self-registration with admin approval
 *
 * Staff can register themselves; the account stays PENDING and inactive
 * until an admin approves it (assigning a role) or rejects it with a reason.
 */

import bcrypt from 'bcryptjs'
import { AccountExistsError, UserService } from '@/services/user.service'
import { changePasswordSchema, registerUserSchema } from '@/lib/validation-schemas'
import { prisma } from '@/lib/prisma'

const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

describe('Account approval workflow', () => {
  let departmentId: string
  let otherDepartmentId: string
  let adminId: string
  const createdUserIds: string[] = []

  const register = async (overrides: Partial<{ email: string; password: string }> = {}) => {
    const user = await UserService.registerUser({
      email: overrides.email ?? `applicant-${unique()}@example.com`,
      name: 'Applicant Person',
      password: overrides.password ?? 'Secret123',
      departmentId,
      jobTitle: 'Analyst',
    })
    createdUserIds.push(user.id)
    return user
  }

  beforeAll(async () => {
    const [dept, other] = await Promise.all([
      prisma.department.create({ data: { name: `acct-dept-${unique()}` } }),
      prisma.department.create({ data: { name: `acct-dept-${unique()}` } }),
    ])
    departmentId = dept.id
    otherDepartmentId = other.id
    const admin = await prisma.user.create({
      data: {
        email: `acct-admin-${unique()}@example.com`,
        name: 'Account Admin',
        password: await bcrypt.hash('Admin1234', 4),
        role: 'ADMIN',
        departmentId,
      },
    })
    adminId = admin.id
    createdUserIds.push(admin.id)
  })

  afterAll(async () => {
    await prisma.user.updateMany({ where: { id: { in: createdUserIds } }, data: { reviewedById: null } })
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
    await prisma.department.deleteMany({ where: { id: { in: [departmentId, otherDepartmentId] } } })
  })

  describe('registration', () => {
    it('creates a pending, inactive STAFF account with a hashed password', async () => {
      const user = await register({ password: 'Secret123' })
      const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })

      expect(stored.accountStatus).toBe('PENDING')
      expect(stored.isActive).toBe(false)
      expect(stored.role).toBe('STAFF')
      expect(stored.jobTitle).toBe('Analyst')
      expect(stored.password).not.toBe('Secret123')
      expect(await bcrypt.compare('Secret123', stored.password)).toBe(true)
    })

    it('never returns the password hash', async () => {
      const user = await register()
      expect(user).not.toHaveProperty('password')
    })

    it('rejects a second registration while one is pending', async () => {
      const email = `dup-${unique()}@example.com`
      await register({ email })
      await expect(register({ email })).rejects.toThrow(AccountExistsError)
    })

    it('rejects registration for an email that already has an approved account', async () => {
      const email = `existing-${unique()}@example.com`
      const user = await register({ email })
      await UserService.approveAccount(user.id, adminId, { role: 'STAFF' })
      await expect(register({ email: email.toUpperCase() })).rejects.toThrow('already exists')
    })

    it('lets a rejected applicant apply again, resetting the review', async () => {
      const email = `retry-${unique()}@example.com`
      const first = await register({ email })
      await UserService.rejectAccount(first.id, adminId, 'Incomplete details')

      const second = await UserService.registerUser({
        email,
        name: 'Applicant Again',
        password: 'NewSecret456',
        departmentId,
      })

      expect(second.id).toBe(first.id)
      expect(second.accountStatus).toBe('PENDING')
      expect(second.rejectionReason).toBeNull()
      expect(second.reviewedAt).toBeNull()
      expect(second.name).toBe('Applicant Again')
    })
  })

  describe('validation schema', () => {
    const valid = { email: 'Person@Example.com', name: 'Person', password: 'abc12345', departmentId: 'dept' }

    it('accepts a valid payload and lowercases the email', () => {
      const parsed = registerUserSchema.parse(valid)
      expect(parsed.email).toBe('person@example.com')
    })

    it.each([
      ['too short', 'ab1'],
      ['no number', 'abcdefgh'],
      ['no letter', '12345678'],
    ])('rejects a password that is %s', (_label, password) => {
      expect(registerUserSchema.safeParse({ ...valid, password }).success).toBe(false)
    })

    it('rejects a phone number with letters', () => {
      expect(registerUserSchema.safeParse({ ...valid, phone: 'call me' }).success).toBe(false)
    })
  })

  describe('admin review', () => {
    it('approves with the chosen role and department, activating the account', async () => {
      const user = await register()
      const approved = await UserService.approveAccount(user.id, adminId, { role: 'MANAGER', departmentId: otherDepartmentId })

      expect(approved.accountStatus).toBe('APPROVED')
      expect(approved.isActive).toBe(true)
      expect(approved.role).toBe('MANAGER')
      expect(approved.departmentId).toBe(otherDepartmentId)
      expect(approved.reviewedBy?.id).toBe(adminId)
      expect(approved.reviewedAt).not.toBeNull()
    })

    it('refuses to approve an account twice', async () => {
      const user = await register()
      await UserService.approveAccount(user.id, adminId, { role: 'STAFF' })
      await expect(UserService.approveAccount(user.id, adminId, { role: 'STAFF' })).rejects.toThrow('already approved')
    })

    it('rejects with a reason and keeps the account inactive', async () => {
      const user = await register()
      const rejected = await UserService.rejectAccount(user.id, adminId, 'Not a staff member')

      expect(rejected.accountStatus).toBe('REJECTED')
      expect(rejected.isActive).toBe(false)
      expect(rejected.rejectionReason).toBe('Not a staff member')
    })

    it('only rejects pending registrations', async () => {
      const user = await register()
      await UserService.approveAccount(user.id, adminId, { role: 'STAFF' })
      await expect(UserService.rejectAccount(user.id, adminId, 'Too late')).rejects.toThrow('Only pending')
    })

    it('allows approving a previously rejected request', async () => {
      const user = await register()
      await UserService.rejectAccount(user.id, adminId, 'Mistake')
      const approved = await UserService.approveAccount(user.id, adminId, { role: 'FINANCE' })
      expect(approved.accountStatus).toBe('APPROVED')
      expect(approved.rejectionReason).toBeNull()
    })
  })

  describe('approval cannot be bypassed', () => {
    it('blocks activating a pending account through a generic update', async () => {
      const user = await register()
      await expect(UserService.updateUser(user.id, { isActive: true }, adminId)).rejects.toThrow('Approve this registration')
    })

    it('blocks activateUser on a pending account', async () => {
      const user = await register()
      await expect(UserService.activateUser(user.id, adminId)).rejects.toThrow('Approve this registration')
    })
  })

  describe('listing and stats', () => {
    it('filters by account status and searches by name or email', async () => {
      const email = `findme-${unique()}@example.com`
      await register({ email })

      const { users } = await UserService.listUsers(0, 50, { accountStatus: 'PENDING', search: email.slice(0, 20) })

      expect(users.some(u => u.email === email)).toBe(true)
      expect(users.every(u => u.accountStatus === 'PENDING')).toBe(true)
      expect(users[0]).not.toHaveProperty('password')
    })

    it('counts pending registrations', async () => {
      const before = await UserService.getAccountStats()
      await register()
      const after = await UserService.getAccountStats()
      expect(after.pending).toBe(before.pending + 1)
      expect(after.total).toBe(before.total + 1)
    })
  })
})

describe('Permanent user deletion and password change', () => {
  let departmentId: string
  let adminId: string
  const cleanup: string[] = []

  const makeUser = async (role: 'STAFF' | 'ADMIN' = 'STAFF', password = 'Original123') => {
    const user = await prisma.user.create({
      data: {
        email: `del-${unique()}@example.com`,
        name: 'Disposable User',
        password: await bcrypt.hash(password, 4),
        role,
        departmentId,
      },
    })
    cleanup.push(user.id)
    return user
  }

  beforeAll(async () => {
    departmentId = (await prisma.department.create({ data: { name: `del-dept-${unique()}` } })).id
    adminId = (await makeUser('ADMIN')).id
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: cleanup } } })
    await prisma.department.deleteMany({ where: { id: departmentId } })
  })

  it('deletes a user together with their requisitions and audit trail', async () => {
    const staff = await makeUser()
    const requisition = await prisma.requisition.create({
      data: {
        title: 'To be deleted',
        category: 'Test',
        description: 'x',
        estimatedCost: 100,
        businessJustification: 'x',
        submitterId: staff.id,
        departmentId,
      },
    })
    await prisma.auditTrail.create({
      data: { requisitionId: requisition.id, userId: staff.id, changeType: 'CREATED' },
    })

    const impact = await UserService.getDeletionImpact(staff.id)
    expect(impact.requisitions).toBe(1)

    const result = await UserService.deleteUserPermanently(staff.id, adminId)

    expect(result.requisitions).toBe(1)
    expect(await prisma.user.findUnique({ where: { id: staff.id } })).toBeNull()
    expect(await prisma.requisition.findUnique({ where: { id: requisition.id } })).toBeNull()
    expect(await prisma.auditTrail.count({ where: { userId: staff.id } })).toBe(0)
  })

  it('keeps audit trail rows protected outside a permanent delete', async () => {
    const staff = await makeUser()
    const requisition = await prisma.requisition.create({
      data: { title: 'Kept', category: 'Test', description: 'x', estimatedCost: 1, businessJustification: 'x', submitterId: staff.id, departmentId },
    })
    await prisma.auditTrail.create({ data: { requisitionId: requisition.id, userId: staff.id, changeType: 'CREATED' } })

    await expect(prisma.auditTrail.deleteMany({ where: { userId: staff.id } })).rejects.toThrow('immutable')

    await UserService.deleteUserPermanently(staff.id, adminId)
  })

  it('refuses to delete your own account', async () => {
    await expect(UserService.deleteUserPermanently(adminId, adminId)).rejects.toThrow('your own account')
  })

  it('refuses to delete the last active admin', async () => {
    const otherAdmin = await makeUser('ADMIN')
    const activeAdmins = await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true, accountStatus: 'APPROVED', id: { not: otherAdmin.id } },
      select: { id: true },
    })
    // Temporarily make otherAdmin the only active admin
    await prisma.user.updateMany({ where: { id: { in: activeAdmins.map(a => a.id) } }, data: { isActive: false } })
    try {
      await expect(UserService.deleteUserPermanently(otherAdmin.id, adminId)).rejects.toThrow('last active admin')
    } finally {
      await prisma.user.updateMany({ where: { id: { in: activeAdmins.map(a => a.id) } }, data: { isActive: true } })
    }
  })

  it('changes the password when the current one is correct', async () => {
    const staff = await makeUser('STAFF', 'Original123')
    await UserService.changePassword(staff.id, 'Original123', 'Brandnew456')
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: staff.id } })
    expect(await bcrypt.compare('Brandnew456', stored.password)).toBe(true)
  })

  it('rejects a wrong current password and leaves the password unchanged', async () => {
    const staff = await makeUser('STAFF', 'Original123')
    await expect(UserService.changePassword(staff.id, 'Wrong12345', 'Brandnew456')).rejects.toThrow('incorrect')
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: staff.id } })
    expect(await bcrypt.compare('Original123', stored.password)).toBe(true)
  })

  it('requires a different, policy-compliant new password', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: 'Same12345', newPassword: 'Same12345' }).success).toBe(false)
    expect(changePasswordSchema.safeParse({ currentPassword: 'Old12345', newPassword: 'short1' }).success).toBe(false)
    expect(changePasswordSchema.safeParse({ currentPassword: 'Old12345', newPassword: 'Newer12345' }).success).toBe(true)
  })
})
