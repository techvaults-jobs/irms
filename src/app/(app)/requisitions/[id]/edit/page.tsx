'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { RoleGate } from '@/components/shared/role-gate'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { RequisitionForm } from '@/components/RequisitionForm'

export default function EditRequisitionPage({ params }: { params: { id: string } }) {
  return (
    <RoleGate roles={['ADMIN']}>
      <EditRequisitionContent id={params.id} />
    </RoleGate>
  )
}

function EditRequisitionContent({ id }: { id: string }) {
  const router = useRouter()
  const [requisition, setRequisition] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmLeave, setConfirmLeave] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/requisitions/${id}`).then(r => {
        if (!r.ok) throw new Error('Failed to load requisition')
        return r.json()
      }),
      fetch(`/api/requisitions/${id}/attachments`).then(r => (r.ok ? r.json() : [])),
    ])
      .then(([req, attachments]) => setRequisition({ ...req, attachments: Array.isArray(attachments) ? attachments : attachments?.data ?? [] }))
      .catch(err => setError(err.message))
  }, [id])

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => setConfirmLeave(true)}>
        <ArrowLeft /> Back to requisition
      </Button>
      <PageHeader title="Edit requisition" description={requisition?.title ?? 'Update requisition details'} />

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Couldn&apos;t load requisition</AlertTitle>
          <AlertDescription>
            {error}{' '}
            <Link href={`/requisitions/${id}`} className="underline">
              Go back
            </Link>
          </AlertDescription>
        </Alert>
      ) : !requisition ? (
        <Skeleton className="h-[32rem] w-full" />
      ) : (
        <RequisitionForm initialData={requisition} isEditing onCancel={() => setConfirmLeave(true)} />
      )}

      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Discard changes?"
        description="Any unsaved changes will be lost."
        confirmText="Discard"
        cancelText="Keep editing"
        destructive
        onConfirm={() => router.push(`/requisitions/${id}`)}
      />
    </div>
  )
}
