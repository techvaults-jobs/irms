'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Download, FileText, Trash2 } from 'lucide-react'

interface Attachment {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  uploadedAt: string
  uploadedBy?: {
    name: string
    email: string
  }
}

interface AttachmentListProps {
  requisitionId: string
  canDelete?: boolean
  onAttachmentDeleted?: () => void
}

export function AttachmentList({
  requisitionId,
  canDelete = false,
  onAttachmentDeleted,
}: AttachmentListProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchAttachments()
  }, [requisitionId])

  const fetchAttachments = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/requisitions/${requisitionId}/attachments`)
      if (!response.ok) {
        throw new Error('Failed to fetch attachments')
      }
      const data = await response.json()
      setAttachments(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async (attachmentId: string, fileName: string) => {
    try {
      const response = await fetch(
        `/api/requisitions/${requisitionId}/attachments/${attachmentId}/download`
      )
      if (!response.ok) {
        throw new Error('Failed to download attachment')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Download error:', err)
    }
  }

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return

    setIsDeleting(attachmentId)

    try {
      const response = await fetch(
        `/api/requisitions/${requisitionId}/attachments/${attachmentId}`,
        { method: 'DELETE' }
      )
      if (!response.ok) {
        throw new Error('Failed to delete attachment')
      }
      setAttachments(prev => prev.filter(a => a.id !== attachmentId))
      onAttachmentDeleted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete attachment')
    } finally {
      setIsDeleting(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('word') || fileType.includes('document')) return '📝'
    if (fileType.includes('sheet') || fileType.includes('excel')) return '📊'
    if (fileType.includes('image')) return '🖼️'
    if (fileType.includes('text')) return '📃'
    return '📎'
  }

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading attachments...</div>
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-red-600" />
        <p className="text-sm text-red-700">{error}</p>
      </div>
    )
  }

  if (attachments.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">No attachments</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {attachments.map(attachment => (
        <div
          key={attachment.id}
          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* File Icon */}
            <span className="text-2xl flex-shrink-0">
              {getFileIcon(attachment.fileType)}
            </span>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{attachment.fileName}</p>
              <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                <span>{formatFileSize(attachment.fileSize)}</span>
                <span>•</span>
                <span>{formatDate(attachment.uploadedAt)}</span>
                {attachment.uploadedBy && (
                  <>
                    <span>•</span>
                    <span>by {attachment.uploadedBy.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <button
              onClick={() => handleDownload(attachment.id, attachment.fileName)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Download attachment"
            >
              <Download className="w-5 h-5" />
            </button>
            {canDelete && (
              <button
                onClick={() => handleDelete(attachment.id)}
                disabled={isDeleting === attachment.id}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Delete attachment"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
        <p className="text-sm text-blue-700">
          <strong>Total attachments:</strong> {attachments.length}
        </p>
      </div>
    </div>
  )
}
