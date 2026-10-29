import { prisma } from '@/lib/prisma'
import { AccountStatus, Prisma, UserRole } from '@prisma/client'
import { AuditTrailService } from './audit-trail.service'
import { ReferentialIntegrityChecker } from '@/lib/referential-integrity'
import { getUserDeletionImpact, purgeUsers } from './user-deletion'
import bcrypt from 'bcryptjs'

/**
 * Fields safe to return to clients — never includes the password hash.
 */
export const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  departmentId: true,
  department: { select: { id: true, name: true } },
  isActive: true,
  accountStatus: true,
  jobTitle: true,
  phone: true,
  reviewedAt: true,
  reviewedBy: { select: { id: true, name: true } },
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect

export interface RegisterUserInput {
  email: string
  name: string
  password: string
  departmentId: string
  jobTitle?: string
  phone?: string
}

export interface ListUsersFilters {
  accountStatus?: AccountStatus
  role?: UserRole
  search?: string
}

export class AccountExistsError extends Error {}
export class InvalidPasswordError extends Error {}

export interface CreateUserInput {
  email: string
  name: string
  departmentId: string
  role: UserRole
  password?: string
}

export interface UpdateUserInput {
  name?: string
  role?: UserRole
  departmentId?: string
  isActive?: boolean
}

