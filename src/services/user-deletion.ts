import type { Prisma, PrismaClient } from '@prisma/client'

// Relative imports only: this module is also used by dev-scripts via ts-node.

/**
 * Allow audit-trail rows to be deleted for the rest of this transaction.
 * See prisma/migrations/20261030_audit_trail_delete_bypass.
 */
export async function allowAuditTrailDeletes(tx: Prisma.TransactionClient) {
  await tx.$queryRaw`SELECT set_config('irms.allow_audit_delete', 'on', true)`
}

export interface UserDeletionImpact {
  requisitions: number
  attachments: string[]
  authoredAuditEntries: number
  approvalAssignments: number
}

/**
 * What permanently deleting these users would remove.
 */
export async function getUserDeletionImpact(prisma: PrismaClient, ids: string[]): Promise<UserDeletionImpact> {
  const [requisitions, attachments, authoredAuditEntries, approvalAssignments] = await Promise.all([
    prisma.requisition.count({ where: { submitterId: { in: ids } } }),
    prisma.attachment.findMany({ where: { requisition: { submitterId: { in: ids } } }, select: { storageUrl: true } }),
    prisma.auditTrail.count({ where: { userId: { in: ids }, requisition: { submitterId: { notIn: ids } } } }),
    prisma.approvalStep.count({ where: { assignedUserId: { in: ids }, requisition: { submitterId: { notIn: ids } } } }),
  ])

  return {
    requisitions,
    attachments: attachments.map(a => a.storageUrl),
    authoredAuditEntries,
    approvalAssignments,
  }
}

/**
 * Permanently delete users and the data that belongs to them, in one
 * transaction: requisitions they submitted (with steps, attachment records,
 * audit trail and notifications), audit entries they wrote elsewhere, and
 * their notifications/settings/push subscriptions. Approval steps assigned to
 * them on other requisitions are unassigned.
 *
 * Attachment files in blob storage are not touched; callers get their URLs
 * back via getUserDeletionImpact and can remove them afterwards.
 */
export async function purgeUsers(prisma: PrismaClient, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0

  return prisma.$transaction(
    async tx => {
      await allowAuditTrailDeletes(tx)
      await tx.requisition.deleteMany({ where: { submitterId: { in: ids } } })
      await tx.auditTrail.deleteMany({ where: { userId: { in: ids } } })
      await tx.approvalStep.updateMany({ where: { assignedUserId: { in: ids } }, data: { assignedUserId: null } })
      await tx.user.updateMany({ where: { reviewedById: { in: ids } }, data: { reviewedById: null } })
      const deleted = await tx.user.deleteMany({ where: { id: { in: ids } } })
      return deleted.count
    },
    { timeout: 60000 }
  )
}
