/**
 * Delete every user who is not an ADMIN, together with the data that
 * belongs to them.
 *
 * Dry run (default) prints what would be removed:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' dev-scripts/delete-non-admin-users.ts
 * Apply:
 *   ... dev-scripts/delete-non-admin-users.ts --execute
 *
 * For each non-admin user this removes:
 *   - requisitions they submitted (with approval steps, attachments records,
 *     audit trail and notifications)
 *   - audit trail entries they authored on other requisitions
 *   - their notifications, settings, push subscriptions and delivery logs
 * and clears them as the assignee of approval steps on remaining requisitions.
 *
 * Everything runs in one transaction. The audit-trail immutability triggers
 * are disabled only inside that transaction, so a failure leaves them intact.
 * Attachment files in Vercel Blob are not deleted; their URLs are printed.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const execute = process.argv.includes('--execute')

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { email: true, isActive: true, accountStatus: true },
  })
  if (admins.length === 0) {
    throw new Error('No ADMIN users found — refusing to delete everyone')
  }

  const victims = await prisma.user.findMany({
    where: { role: { not: 'ADMIN' } },
    select: { id: true, email: true, role: true },
    orderBy: { email: 'asc' },
  })
  const ids = victims.map(u => u.id)

  const [requisitions, authoredAudit, assignedSteps, attachments] = await Promise.all([
    prisma.requisition.count({ where: { submitterId: { in: ids } } }),
    prisma.auditTrail.count({ where: { userId: { in: ids }, requisition: { submitterId: { notIn: ids } } } }),
    prisma.approvalStep.count({ where: { assignedUserId: { in: ids }, requisition: { submitterId: { notIn: ids } } } }),
    prisma.attachment.findMany({ where: { requisition: { submitterId: { in: ids } } }, select: { storageUrl: true } }),
  ])

  console.log(`Keeping ${admins.length} admin(s):`)
  admins.forEach(a => console.log(`  ✓ ${a.email} (${a.accountStatus}${a.isActive ? '' : ', inactive'})`))
  console.log(`\nDeleting ${victims.length} user(s):`)
  victims.forEach(u => console.log(`  ✗ ${u.email} (${u.role})`))
  console.log(`\nAlso removing:`)
  console.log(`  ${requisitions} requisition(s) they submitted (${attachments.length} attachment record(s))`)
  console.log(`  ${authoredAudit} audit entr(y/ies) they wrote on admins' requisitions`)
  console.log(`  ${assignedSteps} approval step assignment(s) on admins' requisitions will be cleared`)

  if (!execute) {
    console.log('\nDry run only. Re-run with --execute to apply.')
    return
  }
  if (victims.length === 0) {
    console.log('\nNothing to delete.')
    return
  }

  await prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe(`ALTER TABLE "AuditTrail" DISABLE TRIGGER audit_trail_prevent_delete`)

    await tx.requisition.deleteMany({ where: { submitterId: { in: ids } } })
    await tx.auditTrail.deleteMany({ where: { userId: { in: ids } } })
    await tx.approvalStep.updateMany({ where: { assignedUserId: { in: ids } }, data: { assignedUserId: null } })
    await tx.user.updateMany({ where: { reviewedById: { in: ids } }, data: { reviewedById: null } })
    const deleted = await tx.user.deleteMany({ where: { id: { in: ids } } })

    await tx.$executeRawUnsafe(`ALTER TABLE "AuditTrail" ENABLE TRIGGER audit_trail_prevent_delete`)
    console.log(`\n✅ Deleted ${deleted.count} user(s).`)
  }, { timeout: 120000 })

  if (attachments.length > 0) {
    console.log('\nOrphaned attachment files in Vercel Blob (delete manually if needed):')
    attachments.forEach(a => console.log(`  ${a.storageUrl}`))
  }
}

main()
  .catch(error => {
    console.error('❌', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
