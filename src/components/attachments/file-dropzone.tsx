'use client'

import { useRef, useState } from 'react'
import { File as FileIcon, FileImage, FileSpreadsheet, FileText, UploadCloud, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatFileSize } from '@/lib/utils'

export const MAX_ATTACHMENTS = 5
export const MAX_FILE_SIZE = 10 * 1024 * 1024
export const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt,.csv'

export function fileIconFor(type: string) {
  if (type.startsWith('image/')) return FileImage
  if (type.includes('sheet') || type.includes('excel') || type === 'text/csv') return FileSpreadsheet
  if (type === 'application/pdf' || type.includes('word') || type === 'text/plain') return FileText
  return FileIcon
}

export async function uploadAttachment(requisitionId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`/api/requisitions/${requisitionId}/attachments`, { method: 'POST', body: formData })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    const error = data?.error
    throw new Error(typeof error === 'string' ? error : error?.reason || `Failed to upload ${file.name}`)
  }
  return response.json()
}

interface FileDropzoneProps {
  files: File[]
  onChange: (files: File[]) => void
  existingCount?: number
  disabled?: boolean
}

/**
 * Collects files client-side; the caller uploads them once the
 * requisition exists (uploads are only accepted on drafts).
 */
export function FileDropzone({ files, onChange, existingCount = 0, disabled }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const remaining = MAX_ATTACHMENTS - existingCount - files.length

  const addFiles = (incoming: File[]) => {
    const problems: string[] = []
    const accepted: File[] = []
    for (const file of incoming) {
      if (accepted.length >= remaining) {
        problems.push(`Only ${MAX_ATTACHMENTS} attachments are allowed per requisition`)
        break
      }
      if (!ALLOWED_TYPES.includes(file.type)) problems.push(`${file.name}: file type not supported`)
      else if (file.size > MAX_FILE_SIZE) problems.push(`${file.name}: larger than 10 MB`)
      else accepted.push(file)
    }
    setErrors(problems)
    if (accepted.length) onChange([...files, ...accepted])
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && remaining > 0 && inputRef.current?.click()}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={e => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault()
          setDragging(false)
          if (!disabled) addFiles(Array.from(e.dataTransfer.files))
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'hover:border-primary/50 hover:bg-accent/40',
          (disabled || remaining <= 0) && 'cursor-not-allowed opacity-60'
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UploadCloud className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium">
          {remaining > 0 ? 'Drop files here or click to browse' : 'Attachment limit reached'}
        </p>
        <p className="text-xs text-muted-foreground">PDF, images, Word, Excel, TXT or CSV · up to 10 MB · {Math.max(0, remaining)} remaining</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={e => {
            addFiles(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
        />
      </div>

      {errors.length > 0 && (
        <ul className="space-y-1 text-xs text-destructive">
          {errors.map(err => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {files.map((file, index) => {
            const Icon = fileIconFor(file.type)
            return (
              <li key={`${file.name}-${index}`} className="flex items-center gap-3 px-3 py-2">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onChange(files.filter((_, i) => i !== index))}
                  aria-label={`Remove ${file.name}`}
                  disabled={disabled}
                >
                  <X />
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
