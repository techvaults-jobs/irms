'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Download, FileText } from 'lucide-react'
import { FinancialSummary } from './FinancialSummary'
import { PaymentRecordingForm } from './PaymentRecordingForm'
import { AuditTrailViewer } from './AuditTrailViewer'
import { ApprovalAction } from './ApprovalAction'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency } from '@/lib/utils'

interface Attachment {
  id: string
  fileName: string
  fileSize: number
  uploadedAt: string
}

interface AuditEntry {
  id: string
  changeType: string
  fieldName?: string
  previousValue?: string
  newValue?: string
  timestamp: string
  user?: {
    name: string
    email: string
  }
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

interface RequisitionDetailProps {
  requisitionId: string
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  PAID: 'bg-purple-100 text-purple-800',
  CLOSED: 'bg-gray-200 text-gray-900',
}

export function RequisitionDetail({ requisitionId }: RequisitionDetailProps) {
  const { user } = useAuth()
  const [requisition, setRequisition] = useState<any>(null)
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'attachments' | 'financial' | 'payment' | 'approval'>('details')

  useEffect(() => {
    fetchRequisitionDetails()
  }, [requisitionId])

  const fetchRequisitionDetails = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch requisition details
      const reqResponse = await fetch(`/api/requisitions/${requisitionId}`)
      if (!reqResponse.ok) {
        throw new Error('Failed to fetch requisition')
      }
      const reqData = await reqResponse.json()
      setRequisition(reqData)

      // Fetch audit trail
      const auditResponse = await fetch(`/api/requisitions/${requisitionId}/audit-trail`)
      if (auditResponse.ok) {
        const auditData = await auditResponse.json()
        setAuditTrail(auditData.data || [])
      }

      // Fetch attachments
      const attachResponse = await fetch(`/api/requisitions/${requisitionId}/attachments`)
      if (attachResponse.ok) {
        const attachData = await attachResponse.json()
        setAttachments(attachData.data || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const handleDownloadAttachment = async (attachmentId: string, fileName: string) => {
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

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading requisition details...</div>
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-red-600" />
        <p className="text-sm text-red-700">{error}</p>
      </div>
    )
  }

  if (!requisition) {
    return <div className="p-8 text-center text-gray-500">Requisition not found</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{requisition.title}</h1>
            <p className="text-sm text-gray-600 mt-1">ID: {requisition.id}</p>
          </div>
          <span
            className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
              STATUS_COLORS[requisition.status] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {requisition.status.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase">Estimated Cost</p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {formatCurrency(requisition.estimatedCost, requisition.currency)}
            </p>
          </div>
          {requisition.approvedCost && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">Approved Cost</p>
              <p className="text-lg font-bold text-green-600 mt-1">
                {formatCurrency(requisition.approvedCost, requisition.currency)}
              </p>
            </div>
          )}
          {requisition.actualCostPaid && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">Actual Paid</p>
              <p className="text-lg font-bold text-purple-600 mt-1">
                {formatCurrency(requisition.actualCostPaid, requisition.currency)}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase">Urgency</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{requisition.urgencyLevel}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-3 font-medium border-b-2 whitespace-nowrap ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('financial')}
            className={`px-4 py-3 font-medium border-b-2 whitespace-nowrap ${
              activeTab === 'financial'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Financial
          </button>
          {requisition?.status === 'APPROVED' && (
            <button
              onClick={() => setActiveTab('payment')}
              className={`px-4 py-3 font-medium border-b-2 whitespace-nowrap ${
                activeTab === 'payment'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Record Payment
            </button>
          )}
          {requisition?.status === 'SUBMITTED' || requisition?.status === 'UNDER_REVIEW' && (user?.role === 'MANAGER' || user?.role === 'FINANCE' || user?.role === 'ADMIN') && (
            <button
              onClick={() => setActiveTab('approval')}
              className={`px-4 py-3 font-medium border-b-2 whitespace-nowrap ${
                activeTab === 'approval'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Approve/Reject
            </button>
          )}
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 font-medium border-b-2 whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Status History
          </button>
          <button
            onClick={() => setActiveTab('attachments')}
            className={`px-4 py-3 font-medium border-b-2 whitespace-nowrap ${
              activeTab === 'attachments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Attachments ({attachments.length})
          </button>
        </div>
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Category</h3>
            <p className="text-gray-900">{requisition.category}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Description</h3>
            <p className="text-gray-900 whitespace-pre-wrap">{requisition.description}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Business Justification</h3>
            <p className="text-gray-900 whitespace-pre-wrap">{requisition.businessJustification}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Submitted By</h3>
              <p className="text-gray-900">{requisition.submitter?.name}</p>
              <p className="text-sm text-gray-600">{requisition.submitter?.email}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Department</h3>
              <p className="text-gray-900">{requisition.department?.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Created</h3>
              <p className="text-gray-900">{formatDate(requisition.createdAt)}</p>
            </div>

            {requisition.paymentDate && (
              <div>
                <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Payment Date</h3>
                <p className="text-gray-900">{formatDate(requisition.paymentDate)}</p>
              </div>
            )}
          </div>

          {/* Approval Steps */}
          {requisition.approvalSteps && requisition.approvalSteps.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 uppercase mb-4">Approval Steps</h3>
              <div className="space-y-3">
                {requisition.approvalSteps.map((step: ApprovalStep) => (
                  <div key={step.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">Step {step.stepNumber}: {step.requiredRole}</p>
                        {step.assignedUser && (
                          <p className="text-sm text-gray-600">{step.assignedUser.name}</p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
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
                      <p className="text-sm text-gray-700 mt-2">Comment: {step.approverComment}</p>
                    )}
                    {step.approvedAt && (
                      <p className="text-xs text-gray-600 mt-2">{formatDate(step.approvedAt)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <AuditTrailViewer requisitionId={requisitionId} />
      )}

      {/* Attachments Tab */}
      {activeTab === 'attachments' && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          {attachments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No attachments</p>
          ) : (
            <div className="space-y-3">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{attachment.fileName}</p>
                      <p className="text-xs text-gray-600">
                        {formatFileSize(attachment.fileSize)} • {formatDate(attachment.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadAttachment(attachment.id, attachment.fileName)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Financial Tab */}
      {activeTab === 'financial' && (
        <FinancialSummary
          requisitionId={requisitionId}
          estimatedCost={requisition.estimatedCost}
          approvedCost={requisition.approvedCost}
          actualCostPaid={requisition.actualCostPaid}
          currency={requisition.currency}
          status={requisition.status}
          paymentMethod={requisition.paymentMethod}
          paymentReference={requisition.paymentReference}
          paymentDate={requisition.paymentDate}
        />
      )}

      {/* Payment Recording Tab */}
      {activeTab === 'payment' && requisition?.status === 'APPROVED' && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Record Payment</h2>
          <PaymentRecordingForm
            requisitionId={requisitionId}
            approvedCost={requisition.approvedCost || requisition.estimatedCost}
            currency={requisition.currency}
            onPaymentRecorded={() => {
              fetchRequisitionDetails()
              setActiveTab('financial')
            }}
          />
        </div>
      )}

      {/* Approval Tab */}
      {activeTab === 'approval' && (
        <div>
          <ApprovalAction
            requisitionId={requisitionId}
            action="approve"
            onSuccess={() => {
              fetchRequisitionDetails()
              setActiveTab('details')
            }}
          />
          <div className="mt-6">
            <ApprovalAction
              requisitionId={requisitionId}
              action="reject"
              onSuccess={() => {
                fetchRequisitionDetails()
                setActiveTab('details')
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
