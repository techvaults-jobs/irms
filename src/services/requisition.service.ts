import { prisma } from '@/lib/prisma'
import { ReportingService } from './reporting.service'
import { Decimal } from '@prisma/client/runtime/library'
import { z } from 'zod'
import { ReferentialIntegrityChecker } from '@/lib/referential-integrity'
import {
  RequisitionStatus,
  validateStatusTransition,
  isValidStatusTransition,
  type RequisitionStatusType,
} from '@/lib/status-transitions'

export const UrgencyLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const

export const createRequisitionSchema = z.object({
  title: z.string().min(1).max(255),
  category: z.string().min(1).max(100),
  description: z.string().min(1),
  estimatedCost: z.string().or(z.number()).refine(val => {
    const num = typeof val === 'string' ? parseFloat(val) : val
    return num > 0
  }, 'Estimated cost must be greater than 0'),
  currency: z.string().default('NGN'),
  urgencyLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  businessJustification: z.string().min(1),
})

export const updateRequisitionSchema = createRequisitionSchema.partial()

export type CreateRequisitionInput = z.infer<typeof createRequisitionSchema>
export type UpdateRequisitionInput = z.infer<typeof updateRequisitionSchema>

export class RequisitionService {
  static async createRequisition(
    data: CreateRequisitionInput,
    submitterId: string,
    departmentId: string
  ) {
    // Validate referential integrity
    // Note: User validation is skipped here because user is already authenticated via NextAuth
    await ReferentialIntegrityChecker.validateDepartmentExists(departmentId)
    // Note: User-department validation is skipped since user is authenticated

    const validated = createRequisitionSchema.parse(data)

    const requisition = await prisma.requisition.create({
      data: {
        title: validated.title,
        category: validated.category,
        description: validated.description,
        estimatedCost: new Decimal(validated.estimatedCost),
        currency: validated.currency,
        urgencyLevel: validated.urgencyLevel,
        businessJustification: validated.businessJustification,
        status: RequisitionStatus.DRAFT,
        submitterId,
        departmentId,
      },
      include: {
        submitter: true,
        department: true,
      },
    })

    // Invalidate report cache
    ReportingService.invalidateReportCache()

    return requisition
  }

