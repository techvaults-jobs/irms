'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Download, Loader2, Paperclip, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { FileDropzone, fileIconFor, uploadAttachment } from './file-dropzone'
import { formatDate, formatFileSize, getApiErrorMessage } from '@/lib/utils'

export interface AttachmentView {
  id: string
  fileName: string
  fileSize: number
  fileType?: string
  uploadedAt: string
}

interface AttachmentsPanelProps {
  requisitionId: string
  attachments: AttachmentView[]
  canManage: boolean
  onChange: () => void
}

export function AttachmentsPanel({ requisitionId, attachments, canManage, onChange }: AttachmentsPanelProps) {
  const [queued, setQueued] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [toDelete, setToDelete] = useState<AttachmentView | null>(null)
  const [deleting, setDeleting] = useState(false)

  const download = async (attachment: AttachmentView) => {
    try {
      const response = await fetch(`/api/requisitions/${requisitionId}/attachments/${attachment.id}/download`)
      if (!response.ok) throw new Error('Download failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error(`Couldn't download ${attachment.fileName}`)
    }
  }

  const upload = async () => {
    setUploading(true)
    try {
      for (const file of queued) {
        await uploadAttachment(requisitionId, file)
      }
      toast.success(`${queued.length} file${queued.length === 1 ? '' : 's'} uploaded`)
      setQueued([])
      onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
      onChange()
    } finally {
      setUploading(false)
    }
  }

  const remove = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/requisitions/${requisitionId}/attachments/${toDelete.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(getApiErrorMessage(await response.json().catch(() => null), 'Delete failed'))
      toast.success('Attachment removed')
      setToDelete(null)
      onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Paperclip className="h-4 w-4" /> Attachments
        </CardTitle>
        <CardDescription>
          {canManage ? 'Add supporting documents before submitting.' : 'Supporting documents for this requisition.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {attachments.length === 0 && !canManage ? (
          <EmptyState icon={Paperclip} title="No attachments" className="py-8" />
        ) : (
          attachments.length > 0 && (
            <ul className="divide-y rounded-lg border">
              {attachments.map(attachment => {
                const Icon = fileIconFor(attachment.fileType ?? '')
                return (
                  <li key={attachment.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{attachment.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.fileSize)} · {formatDate(attachment.uploadedAt)}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => download(attachment)} aria-label={`Download ${attachment.fileName}`}>
                      <Download />
                    </Button>
                    {canManage && (
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setToDelete(attachment)} aria-label={`Delete ${attachment.fileName}`}>
                        <Trash2 />
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )
        )}

        {canManage && (
          <>
            <FileDropzone files={queued} onChange={setQueued} existingCount={attachments.length} disabled={uploading} />
            {queued.length > 0 && (
              <Button onClick={upload} disabled={uploading}>
                {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
                Upload {queued.length} file{queued.length === 1 ? '' : 's'}
              </Button>
            )}
          </>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={open => !open && setToDelete(null)}
        title="Remove attachment?"
        description={<>This will permanently delete <span className="font-medium text-foreground">{toDelete?.fileName}</span>.</>}
        confirmText="Remove"
        destructive
        loading={deleting}
        onConfirm={remove}
      />
    </Card>
  )
}
