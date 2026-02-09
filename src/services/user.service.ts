import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { AuditTrailService } from './audit-trail.service'
import { ReferentialIntegrityChecker } from '@/lib/referential-integrity'
import bcrypt from 'bcryptjs'

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
      },
    })

    return user
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
  static async listUsers(skip = 0, take = 20) {
    const users = await prisma.user.findMany({
      skip,
      take,
      include: {
        department: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.user.count()

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
      include: {
        department: true,
      },
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
      include: {
        department: true,
      },
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

    return prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
      include: {
        department: true,
      },
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
