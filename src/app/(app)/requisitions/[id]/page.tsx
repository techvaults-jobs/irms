'use client'

import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { RequisitionDetail } from '@/components/RequisitionDetail'

export default function RequisitionDetailPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <RequisitionDetail requisitionId={params.id} />
    </Suspense>
  )
}
