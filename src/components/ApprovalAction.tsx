'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle } from 'lucide-react'

interface ApprovalStep {
  id: string
  stepNumber: number
  requiredRole: string
  status: string
  approverComment?: string
  approvedAt?: string
  assignedUser?: {
    id: string
    name: string
    email: string
  }
}

interface ApprovalActionProps {
  requisitionId: string
  action: 'approve' | 'reject'
  onSuccess?: () => void
}

export function ApprovalAction({ requisitionId, action, onSuccess }: ApprovalActionProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [comment, setComment] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [approvalSteps, setApprovalSteps] = useState<ApprovalStep[]>([])
  const [stepsLoading, setStepsLoading] = useState(true)

  useEffect(() => {
    fetchApprovalSteps()
  }, [requisitionId])

  const fetchApprovalSteps = async () => {
    try {
      const response = await fetch(`/api/requisitions/${requisitionId}`)
      if (response.ok) {
        const data = await response.json()
        setApprovalSteps(data.approvalSteps || [])
      }
    } catch (err) {
      console.error('Failed to fetch approval steps:', err)
    } finally {
      setStepsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)
    setError(null)

    // Validate comment for rejection
    if (action === 'reject' && !comment.trim()) {
      setValidationError('Rejection comment is required')
      return
    }

    setIsLoading(true)

    try {
      const endpoint =
        action === 'approve'
          ? `/api/requisitions/${requisitionId}/approve`
          : `/api/requisitions/${requisitionId}/reject`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: comment || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${action} requisition`)
      }

      setSuccess(true)
      setTimeout(() => {
        if (onSuccess) {
          onSuccess()
        } else {
          // Force a hard refresh to get the latest data
          window.location.reload()
        }
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const isApprove = action === 'approve'
  const buttonColor = isApprove ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
  const buttonText = isApprove ? 'Approve Requisition' : 'Reject Requisition'
  const title = isApprove ? 'Approve Requisition' : 'Reject Requisition'

  // Only show approve button if there are pending steps
  const hasPendingSteps = approvalSteps.some(step => step.status === 'PENDING')

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-sm text-green-700">
            {isApprove ? 'Requisition approved successfully!' : 'Requisition rejected successfully!'}
          </p>
        </div>
      )}

      {/* Approval Steps Display */}
      {!stepsLoading && approvalSteps.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Approval Steps</h3>
          <div className="space-y-2">
            {approvalSteps.map((step) => (
              <div key={step.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Step {step.stepNumber}: {step.requiredRole}
                  </p>
                  {step.assignedUser && (
                    <p className="text-xs text-gray-600">{step.assignedUser.name}</p>
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
            ))}
          </div>
        </div>
      )}

      {/* No Pending Steps Message */}
      {!stepsLoading && !hasPendingSteps && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">No pending approval steps</p>
        </div>
      )}

      {/* Only show form if there are pending steps */}
      {hasPendingSteps && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
              {isApprove ? 'Approval Comment (Optional)' : 'Rejection Reason (Required) *'}
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => {
                setComment(e.target.value)
                if (validationError) {
                  setValidationError(null)
                }
              }}
              rows={5}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationError ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={
                isApprove
                  ? 'Add any comments about your approval (optional)'
                  : 'Please explain why you are rejecting this requisition'
              }
            />
            {validationError && (
              <p className="text-sm text-red-600 mt-2">{validationError}</p>
            )}
            <p className="text-xs text-gray-600 mt-2">
              {isApprove
                ? 'Your comment will be recorded in the audit trail'
                : 'Your rejection reason will be sent to the submitter and recorded in the audit trail'}
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors ${buttonColor}`}
            >
              {isLoading ? `${isApprove ? 'Approving' : 'Rejecting'}...` : buttonText}
            </button>
          </div>
        </form>
      )}

      {/* Info Box */}
      {hasPendingSteps && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> {isApprove
              ? 'Once you approve this requisition, it will be routed to the next approver or Finance for payment processing.'
              : 'Once you reject this requisition, the submitter will be notified and the requisition will be marked as rejected.'}
          </p>
        </div>
      )}
    </div>
  )
}
