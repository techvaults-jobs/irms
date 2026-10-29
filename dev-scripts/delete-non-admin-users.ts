/**
 * Delete every user who is not an ADMIN, together with the data that
 * belongs to them. Admins can also do this per user from Users in the app.
 *
 * Dry run (default) prints what would be removed:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' dev-scripts/delete-non-admin-users.ts
 * Apply:
 *   ... dev-scripts/delete-non-admin-users.ts --execute
 *
 * See src/services/user-deletion.ts for exactly what is removed. Everything
 * runs in one transaction. Attachment files in Vercel Blob are not deleted;
 * their URLs are printed.
 */

import { PrismaClient } from '@prisma/client'
import { getUserDeletionImpact, purgeUsers } from '../src/services/user-deletion'

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
  const impact = await getUserDeletionImpact(prisma, ids)

  console.log(`Keeping ${admins.length} admin(s):`)
  admins.forEach(a => console.log(`  ✓ ${a.email} (${a.accountStatus}${a.isActive ? '' : ', inactive'})`))
  console.log(`\nDeleting ${victims.length} user(s):`)
  victims.forEach(u => console.log(`  ✗ ${u.email} (${u.role})`))
  console.log(`\nAlso removing:`)
  console.log(`  ${impact.requisitions} requisition(s) they submitted (${impact.attachments.length} attachment record(s))`)
  console.log(`  ${impact.authoredAuditEntries} audit entr(y/ies) they wrote on admins' requisitions`)
  console.log(`  ${impact.approvalAssignments} approval step assignment(s) on admins' requisitions will be cleared`)

  if (!execute) {
    console.log('\nDry run only. Re-run with --execute to apply.')
    return
  }

  const deleted = await purgeUsers(prisma, ids)
  console.log(`\n✅ Deleted ${deleted} user(s).`)

  if (impact.attachments.length > 0) {
    console.log('\nOrphaned attachment files in Vercel Blob (delete manually if needed):')
    impact.attachments.forEach(url => console.log(`  ${url}`))
  }
}

main()
  .catch(error => {
    console.error('❌', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