export class UserService {
  /**
   * Create a new user
   */
  static async createUser(input: CreateUserInput, adminId: string) {
    // Validate required fields
    if (!input.email || !input.name || !input.departmentId || !input.role) {
      throw new Error('Missing required fields: email, name, departmentId, role')
    }

    // Validate referential integrity
    await ReferentialIntegrityChecker.validateEmailUnique(input.email)
    await ReferentialIntegrityChecker.validateDepartmentExists(input.departmentId)
    ReferentialIntegrityChecker.validateUserRole(input.role)

    // Generate a temporary password if not provided
    const password = input.password || `Temp${Date.now()}@123`
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        departmentId: input.departmentId,
        role: input.role,
        password: hashedPassword,
        isActive: true,
        accountStatus: 'APPROVED',
      },
      select: publicUserSelect,
    })

    return user
  }

  /**
   * Self-service registration. The account is created PENDING and inactive
   * until an admin approves it. A previously rejected email may re-apply.
   */
  static async registerUser(input: RegisterUserInput) {
    await ReferentialIntegrityChecker.validateDepartmentExists(input.departmentId)

    const existing = await prisma.user.findFirst({
      where: { email: { equals: input.email, mode: 'insensitive' } },
      select: { id: true, accountStatus: true },
    })

    if (existing && existing.accountStatus !== 'REJECTED') {
      throw new AccountExistsError(
        existing.accountStatus === 'PENDING'
          ? 'A registration for this email is already awaiting approval'
          : 'An account with this email already exists'
      )
    }

    const hashedPassword = await bcrypt.hash(input.password, 10)
    const data = {
      name: input.name,
      password: hashedPassword,
      departmentId: input.departmentId,
      jobTitle: input.jobTitle ?? null,
      phone: input.phone ?? null,
      role: 'STAFF' as UserRole,
      isActive: false,
      accountStatus: 'PENDING' as AccountStatus,
      reviewedById: null,
      reviewedAt: null,
      rejectionReason: null,
    }

    if (existing) {
      return prisma.user.update({
        where: { id: existing.id },
        data,
        select: publicUserSelect,
      })
    }

    return prisma.user.create({
      data: { ...data, email: input.email },
      select: publicUserSelect,
    })
  }

  /**
   * Approve a pending registration and grant access with the chosen role.
   */
  static async approveAccount(
    userId: string,
    adminId: string,
    options: { role: UserRole; departmentId?: string }
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new Error('User not found')
    }
    if (user.accountStatus === 'APPROVED') {
      throw new Error('Account is already approved')
    }

    ReferentialIntegrityChecker.validateUserRole(options.role)
    if (options.departmentId) {
      await ReferentialIntegrityChecker.validateDepartmentExists(options.departmentId)
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: 'APPROVED',
        isActive: true,
        role: options.role,
        ...(options.departmentId && { departmentId: options.departmentId }),
        reviewedById: adminId,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
      select: publicUserSelect,
    })
  }

  /**
   * Reject a pending registration. The user cannot sign in, but may re-apply.
   */
  static async rejectAccount(userId: string, adminId: string, reason: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new Error('User not found')
    }
    if (user.accountStatus !== 'PENDING') {
      throw new Error('Only pending registrations can be rejected')
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: 'REJECTED',
        isActive: false,
        reviewedById: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
      select: publicUserSelect,
    })
  }

  /**
   * Preview what permanently deleting a user would remove.
   */
  static async getDeletionImpact(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!user) {
      throw new Error('User not found')
    }
    const impact = await getUserDeletionImpact(prisma, [userId])
    return {
      requisitions: impact.requisitions,
      attachments: impact.attachments.length,
      authoredAuditEntries: impact.authoredAuditEntries,
      approvalAssignments: impact.approvalAssignments,
    }
  }

  /**
   * Permanently delete a user and the data they own. Admins cannot delete
   * themselves, and the last active admin cannot be deleted.
   */
  static async deleteUserPermanently(userId: string, adminId: string) {
    if (userId === adminId) {
      throw new Error('You cannot delete your own account')
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    })
    if (!user) {
      throw new Error('User not found')
    }

    if (user.role === 'ADMIN') {
      const otherAdmins = await prisma.user.count({
        where: { role: 'ADMIN', isActive: true, accountStatus: 'APPROVED', id: { not: userId } },
      })
      if (otherAdmins === 0) {
        throw new Error('You cannot delete the last active admin')
      }
    }

    const impact = await getUserDeletionImpact(prisma, [userId])
    await purgeUsers(prisma, [userId])

    // Best effort: the database is already clean, so a storage failure only
    // leaves an orphaned file behind.
    let filesNotDeleted = 0
    if (impact.attachments.length > 0) {
      const { deleteFile } = await import('./file-storage.service')
      const fileResults = await Promise.allSettled(impact.attachments.map(url => deleteFile(url)))
      filesNotDeleted = fileResults.filter(r => r.status === 'rejected').length
    }

    return {
      email: user.email,
      name: user.name,
      requisitions: impact.requisitions,
      attachments: impact.attachments.length,
      filesNotDeleted,
    }
  }

  /**
   * Change a user's own password after verifying the current one.
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } })
    if (!user) {
      throw new Error('User not found')
    }

    const matches = await bcrypt.compare(currentPassword, user.password)
    if (!matches) {
      throw new InvalidPasswordError('Your current password is incorrect')
    }

    await prisma.user.update({
      where: { id: userId },
      data: { password: await bcrypt.hash(newPassword, 10) },
    })
  }

  /**
   * Counts used by the admin user-management overview.
   */
  static async getAccountStats() {
    const [byStatus, active, inactive] = await Promise.all([
      prisma.user.groupBy({ by: ['accountStatus'], _count: { _all: true } }),
      prisma.user.count({ where: { accountStatus: 'APPROVED', isActive: true } }),
      prisma.user.count({ where: { accountStatus: 'APPROVED', isActive: false } }),
    ])

    const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0 }
    for (const row of byStatus) {
      counts[row.accountStatus] = row._count._all
    }

    return {
      total: counts.PENDING + counts.APPROVED + counts.REJECTED,
      pending: counts.PENDING,
      approved: counts.APPROVED,
      rejected: counts.REJECTED,
      active,
      inactive,
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: true,
      },
    })
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        department: true,
      },
    })
  }

  /**
   * List all users with pagination
   */
  static async listUsers(skip = 0, take = 20, filters: ListUsersFilters = {}) {
    const where: Prisma.UserWhereInput = {
      ...(filters.accountStatus && { accountStatus: filters.accountStatus }),
      ...(filters.role && { role: filters.role }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        select: publicUserSelect,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ])

    return { users, total }
  }

  /**
   * Update user
   */
  static async updateUser(userId: string, input: UpdateUserInput, adminId: string) {
    // Get current user to track changes
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!currentUser) {
      throw new Error('User not found')
    }

    if (input.isActive && currentUser.accountStatus !== 'APPROVED') {
      throw new Error('Approve this registration before activating the account')
    }

    // Validate referential integrity
    if (input.departmentId) {
      await ReferentialIntegrityChecker.validateDepartmentExists(input.departmentId)
    }

    if (input.role) {
      ReferentialIntegrityChecker.validateUserRole(input.role)
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.role && { role: input.role }),
        ...(input.departmentId && { departmentId: input.departmentId }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
      select: publicUserSelect,
    })

    // Record role change in audit trail if role was changed
    if (input.role && input.role !== currentUser.role) {
      // Create a dummy requisition entry for audit trail
      // Since user changes don't have a requisition, we'll need to handle this differently
      // For now, we'll skip audit trail recording for user changes
      // This will be handled in the API route
    }

    return updatedUser
  }

  /**
   * Deactivate user
   */
  static async deactivateUser(userId: string, adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('User not found')
    }

    if (!user.isActive) {
      throw new Error('User is already deactivated')
    }

    return prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: publicUserSelect,
    })
  }

  /**
   * Activate user
   */
  static async activateUser(userId: string, adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('User not found')
    }

    if (user.isActive) {
      throw new Error('User is already active')
    }

    if (user.accountStatus !== 'APPROVED') {
      throw new Error('Approve this registration before activating the account')
    }

    return prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
      select: publicUserSelect,
    })
  }

  /**
   * Get users by department
   */
  static async getUsersByDepartment(departmentId: string, skip = 0, take = 20) {
    const users = await prisma.user.findMany({
      where: { departmentId },
      skip,
      take,
      include: {
        department: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.user.count({
      where: { departmentId },
    })

    return { users, total }
  }

  /**
   * Get users by role
   */
  static async getUsersByRole(role: UserRole, skip = 0, take = 20) {
    const users = await prisma.user.findMany({
      where: { role },
      skip,
      take,
      include: {
        department: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.user.count({
      where: { role },
    })

    return { users, total }
  }

  /**
   * Get active users
   */
  static async getActiveUsers(skip = 0, take = 20) {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      skip,
      take,
      include: {
        department: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.user.count({
      where: { isActive: true },
    })

    return { users, total }
  }
}
