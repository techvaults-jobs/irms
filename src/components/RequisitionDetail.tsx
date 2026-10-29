'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  Copy,
  Loader2,
  MoreHorizontal,
  Pencil,
  Send,
  Tag,
  Trash2,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/shared/status-badge'
import { UserAvatar } from '@/components/shared/user-avatar'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ApprovalProgress, ApprovalStepView } from '@/components/requisitions/approval-progress'
import { AttachmentsPanel, AttachmentView } from '@/components/attachments/attachments-panel'
import { FinancialSummary } from './FinancialSummary'
import { PaymentRecordingForm } from './PaymentRecordingForm'
import { AuditTrailViewer } from './AuditTrailViewer'
import { ApprovalActions } from './ApprovalActions'
import { useAuth } from '@/hooks/useAuth'
import { useCSRFToken, addCSRFTokenToRequest } from '@/hooks/useCSRFToken'
import { notifyCountsChanged } from '@/hooks/useNavCounts'
import { asList, formatDate, formatMoney, getApiErrorMessage } from '@/lib/utils'

interface RequisitionDetailProps {
  requisitionId: string
}

export function RequisitionDetail({ requisitionId }: RequisitionDetailProps) {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const csrfToken = useCSRFToken()
  const [requisition, setRequisition] = useState<any>(null)
  const [attachments, setAttachments] = useState<AttachmentView[]>([])
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState('overview')
  const [showDelete, setShowDelete] = useState(false)
  const [showSubmit, setShowSubmit] = useState(false)
  const [busy, setBusy] = useState(false)
  const [activityKey, setActivityKey] = useState(0)

  const load = useCallback(async () => {
    try {
      const [reqResponse, attachResponse] = await Promise.all([
        fetch(`/api/requisitions/${requisitionId}`),
        fetch(`/api/requisitions/${requisitionId}/attachments`),
      ])
      if (!reqResponse.ok) {
        throw new Error(reqResponse.status === 403 ? "You don't have access to this requisition" : 'Requisition not found')
      }
      setRequisition(await reqResponse.json())
      setAttachments(attachResponse.ok ? asList<AttachmentView>(await attachResponse.json()) : [])
      setActivityKey(k => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requisition')
    }
  }, [requisitionId])

  useEffect(() => {
    load()
  }, [load])

  if (error) {
    return (
      <div className="space-y-4">
        <BackLink />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Couldn&apos;t open requisition</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!requisition) {
    return (
      <div className="space-y-6">
        <BackLink />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  const steps: ApprovalStepView[] = requisition.approvalSteps ?? []
  const nextStep = steps.find(step => step.status === 'PENDING') as (ApprovalStepView & { assignedUserId?: string | null }) | undefined
  const isAdmin = user?.role === 'ADMIN'
  const isOwner = requisition.submitterId === user?.id || requisition.submitter?.id === user?.id
  const inReview = requisition.status === 'SUBMITTED' || requisition.status === 'UNDER_REVIEW'
  const isMyTurn =
    !!nextStep &&
    (isAdmin ||
      nextStep.assignedUserId === user?.id ||
      (!nextStep.assignedUserId && nextStep.requiredRole === user?.role))
  const canApprove = inReview && isMyTurn && ['MANAGER', 'FINANCE', 'ADMIN'].includes(user?.role ?? '')
  const canRecordPayment = requisition.status === 'APPROVED' && (user?.role === 'FINANCE' || isAdmin)
  const isDraft = requisition.status === 'DRAFT'
  const canSubmit = isDraft && (isOwner || isAdmin)
  const canManageAttachments = isDraft && (isOwner || user?.role !== 'STAFF')
  const initialAction = searchParams?.get('action') as 'approve' | 'reject' | null

  const submitDraft = async () => {
    setBusy(true)
    try {
      const response = await fetch(
        `/api/requisitions/${requisitionId}/submit`,
        addCSRFTokenToRequest({ method: 'POST', headers: { 'Content-Type': 'application/json' } }, csrfToken)
      )
      if (!response.ok) throw new Error(getApiErrorMessage(await response.json().catch(() => null), 'Failed to submit'))
      toast.success('Requisition submitted', { description: 'It has been routed to the required approvers.' })
      setShowSubmit(false)
      notifyCountsChanged()
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setBusy(false)
    }
  }

  const deleteRequisition = async () => {
    setBusy(true)
    try {
      const response = await fetch(`/api/requisitions/${requisitionId}/delete`, { method: 'POST' })
      if (!response.ok) throw new Error(getApiErrorMessage(await response.json().catch(() => null), 'Failed to delete'))
      toast.success('Requisition deleted')
      router.push('/requisitions')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={requisition.status} />
            <StatusBadge kind="urgency" value={requisition.urgencyLevel} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{requisition.title}</h1>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(requisition.id)
              toast.success('Requisition ID copied')
            }}
            className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            {requisition.id} <Copy className="h-3 w-3" />
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canSubmit && (
            <Button onClick={() => setShowSubmit(true)}>
              <Send /> Submit for approval
            </Button>
          )}
          {isAdmin && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/requisitions/${requisitionId}/edit`}>
                  <Pencil /> Edit
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="More actions">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTab('activity')}>View activity</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setShowDelete(true)}>
                    <Trash2 /> Delete requisition
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {canApprove && (
        <ApprovalActions
          requisitionId={requisitionId}
          requisitionTitle={requisition.title}
          steps={steps}
          initialAction={initialAction ?? undefined}
          onSuccess={load}
        />
      )}

      {requisition.status === 'REJECTED' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>This requisition was rejected</AlertTitle>
          <AlertDescription>
            {steps.find(s => s.status === 'REJECTED')?.approverComment ?? 'No reason was given.'}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Estimated" value={formatMoney(requisition.estimatedCost, requisition.currency)} />
        <MetricCard label="Approved" value={formatMoney(requisition.approvedCost, requisition.currency)} tone="text-success" />
        <MetricCard label="Paid" value={formatMoney(requisition.actualCostPaid, requisition.currency)} tone="text-violet-600 dark:text-violet-400" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Tabs value={tab} onValueChange={setTab} className="min-w-0">
          <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
            {canRecordPayment && <TabsTrigger value="payment">Record payment</TabsTrigger>}
            <TabsTrigger value="attachments">Attachments ({attachments.length})</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <Card>
              <CardContent className="space-y-6 p-6">
                <Section title="Description">{requisition.description}</Section>
                <Separator />
                <Section title="Business justification">{requisition.businessJustification}</Section>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financials" className="mt-4">
            <FinancialSummary
              estimatedCost={requisition.estimatedCost}
              approvedCost={requisition.approvedCost}
              actualCostPaid={requisition.actualCostPaid}
              currency={requisition.currency}
              status={requisition.status}
              paymentMethod={requisition.paymentMethod}
              paymentReference={requisition.paymentReference}
              paymentDate={requisition.paymentDate}
              paymentComment={requisition.paymentComment}
            />
          </TabsContent>

          {canRecordPayment && (
            <TabsContent value="payment" className="mt-4">
              <PaymentRecordingForm
                requisitionId={requisitionId}
                approvedCost={requisition.approvedCost || requisition.estimatedCost}
                currency={requisition.currency}
                onPaymentRecorded={async () => {
                  await load()
                  setTab('financials')
                }}
              />
            </TabsContent>
          )}

          <TabsContent value="attachments" className="mt-4">
            <AttachmentsPanel requisitionId={requisitionId} attachments={attachments} canManage={canManageAttachments} onChange={load} />
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <AuditTrailViewer key={activityKey} requisitionId={requisitionId} />
          </TabsContent>
        </Tabs>

        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Approval progress</CardTitle>
            </CardHeader>
            <CardContent>
              {steps.length > 0 ? (
                <ApprovalProgress steps={steps} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isDraft ? 'Approval steps are created when the requisition is submitted.' : 'No approval steps.'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <UserAvatar name={requisition.submitter?.name} className="h-9 w-9" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{requisition.submitter?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{requisition.submitter?.email}</p>
                </div>
              </div>
              <Separator />
              <DetailRow icon={Building2} label="Department" value={requisition.department?.name} />
              <DetailRow icon={Tag} label="Category" value={requisition.category} />
              <DetailRow icon={CalendarDays} label="Created" value={formatDate(requisition.createdAt, true)} />
              <DetailRow icon={CalendarDays} label="Last updated" value={formatDate(requisition.updatedAt, true)} />
              {requisition.paymentDate && <DetailRow icon={CalendarDays} label="Paid on" value={formatDate(requisition.paymentDate)} />}
            </CardContent>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={showSubmit}
        onOpenChange={setShowSubmit}
        title="Submit for approval?"
        description="The requisition will be routed to approvers and can no longer be edited by you."
        confirmText="Submit"
        loading={busy}
        onConfirm={submitDraft}
      />
      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete requisition?"
        description={
          <>
            This permanently removes <span className="font-medium text-foreground">{requisition.title}</span> with its attachments and audit trail. This
            cannot be undone.
          </>
        }
        confirmText="Delete"
        destructive
        loading={busy}
        onConfirm={deleteRequisition}
      />
    </div>
  )
}

function BackLink() {
  return (
    <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
      <Link href="/requisitions">
        <ArrowLeft /> Requisitions
      </Link>
    </Button>
  )
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone ?? ''}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <p className="whitespace-pre-wrap leading-relaxed">{children}</p>
    </div>
  )
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Tag; label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span className="truncate text-right font-medium">{value || '—'}</span>
    </div>
  )
}
