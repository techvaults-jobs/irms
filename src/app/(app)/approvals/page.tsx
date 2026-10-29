'use client'

import { PageHeader } from '@/components/shared/page-header'
import { RoleGate } from '@/components/shared/role-gate'
import { ApprovalQueue } from '@/components/ApprovalQueue'

export default function ApprovalsPage() {
  return (
    <RoleGate roles={['MANAGER', 'FINANCE', 'ADMIN']}>
      <div className="space-y-6">
        <PageHeader title="Approvals" description="Review requisitions waiting on a decision." />
        <ApprovalQueue />
      </div>
    </RoleGate>
  )
}
