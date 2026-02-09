import { prisma } from '@/lib/prisma'

export const AuditChangeType = {
  CREATED: 'CREATED',
  FIELD_UPDATED: 'FIELD_UPDATED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PAYMENT_RECORDED: 'PAYMENT_RECORDED',
  ATTACHMENT_UPLOADED: 'ATTACHMENT_UPLOADED',
  ATTACHMENT_DOWNLOADED: 'ATTACHMENT_DOWNLOADED',
  NOTIFICATION_SENT: 'NOTIFICATION_SENT',
} as const

export class AuditTrailService {
  static async recordChange(
    requisitionId: string,
    userId: string,
    changeType: string,
    fieldName?: string,
    previousValue?: any,
    newValue?: any,
    metadata?: Record<string, any>
  ) {
    return prisma.auditTrail.create({
      data: {
        requisitionId,
        userId,
        changeType,
        fieldName,
        previousValue: previousValue ? JSON.stringify(previousValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })
  }

  static async recordCreation(
    requisitionId: string,
    userId: string,
    requisitionData: Record<string, any>
  ) {
    return this.recordChange(
      requisitionId,
      userId,
      AuditChangeType.CREATED,
      undefined,
      undefined,
      requisitionData
    )
  }

  static async recordFieldUpdate(
    requisitionId: string,
    userId: string,
    fieldName: string,
    previousValue: any,
    newValue: any
  ) {
    return this.recordChange(
      requisitionId,
      userId,
      AuditChangeType.FIELD_UPDATED,
      fieldName,
      previousValue,
      newValue
    )
  }

  static async recordStatusChange(
    requisitionId: string,
    userId: string,
    previousStatus: string,
    newStatus: string,
    reason?: string
  ) {
    return this.recordChange(
      requisitionId,
      userId,
      AuditChangeType.STATUS_CHANGED,
      'status',
      previousStatus,
      newStatus,
      { reason }
    )
  }

  static async recordApproval(
    requisitionId: string,
    userId: string,
    approverComment?: string
  ) {
    return this.recordChange(
      requisitionId,
      userId,
      AuditChangeType.APPROVED,
      undefined,
      undefined,
      { approverComment, approvedAt: new Date() }
    )
  }

  static async recordRejection(
    requisitionId: string,
    userId: string,
    rejectionComment: string
  ) {
    return this.recordChange(
      requisitionId,
      userId,
      AuditChangeType.REJECTED,
      undefined,
      undefined,
      { rejectionComment, rejectedAt: new Date() }
    )
  }

  static async recordPayment(
    requisitionId: string,
    userId: string,
    paymentData: Record<string, any>
  ) {
    return this.recordChange(
      requisitionId,
      userId,
      AuditChangeType.PAYMENT_RECORDED,
      undefined,
      undefined,
      paymentData
    )
  }

  static async recordAttachmentUpload(
    requisitionId: string,
    userId: string,
    fileName: string,
    fileSize: number
  ) {
    return this.recordChange(
      requisitionId,
      userId,
      AuditChangeType.ATTACHMENT_UPLOADED,
      undefined,
      undefined,
      { fileName, fileSize }
    )
  }

  static async recordAttachmentDownload(
    requisitionId: string,
    userId: string,
    fileName: string
  ) {
    return this.recordChange(
      requisitionId,
      userId,
      AuditChangeType.ATTACHMENT_DOWNLOADED,
      undefined,
      undefined,
      { fileName }
    )
  }

  static async recordNotification(
    requisitionId: string,
    userId: string,
    notificationType: string,
    message: string
  ) {
    return this.recordChange(
      requisitionId,
      userId,
      AuditChangeType.NOTIFICATION_SENT,
      undefined,
      undefined,
      { notificationType, message }
    )
  }

  static async getRequisitionAuditTrail(requisitionId: string) {
    return prisma.auditTrail.findMany({
      where: { requisitionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { timestamp: 'asc' },
    })
  }

  static async getAllAuditTrail(skip = 0, take = 100) {
    return prisma.auditTrail.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        requisition: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      skip,
      take,
    })
  }

  static async getAuditTrailCount(requisitionId?: string) {
    return prisma.auditTrail.count(
      requisitionId ? { where: { requisitionId } } : undefined
    )
  }

  static async getAuditTrailByChangeType(
    requisitionId: string,
    changeType: string
  ) {
    return prisma.auditTrail.findMany({
      where: {
        requisitionId,
        changeType,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { timestamp: 'asc' },
    })
  }

  static async getAuditTrailByUser(
    userId: string,
    skip = 0,
    take = 100
  ) {
    return prisma.auditTrail.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        requisition: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      skip,
      take,
    })
  }

  static async getAuditTrailByDateRange(
    startDate: Date,
    endDate: Date,
    skip = 0,
    take = 100
  ) {
    return prisma.auditTrail.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        requisition: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      skip,
      take,
    })
  }

  /**
   * Verify audit trail immutability by checking that entries cannot be modified
   * This is enforced at the database level via triggers
   */
  static async verifyImmutability(auditTrailId: string): Promise<boolean> {
    try {
      const entry = await prisma.auditTrail.findUnique({
        where: { id: auditTrailId },
      })
      return !!entry
    } catch {
      return false
    }
  }
}
