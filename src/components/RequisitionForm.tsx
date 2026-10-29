'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Paperclip, Save, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FieldError } from '@/components/auth/field-error'
import { StatusBadge } from '@/components/shared/status-badge'
import { FileDropzone, uploadAttachment } from '@/components/attachments/file-dropzone'
import { useCSRFToken, addCSRFTokenToRequest } from '@/hooks/useCSRFToken'
import { URGENCY } from '@/lib/status'
import { cn, formatMoney, getApiErrorMessage } from '@/lib/utils'

interface RequisitionFormProps {
  initialData?: {
    id: string
    title: string
    category: string
    description: string
    estimatedCost: string | number
    currency: string
    urgencyLevel: string
    businessJustification: string
    status?: string
    attachments?: unknown[]
  }
  isEditing?: boolean
  onCancel?: () => void
}

const CATEGORY_SUGGESTIONS = ['Office Supplies', 'IT Equipment', 'Software', 'Travel', 'Training', 'Maintenance', 'Marketing', 'Logistics']

const CURRENCIES = [
  { value: 'NGN', label: 'NGN — Nigerian Naira' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'CAD', label: 'CAD — Canadian Dollar' },
]

const URGENCY_HELP: Record<string, string> = {
  LOW: 'Within a month',
  MEDIUM: 'Within two weeks',
  HIGH: 'Within a few days',
  CRITICAL: 'Blocking work now',
}

