import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { z } from 'zod'
import { ReferentialIntegrityChecker } from '@/lib/referential-integrity'

export const createApprovalRuleSchema = z.object({
  minAmount: z.string().or(z.number()).refine(val => {
    const num = typeof val === 'string' ? parseFloat(val) : val
    return num >= 0
  }, 'Min amount must be >= 0'),
  maxAmount: z.string().or(z.number()).optional().refine(val => {
    if (!val) return true
    const num = typeof val === 'string' ? parseFloat(val) : val
    return num > 0
  }, 'Max amount must be > 0'),
  requiredApprovers: z.array(z.string()).min(1, 'At least one approver role required'),
  departmentId: z.string().optional(),
})

export type CreateApprovalRuleInput = z.infer<typeof createApprovalRuleSchema>

export class ApprovalWorkflowService {
  static async createApprovalRule(data: CreateApprovalRuleInput) {
    const validated = createApprovalRuleSchema.parse(data)

    // Validate referential integrity
    if (validated.departmentId) {
      await ReferentialIntegrityChecker.validateDepartmentExists(validated.departmentId)
    }
    ReferentialIntegrityChecker.validateApproverRoles(validated.requiredApprovers)

    return prisma.approvalRule.create({
      data: {
        minAmount: new Decimal(validated.minAmount),
        maxAmount: validated.maxAmount ? new Decimal(validated.maxAmount) : null,
        requiredApprovers: validated.requiredApprovers,
        departmentId: validated.departmentId || null,
      },
    })
  }

  static async getApprovalRule(ruleId: string) {
    return prisma.approvalRule.findUnique({
      where: { id: ruleId },
      include: {
        department: true,
      },
    })
  }

  static async listApprovalRules(skip: number = 0, take: number = 20, departmentId?: string) {
    return prisma.approvalRule.findMany({
      where: departmentId ? { departmentId } : {},
      select: {
        id: true,
        minAmount: true,
        maxAmount: true,
        requiredApprovers: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { minAmount: 'asc' },
      skip,
      take,
    })
  }

  static async countApprovalRules(departmentId?: string) {
    return prisma.approvalRule.count({
      where: departmentId ? { departmentId } : {},
    })
  }

  static async updateApprovalRule(ruleId: string, data: Partial<CreateApprovalRuleInput>) {
    const rule = await prisma.approvalRule.findUnique({
      where: { id: ruleId },
    })

    if (!rule) {
      throw new Error('Approval rule not found')
    }

    const updateData: any = {}

    if (data.minAmount !== undefined) {
      updateData.minAmount = new Decimal(data.minAmount)
    }
    if (data.maxAmount !== undefined) {
      updateData.maxAmount = data.maxAmount ? new Decimal(data.maxAmount) : null
    }
    if (data.requiredApprovers !== undefined) {
      updateData.requiredApprovers = data.requiredApprovers
    }
    if (data.departmentId !== undefined) {
      updateData.departmentId = data.departmentId || null
    }

    return prisma.approvalRule.update({
      where: { id: ruleId },
      data: updateData,
    })
  }

  static async deleteApprovalRule(ruleId: string) {
    return prisma.approvalRule.delete({
      where: { id: ruleId },
    })
  }

  static async determineApprovers(
    amount: Decimal,
    departmentId: string
  ): Promise<string[]> {
    // Get applicable rules for this amount and department
    const applicableRules = await prisma.approvalRule.findMany({
      where: {
        AND: [
          { minAmount: { lte: amount } },
          {
            OR: [
              { maxAmount: null },
              { maxAmount: { gte: amount } },
            ],
          },
          {
            OR: [
              { departmentId: null },
              { departmentId },
            ],
          },
        ],
      },
      orderBy: { minAmount: 'desc' },
    })

    if (applicableRules.length === 0) {
      // Default: require FINANCE approval if no rules match
      return ['FINANCE']
    }

    // Use the most specific rule (highest minAmount)
    const rule = applicableRules[0]
    return rule.requiredApprovers
  }

  static async createApprovalSteps(
    requisitionId: string,
    approverRoles: string[]
  ) {
    // Validate referential integrity
    await ReferentialIntegrityChecker.validateRequisitionExists(requisitionId)
    ReferentialIntegrityChecker.validateApproverRoles(approverRoles)

    // Get users with the required roles in the same department as the requisition
    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
      include: { department: true },
    })

