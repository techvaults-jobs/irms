'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, AlertCircle, FileText, Download } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Attachment {
  id: string
  fileName: string
  fileSize: number
  uploadedAt: string
}

interface ApprovalStep {
  id: string
  stepNumber: number
  requiredRole: string
  status: string
  approverComment?: string
  approvedAt?: string
  assignedUser?: {
    name: string
    email: string
  }
}

interface Requisition {
  id: string
  title: string
  category: string
  estimatedCost: string | number
  currency: string
  urgencyLevel: string
  status: string
  submitter?: {
    name: string
    email: string
  }
  department?: {
    name: string
  }
  createdAt: string
  approvalSteps?: ApprovalStep[]
  attachments?: Attachment[]
}

const URGENCY_COLORS: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
}

export function ApprovalQueue() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<Record<string, Attachment[]>>({})

  const pageSize = 10

  useEffect(() => {
    fetchPendingRequisitions()
  }, [currentPage])

  const fetchPendingRequisitions = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        status: 'UNDER_REVIEW',
        skip: ((currentPage - 1) * pageSize).toString(),
        take: pageSize.toString(),
      })

      const response = await fetch(`/api/requisitions?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch pending requisitions')
      }

      const data = await response.json()
      setRequisitions(data.data || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAttachments = async (requisitionId: string) => {
    try {
      const response = await fetch(`/api/requisitions/${requisitionId}/attachments`)
      if (response.ok) {
        const data = await response.json()
        setAttachments(prev => ({
          ...prev,
          [requisitionId]: data.data || [],
        }))
      }
    } catch (err) {
      console.error('Failed to fetch attachments:', err)
    }
  }

  const handleExpandRequisition = (requisitionId: string) => {
    if (expandedId === requisitionId) {
      setExpandedId(null)
    } else {
      setExpandedId(requisitionId)
      if (!attachments[requisitionId]) {
        fetchAttachments(requisitionId)
      }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const handleDownloadAttachment = async (requisitionId: string, attachmentId: string, fileName: string) => {
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

  const totalPages = Math.ceil(totalCount / pageSize)

  if (isLoading && requisitions.length === 0) {
    return <div className="p-8 text-center text-gray-500">Loading pending requisitions...</div>
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {requisitions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No requisitions pending your approval</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {requisitions.map((req) => (
              <div key={req.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
                {/* Header */}
                <div
                  onClick={() => handleExpandRequisition(req.id)}
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{req.title}</h3>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            URGENCY_COLORS[req.urgencyLevel] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {req.urgencyLevel}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{req.category}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase">Amount</p>
                          <p className="text-sm font-bold text-gray-900 mt-1">
                            {formatCurrency(req.estimatedCost, req.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase">Submitted By</p>
                          <p className="text-sm font-medium text-gray-900 mt-1">{req.submitter?.name}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase">Department</p>
                          <p className="text-sm font-medium text-gray-900 mt-1">{req.department?.name}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase">Submitted</p>
                          <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(req.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <button
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleExpandRequisition(req.id)
                        }}
                      >
                        <ChevronRight
                          className={`w-5 h-5 text-gray-600 transition-transform ${
                            expandedId === req.id ? 'rotate-90' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === req.id && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                    {/* Approval Steps */}
                    {req.approvalSteps && req.approvalSteps.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Approval Steps</h4>
                        <div className="space-y-2">
                          {req.approvalSteps.map((step) => (
                            <div key={step.id} className="bg-white border border-gray-200 rounded p-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    Step {step.stepNumber}: {step.requiredRole}
                                  </p>
                                  {step.assignedUser && (
                                    <p className="text-xs text-gray-600 mt-1">{step.assignedUser.name}</p>
                                  )}
                                </div>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-semibold ${
                                    step.status === 'APPROVED'
                                      ? 'bg-green-100 text-green-800'
                                      : step.status === 'REJECTED'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {step.status}
                                </span>
                              </div>
                              {step.approverComment && (
                                <p className="text-xs text-gray-700 mt-2">Comment: {step.approverComment}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Attachments */}
                    {attachments[req.id] && attachments[req.id].length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Attachments</h4>
                        <div className="space-y-2">
                          {attachments[req.id].map((attachment) => (
                            <div
                              key={attachment.id}
                              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{attachment.fileName}</p>
                                  <p className="text-xs text-gray-600">{formatFileSize(attachment.fileSize)}</p>
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  handleDownloadAttachment(req.id, attachment.id, attachment.fileName)
                                }
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      <Link
                        href={`/requisitions/${req.id}`}
                        className="flex-1 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-center"
                      >
                        View Full Details
                      </Link>
                      <Link
                        href={`/requisitions/${req.id}?action=approve`}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors text-center"
                      >
                        Approve
                      </Link>
                      <Link
                        href={`/requisitions/${req.id}?action=reject`}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors text-center"
                      >
                        Reject
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-gray-600">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, totalCount)} of {totalCount} requisitions
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
