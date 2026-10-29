'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { FilePlus2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { RequisitionList } from '@/components/RequisitionList'
import { useAuth } from '@/hooks/useAuth'

const DESCRIPTIONS: Record<string, string> = {
  STAFF: 'Track the requisitions you have raised.',
  MANAGER: "Requisitions from your department.",
  FINANCE: 'All requisitions across the organisation.',
  ADMIN: 'All requisitions across the organisation.',
}

export default function RequisitionsPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requisitions"
        description={DESCRIPTIONS[user?.role ?? 'STAFF']}
        actions={
          <Button asChild>
            <Link href="/requisitions/new">
              <FilePlus2 /> New requisition
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <RequisitionList />
      </Suspense>
    </div>
  )
}
