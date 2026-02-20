'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, MessageSquare } from 'lucide-react'

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

interface ApprovalActionsProps {
  requisitionId: string
  onSuccess?: () => void
  compact?: boolean
  initialAction?: 'approve' | 'reject'
}

export function ApprovalActions({ requisitionId, onSuccess, compact = false, initialAction }: ApprovalActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [comment, setComment] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [approvalSteps, setApprovalSteps] = useState<ApprovalStep[]>([])
  const [stepsLoading, setStepsLoading] = useState(true)

  useEffect(() => {
    fetchApprovalSteps()
  }, [requisitionId])

  // Auto-open modal based on initialAction prop (from URL params)
  useEffect(() => {
    if (initialAction === 'approve' && !stepsLoading) {
      const hasPendingSteps = approvalSteps.some(step => step.status === 'PENDING')
      if (hasPendingSteps) {
        setShowApproveModal(true)
      }
    } else if (initialAction === 'reject' && !stepsLoading) {
      const hasPendingSteps = approvalSteps.some(step => step.status === 'PENDING')
      if (hasPendingSteps) {
        setShowRejectModal(true)
      }
    }
  }, [initialAction, stepsLoading, approvalSteps])

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

  const handleApprove = async () => {
    setValidationError(null)
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch(`/api/requisitions/${requisitionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: comment.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to approve requisition')
      }

      setSuccess('approved')
      setShowApproveModal(false)
      setComment('')
      setTimeout(() => {
        if (onSuccess) {
          onSuccess()
        } else {
          window.location.reload()
        }
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = async () => {
    setValidationError(null)
    setError(null)

    if (!comment.trim()) {
      setValidationError('Rejection reason is required')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/requisitions/${requisitionId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: comment.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reject requisition')
      }

      setSuccess('rejected')
      setShowRejectModal(false)
      setComment('')
      setTimeout(() => {
        if (onSuccess) {
          onSuccess()
        } else {
          window.location.reload()
        }
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const hasPendingSteps = approvalSteps.some(step => step.status === 'PENDING')
  const currentStep = approvalSteps.find(step => step.status === 'PENDING')

  // Don't show if no pending steps
  if (!stepsLoading && !hasPendingSteps) {
    return null
  }

  // Compact version for inline use
  if (compact) {
    return (
      <>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowApproveModal(true)
              setError(null)
              setComment('')
            }}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-success-600 hover:bg-success-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2"
          >
            <CheckCircle className="w-5 h-5" />
            Approve
          </button>
          <button
            onClick={() => {
              setShowRejectModal(true)
              setError(null)
              setComment('')
            }}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-error-600 hover:bg-error-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2"
          >
            <XCircle className="w-5 h-5" />
            Reject
          </button>
        </div>

        {/* Approve Modal */}
        {showApproveModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              if (!isLoading) {
                setShowApproveModal(false)
                setComment('')
                setError(null)
              }
            }}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Approve Requisition</h3>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="approve-comment" className="block text-sm font-medium text-gray-700 mb-2">
                  <MessageSquare className="w-4 h-4 inline mr-1" />
                  Comment (Optional)
                </label>
                <textarea
                  id="approve-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-success-500 focus:border-success-500 transition-all"
                  placeholder="Add any comments about your approval..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowApproveModal(false)
                    setComment('')
                    setError(null)
                  }}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-success-600 hover:bg-success-700 rounded-lg disabled:opacity-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2"
                >
                  {isLoading ? 'Approving...' : 'Confirm Approval'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              if (!isLoading) {
                setShowRejectModal(false)
                setComment('')
                setError(null)
                setValidationError(null)
              }
            }}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-error-100 rounded-lg">
                  <XCircle className="w-6 h-6 text-error-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Reject Requisition</h3>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="reject-comment" className="block text-sm font-medium text-gray-700 mb-2">
                  <MessageSquare className="w-4 h-4 inline mr-1" />
                  Rejection Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="reject-comment"
                  value={comment}
                  onChange={(e) => {
                    setComment(e.target.value)
                    if (validationError) setValidationError(null)
                  }}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    validationError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-red-500'
                  }`}
                  placeholder="Please explain why you are rejecting this requisition..."
                  required
                />
                {validationError && (
                  <p className="text-sm text-error-600 mt-1 font-medium">{validationError}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">This reason will be sent to the submitter</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false)
                    setComment('')
                    setError(null)
                    setValidationError(null)
                  }}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-error-600 hover:bg-error-700 rounded-lg disabled:opacity-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2"
                >
                  {isLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // Full version with prominent display
  return (
    <div className="bg-gradient-to-r from-red-50 via-red-100/50 to-red-50 border-2 border-brand-primary/30 rounded-xl p-6 shadow-lg">
      {success && (
        <div className="flex items-center gap-2 p-4 bg-success-50 border border-success-200 rounded-xl mb-4">
          <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0" />
          <p className="text-sm font-medium text-success-700">
            Requisition {success === 'approved' ? 'approved' : 'rejected'} successfully!
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-error-50 border border-error-200 rounded-xl mb-4">
          <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0" />
          <p className="text-sm text-error-700 font-medium">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-brand-primary bg-opacity-10 rounded-lg">
          <CheckCircle className="w-6 h-6 text-brand-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Action Required</h3>
          {currentStep && (
            <p className="text-sm text-gray-600">
              Your approval is required as {currentStep.requiredRole}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => {
            setShowApproveModal(true)
            setError(null)
            setComment('')
          }}
          disabled={isLoading || !hasPendingSteps}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-success-600 hover:bg-success-700 text-white font-bold text-lg rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2"
        >
          <CheckCircle className="w-6 h-6" />
          Approve
        </button>
        <button
          onClick={() => {
            setShowRejectModal(true)
            setError(null)
            setComment('')
          }}
          disabled={isLoading || !hasPendingSteps}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-error-600 hover:bg-error-700 text-white font-bold text-lg rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2"
        >
          <XCircle className="w-6 h-6" />
          Reject
        </button>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            if (!isLoading) {
              setShowApproveModal(false)
              setComment('')
              setError(null)
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-success-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-success-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Approve Requisition</h3>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-error-50 border border-error-200 rounded-xl mb-4">
                <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0" />
                <p className="text-sm text-error-700 font-medium">{error}</p>
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="approve-comment-full" className="block text-sm font-medium text-gray-700 mb-2">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                Comment (Optional)
              </label>
              <textarea
                id="approve-comment-full"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-success-500 focus:border-success-500 transition-all"
                placeholder="Add any comments about your approval..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApproveModal(false)
                  setComment('')
                  setError(null)
                }}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-success-600 hover:bg-success-700 rounded-lg disabled:opacity-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2"
              >
                {isLoading ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            if (!isLoading) {
              setShowRejectModal(false)
              setComment('')
              setError(null)
              setValidationError(null)
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Reject Requisition</h3>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-error-50 border border-error-200 rounded-xl mb-4">
                <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0" />
                <p className="text-sm text-error-700 font-medium">{error}</p>
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="reject-comment-full" className="block text-sm font-medium text-gray-700 mb-2">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                Rejection Reason <span className="text-red-600">*</span>
              </label>
              <textarea
                id="reject-comment-full"
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value)
                  if (validationError) setValidationError(null)
                }}
                rows={4}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  validationError ? 'border-error-500 focus:ring-error-500' : 'border-gray-300 focus:ring-error-500'
                }`}
                placeholder="Please explain why you are rejecting this requisition..."
                required
              />
              {validationError && (
                <p className="text-sm text-red-600 mt-1">{validationError}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">This reason will be sent to the submitter</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setComment('')
                  setError(null)
                  setValidationError(null)
                }}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-error-600 hover:bg-error-700 rounded-lg disabled:opacity-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2"
              >
                {isLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