  static async updateRequisition(
    requisitionId: string,
    data: UpdateRequisitionInput
  ) {
    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
    })

    if (!requisition) {
      throw new Error('Requisition not found')
    }

    if (requisition.status !== RequisitionStatus.DRAFT) {
      throw new Error('Can only update requisitions in Draft status')
    }

    const validated = updateRequisitionSchema.parse(data)
    const updateData: any = {}

    if (validated.title) updateData.title = validated.title
    if (validated.category) updateData.category = validated.category
    if (validated.description) updateData.description = validated.description
    if (validated.estimatedCost) updateData.estimatedCost = new Decimal(validated.estimatedCost)
    if (validated.currency) updateData.currency = validated.currency
    if (validated.urgencyLevel) updateData.urgencyLevel = validated.urgencyLevel
    if (validated.businessJustification) updateData.businessJustification = validated.businessJustification

    const updated = await prisma.requisition.update({
      where: { id: requisitionId },
      data: updateData,
      include: {
        submitter: true,
        department: true,
      },
    })

    // Invalidate report cache
    ReportingService.invalidateReportCache()

    return updated
  }

  static async getRequisition(requisitionId: string) {
    return prisma.requisition.findUnique({
      where: { id: requisitionId },
      select: {
        id: true,
        title: true,
        category: true,
        description: true,
        estimatedCost: true,
        approvedCost: true,
        actualCostPaid: true,
        currency: true,
        urgencyLevel: true,
        businessJustification: true,
        status: true,
        paymentMethod: true,
        paymentReference: true,
        paymentDate: true,
        paymentComment: true,
        createdAt: true,
        updatedAt: true,
        closedAt: true,
        submitter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        approvalSteps: {
          select: {
            id: true,
            stepNumber: true,
            requiredRole: true,
            status: true,
            approverComment: true,
            approvedAt: true,
            assignedUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { stepNumber: 'asc' },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            fileType: true,
            storageUrl: true,
            uploadedAt: true,
          },
        },
      },
    })
  }

  static async listRequisitions(
    filters?: {
      status?: string
      submitterId?: string
      departmentId?: string
      skip?: number
      take?: number
    }
  ) {
    const { skip = 0, take = 20, ...where } = filters || {}

    return prisma.requisition.findMany({
      where,
      select: {
        id: true,
        title: true,
        category: true,
        estimatedCost: true,
        approvedCost: true,
        actualCostPaid: true,
        status: true,
        urgencyLevel: true,
        createdAt: true,
        updatedAt: true,
        submitter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    })
  }

  static async countRequisitions(filters?: {
    status?: string
    submitterId?: string
    departmentId?: string
  }) {
    return prisma.requisition.count({ where: filters })
  }

  static async submitRequisition(requisitionId: string) {
    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
    })

    if (!requisition) {
      throw new Error('Requisition not found')
    }

    // Validate status transition
    validateStatusTransition(requisition.status as RequisitionStatusType, RequisitionStatus.SUBMITTED as RequisitionStatusType)

    // Validate all required fields are populated
    if (!requisition.title || !requisition.description || !requisition.businessJustification) {
      throw new Error('Missing required fields')
    }

    const updated = await prisma.requisition.update({
      where: { id: requisitionId },
      data: { status: RequisitionStatus.SUBMITTED },
      include: {
        submitter: true,
        department: true,
      },
    })

    // Invalidate report cache
    ReportingService.invalidateReportCache()

    return updated
  }

  static async transitionToUnderReview(requisitionId: string) {
    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
    })

    if (!requisition) {
      throw new Error('Requisition not found')
    }

    // Validate status transition
    validateStatusTransition(requisition.status as RequisitionStatusType, RequisitionStatus.UNDER_REVIEW as RequisitionStatusType)

    const updated = await prisma.requisition.update({
      where: { id: requisitionId },
      data: { status: RequisitionStatus.UNDER_REVIEW },
    })

    // Invalidate report cache
    ReportingService.invalidateReportCache()

    return updated
  }

  static async approveRequisition(requisitionId: string, approvedCost?: Decimal) {
    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
    })

    if (!requisition) {
      throw new Error('Requisition not found')
    }

    // Validate status transition
    validateStatusTransition(requisition.status as RequisitionStatusType, RequisitionStatus.APPROVED as RequisitionStatusType)

    const updated = await prisma.requisition.update({
      where: { id: requisitionId },
      data: {
        status: RequisitionStatus.APPROVED,
        approvedCost: approvedCost || requisition.estimatedCost,
      },
    })

    // Invalidate report cache
    ReportingService.invalidateReportCache()

    return updated
  }

  static async rejectRequisition(requisitionId: string) {
    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
    })

    if (!requisition) {
      throw new Error('Requisition not found')
    }

    // Validate status transition
    validateStatusTransition(requisition.status as RequisitionStatusType, RequisitionStatus.REJECTED as RequisitionStatusType)

    const updated = await prisma.requisition.update({
      where: { id: requisitionId },
      data: { status: RequisitionStatus.REJECTED },
    })

    // Invalidate report cache
    ReportingService.invalidateReportCache()

    return updated
  }

  static async recordPayment(
    requisitionId: string,
    actualCostPaid: Decimal,
    paymentDate: Date,
    paymentMethod: string,
    paymentReference: string,
    paymentComment?: string
  ) {
    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
    })

    if (!requisition) {
      throw new Error('Requisition not found')
    }

    // Validate payment amount is positive
    if (actualCostPaid.lessThanOrEqualTo(0)) {
      throw new Error('Payment amount must be positive')
    }

    // Validate status transition
    validateStatusTransition(requisition.status as RequisitionStatusType, RequisitionStatus.PAID as RequisitionStatusType)

    const updated = await prisma.requisition.update({
      where: { id: requisitionId },
      data: {
        status: RequisitionStatus.PAID,
        actualCostPaid,
        paymentDate,
        paymentMethod,
        paymentReference,
        paymentComment,
      },
    })

    // Invalidate report cache
    ReportingService.invalidateReportCache()

    return updated
  }

  static async closeRequisition(requisitionId: string) {
    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
    })

    if (!requisition) {
      throw new Error('Requisition not found')
    }

    // Validate status transition
    validateStatusTransition(requisition.status as RequisitionStatusType, RequisitionStatus.CLOSED as RequisitionStatusType)

    const updated = await prisma.requisition.update({
      where: { id: requisitionId },
      data: { status: RequisitionStatus.CLOSED, closedAt: new Date() },
    })

    // Invalidate report cache
    ReportingService.invalidateReportCache()

    return updated
  }

  static isValidStatusTransition(fromStatus: string, toStatus: string): boolean {
    return isValidStatusTransition(fromStatus as RequisitionStatusType, toStatus as RequisitionStatusType)
  }

  static validateStatusTransition(fromStatus: string, toStatus: string): void {
    validateStatusTransition(fromStatus as RequisitionStatusType, toStatus as RequisitionStatusType)
  }
}