    if (!requisition) {
      throw new Error('Requisition not found')
    }

    const approvalSteps = []

    for (let i = 0; i < approverRoles.length; i++) {
      const role = approverRoles[i]

      // Find a user with this role in the department
      const approver = await prisma.user.findFirst({
        where: {
          role: role as any,
          departmentId: requisition.departmentId,
          isActive: true,
        },
      })

      const step = await prisma.approvalStep.create({
        data: {
          requisitionId,
          stepNumber: i + 1,
          requiredRole: role,
          assignedUserId: approver?.id || null,
          status: 'PENDING',
        },
      })

      approvalSteps.push(step)
    }

    return approvalSteps
  }

  static async getApprovalSteps(requisitionId: string) {
    return prisma.approvalStep.findMany({
      where: { requisitionId },
      include: {
        assignedUser: true,
      },
      orderBy: { stepNumber: 'asc' },
    })
  }

  static async getPendingApprovalSteps(requisitionId: string) {
    return prisma.approvalStep.findMany({
      where: {
        requisitionId,
        status: 'PENDING',
      },
      orderBy: { stepNumber: 'asc' },
    })
  }

  static async getNextPendingStep(requisitionId: string) {
    return prisma.approvalStep.findFirst({
      where: {
        requisitionId,
        status: 'PENDING',
      },
      orderBy: { stepNumber: 'asc' },
      include: {
        assignedUser: true,
      },
    })
  }

  static async approveStep(
    stepId: string,
    userId: string,
    comment?: string
  ) {
    // Validate referential integrity
    await ReferentialIntegrityChecker.validateApprovalStepExists(stepId)
    // Note: User validation is skipped here because user is already authenticated via NextAuth

    const step = await prisma.approvalStep.findUnique({
      where: { id: stepId },
    })

    if (!step) {
      throw new Error('Approval step not found')
    }

    if (step.status !== 'PENDING') {
      throw new Error('Step is not pending')
    }

    return prisma.approvalStep.update({
      where: { id: stepId },
      data: {
        status: 'APPROVED',
        approverComment: comment,
        approvedAt: new Date(),
      },
    })
  }

  static async rejectStep(
    stepId: string,
    userId: string,
    comment: string
  ) {
    if (!comment || comment.trim().length === 0) {
      throw new Error('Rejection comment is required')
    }

    // Validate referential integrity
    await ReferentialIntegrityChecker.validateApprovalStepExists(stepId)
    // Note: User validation is skipped here because user is already authenticated via NextAuth

    const step = await prisma.approvalStep.findUnique({
      where: { id: stepId },
    })

    if (!step) {
      throw new Error('Approval step not found')
    }

    if (step.status !== 'PENDING') {
      throw new Error('Step is not pending')
    }

    return prisma.approvalStep.update({
      where: { id: stepId },
      data: {
        status: 'REJECTED',
        approverComment: comment,
        approvedAt: new Date(),
      },
    })
  }

  static async allStepsApproved(requisitionId: string): Promise<boolean> {
    const pendingSteps = await prisma.approvalStep.findMany({
      where: {
        requisitionId,
        status: 'PENDING',
      },
    })

    return pendingSteps.length === 0
  }

  static async anyStepRejected(requisitionId: string): Promise<boolean> {
    const rejectedSteps = await prisma.approvalStep.findMany({
      where: {
        requisitionId,
        status: 'REJECTED',
      },
    })

    return rejectedSteps.length > 0
  }
}
