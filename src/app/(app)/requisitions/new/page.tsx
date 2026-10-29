'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { RequisitionForm } from '@/components/RequisitionForm'

export default function NewRequisitionPage() {
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/requisitions">
          <ArrowLeft /> Requisitions
        </Link>
      </Button>
      <PageHeader title="New requisition" description="Fill in the details, attach supporting documents, then submit for approval." />
      <RequisitionForm />
    </div>
  )
}