export function RequisitionForm({ initialData, isEditing = false, onCancel }: RequisitionFormProps) {
  const router = useRouter()
  const csrfToken = useCSRFToken()
  const [pending, setPending] = useState<'draft' | 'submit' | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [files, setFiles] = useState<File[]>([])

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    category: initialData?.category || '',
    description: initialData?.description || '',
    estimatedCost: initialData?.estimatedCost?.toString() || '',
    currency: initialData?.currency || 'NGN',
    urgencyLevel: initialData?.urgencyLevel || 'MEDIUM',
    businessJustification: initialData?.businessJustification || '',
  })

  const canAttach = !isEditing || initialData?.status === 'DRAFT'
  const existingAttachments = initialData?.attachments?.length ?? 0

  const setField = (name: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    if (validationErrors[name]) setValidationErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.title.trim()) errors.title = 'Title is required'
    if (!formData.category.trim()) errors.category = 'Category is required'
    if (!formData.description.trim()) errors.description = 'Description is required'
    if (!formData.estimatedCost) errors.estimatedCost = 'Estimated cost is required'
    else if (parseFloat(formData.estimatedCost) <= 0) errors.estimatedCost = 'Must be greater than 0'
    if (!formData.businessJustification.trim()) errors.businessJustification = 'Business justification is required'
    setValidationErrors(errors)
    if (Object.keys(errors).length) toast.error('Please fix the highlighted fields')
    return Object.keys(errors).length === 0
  }

  const request = async (url: string, method: string, body?: unknown) => {
    const response = await fetch(
      url,
      addCSRFTokenToRequest(
        { method, headers: { 'Content-Type': 'application/json' }, ...(body !== undefined && { body: JSON.stringify(body) }) },
        csrfToken
      )
    )
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(getApiErrorMessage(data, 'Request failed'))
    return data
  }

  const uploadFiles = async (requisitionId: string) => {
    for (const file of files) {
      await uploadAttachment(requisitionId, file)
    }
  }

  const save = async (mode: 'draft' | 'submit') => {
    if (!validateForm()) return
    setPending(mode)

    try {
      let requisitionId = initialData?.id
      if (isEditing && requisitionId) {
        await request(`/api/requisitions/${requisitionId}`, 'PATCH', formData)
      } else {
        const created = await request('/api/requisitions', 'POST', formData)
        requisitionId = created.id as string
      }

      if (files.length && requisitionId) {
        try {
          await uploadFiles(requisitionId)
        } catch (err) {
          // The requisition is saved; leave it as a draft so attachments can be retried
          toast.error(err instanceof Error ? err.message : 'Attachment upload failed', {
            description: 'Your requisition was saved as a draft. Add the attachment from its page, then submit.',
          })
          router.push(`/requisitions/${requisitionId}`)
          return
        }
      }

      if (mode === 'submit' && !isEditing) {
        await request(`/api/requisitions/${requisitionId}/submit`, 'POST')
        toast.success('Requisition submitted', { description: 'It has been routed to the required approvers.' })
      } else {
        toast.success(isEditing ? 'Changes saved' : 'Draft saved')
      }

      router.push(`/requisitions/${requisitionId}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      setPending(null)
    }
  }

  const amount = parseFloat(formData.estimatedCost) || 0

  return (
    <form
      className="grid gap-6 lg:grid-cols-[1fr_20rem]"
      onSubmit={e => {
        e.preventDefault()
        save(isEditing ? 'draft' : 'submit')
      }}
      noValidate
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What do you need?</CardTitle>
            <CardDescription>Give approvers a clear picture of the request.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={formData.title} onChange={e => setField('title', e.target.value)} placeholder="e.g. Replacement laptops for design team" aria-invalid={!!validationErrors.title} />
              <FieldError message={validationErrors.title} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={formData.category} onChange={e => setField('category', e.target.value)} placeholder="e.g. IT Equipment" aria-invalid={!!validationErrors.category} />
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_SUGGESTIONS.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setField('category', cat)}
                    className={cn(
                      'rounded-full border px-2.5 py-0.5 text-xs transition-colors hover:border-primary/50 hover:bg-accent',
                      formData.category === cat && 'border-primary bg-primary/10 text-primary'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <FieldError message={validationErrors.category} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={4} value={formData.description} onChange={e => setField('description', e.target.value)} placeholder="Items, quantities, vendors, specifications…" aria-invalid={!!validationErrors.description} />
              <FieldError message={validationErrors.description} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost & priority</CardTitle>
            <CardDescription>The amount determines which approval rules apply.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
              <div className="space-y-2">
                <Label htmlFor="estimatedCost">Estimated cost</Label>
                <Input id="estimatedCost" type="number" inputMode="decimal" min="0" step="0.01" value={formData.estimatedCost} onChange={e => setField('estimatedCost', e.target.value)} placeholder="0.00" className="tabular-nums" aria-invalid={!!validationErrors.estimatedCost} />
                <FieldError message={validationErrors.estimatedCost} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={formData.currency} onValueChange={value => setField('currency', value)}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Urgency</Label>
              <RadioGroup value={formData.urgencyLevel} onValueChange={value => setField('urgencyLevel', value)} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Object.entries(URGENCY).map(([value, meta]) => (
                  <Label
                    key={value}
                    htmlFor={`urgency-${value}`}
                    className={cn(
                      'flex cursor-pointer flex-col gap-1 rounded-lg border p-3 font-normal transition-colors hover:bg-accent/50',
                      formData.urgencyLevel === value && 'border-primary bg-primary/5 ring-1 ring-primary'
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        <meta.icon className="h-4 w-4" />
                        {meta.label}
                      </span>
                      <RadioGroupItem value={value} id={`urgency-${value}`} />
                    </span>
                    <span className="text-xs text-muted-foreground">{URGENCY_HELP[value]}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessJustification">Business justification</Label>
              <Textarea id="businessJustification" rows={3} value={formData.businessJustification} onChange={e => setField('businessJustification', e.target.value)} placeholder="Why is this needed, and what happens if it isn't approved?" aria-invalid={!!validationErrors.businessJustification} />
              <FieldError message={validationErrors.businessJustification} />
            </div>
          </CardContent>
        </Card>

        {canAttach && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Paperclip className="h-4 w-4" /> Attachments
                <Badge variant="muted" className="font-normal">
                  Optional
                </Badge>
              </CardTitle>
              <CardDescription>Quotes, invoices or specs. Attachments can only be added while the requisition is a draft.</CardDescription>
            </CardHeader>
            <CardContent>
              <FileDropzone files={files} onChange={setFiles} existingCount={existingAttachments} disabled={!!pending} />
            </CardContent>
          </Card>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Estimated cost</p>
              <p className="text-2xl font-semibold tabular-nums">{formatMoney(amount, formData.currency)}</p>
            </div>
            <Separator />
            <dl className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Status</dt>
                <dd><StatusBadge value={initialData?.status ?? 'DRAFT'} /></dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Urgency</dt>
                <dd><StatusBadge kind="urgency" value={formData.urgencyLevel} /></dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Category</dt>
                <dd className="truncate font-medium">{formData.category || '—'}</dd>
              </div>
              {canAttach && (
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Attachments</dt>
                  <dd className="font-medium tabular-nums">{existingAttachments + files.length}</dd>
                </div>
              )}
            </dl>
            <Separator />
            <div className="flex flex-col gap-2">
              {isEditing ? (
                <Button type="submit" disabled={!!pending}>
                  {pending ? <Loader2 className="animate-spin" /> : <Save />}
                  Save changes
                </Button>
              ) : (
                <>
                  <Button type="submit" disabled={!!pending}>
                    {pending === 'submit' ? <Loader2 className="animate-spin" /> : <Send />}
                    Submit for approval
                  </Button>
                  <Button type="button" variant="outline" disabled={!!pending} onClick={() => save('draft')}>
                    {pending === 'draft' ? <Loader2 className="animate-spin" /> : <Save />}
                    Save as draft
                  </Button>
                </>
              )}
              {onCancel && (
                <Button type="button" variant="ghost" disabled={!!pending} onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        {!isEditing && (
          <p className="px-1 text-xs text-muted-foreground">
            Submitting routes the requisition to approvers based on the amount. You won&apos;t be able to edit it afterwards.
          </p>
        )}
      </aside>
    </form>
  )
}
