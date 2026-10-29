'use client'

import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { RoleGate } from '@/components/shared/role-gate'
import { UserManagement } from '@/components/UserManagement'

export default function UsersPage() {
  return (
    <RoleGate roles={['ADMIN']}>
      <div className="space-y-6">
        <PageHeader title="Users" description="Review account requests, manage roles and control access." />
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <UserManagement />
        </Suspense>
      </div>
    </RoleGate>
  )
}
