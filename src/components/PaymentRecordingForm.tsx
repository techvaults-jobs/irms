'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { Decimal } from '@prisma/client/runtime/library'
import { formatCurrency } from '@/lib/utils'

interface PaymentRecordingFormProps {
  requisitionId: string
  approvedCost: string | number
  currency: string
  onPaymentRecorded?: () => void
}

export function PaymentRecordingForm({
  requisitionId,
  approvedCost,
  currency,
  onPaymentRecorded,
}: PaymentRecordingFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [showVarianceWarning, setShowVarianceWarning] = useState(false)

  const [formData, setFormData] = useState({
    actualCostPaid: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    paymentReference: '',
    paymentComment: '',
  })

  const approvedCostNum = typeof approvedCost === 'string' ? parseFloat(approvedCost) : approvedCost
  const actualCostNum = formData.actualCostPaid ? parseFloat(formData.actualCostPaid) : 0
  const variance = actualCostNum > 0 ? (actualCostNum - approvedCostNum) / approvedCostNum : 0
  const varianceThreshold = 0.1 // 10%
  const exceedsThreshold = variance > varianceThreshold

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.actualCostPaid) {
      errors.actualCostPaid = 'Actual cost paid is required'
    } else if (parseFloat(formData.actualCostPaid) <= 0) {
      errors.actualCostPaid = 'Actual cost paid must be greater than 0'
    }

    if (!formData.paymentDate) {
      errors.paymentDate = 'Payment date is required'
    }

    if (!formData.paymentMethod.trim()) {
      errors.paymentMethod = 'Payment method is required'
    }

    if (!formData.paymentReference.trim()) {
      errors.paymentReference = 'Payment reference is required'
    }

    if (exceedsThreshold && !formData.paymentComment.trim()) {
      errors.paymentComment = 'Comment is required when payment exceeds approved cost by more than 10%'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: '',
      }))
    }

    // Check for variance warning
    if (name === 'actualCostPaid' && value) {
      const actual = parseFloat(value)
      const var_pct = (actual - approvedCostNum) / approvedCostNum
      setShowVarianceWarning(var_pct > varianceThreshold)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/requisitions/${requisitionId}/record-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to record payment')
      }

      setSuccess(true)
      setFormData({
        actualCostPaid: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Bank Transfer',
        paymentReference: '',
        paymentComment: '',
      })

      setTimeout(() => {
        onPaymentRecorded?.()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-sm text-green-700">Payment recorded successfully!</p>
        </div>
      )}

      {/* Approved Cost Display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm font-medium text-blue-900">Approved Cost</p>
        <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(approvedCostNum)}</p>
      </div>

      {/* Actual Cost Paid */}
      <div>
        <label htmlFor="actualCostPaid" className="block text-sm font-medium text-gray-700 mb-1">
          Actual Cost Paid *
        </label>
        <input
          type="number"
          id="actualCostPaid"
          name="actualCostPaid"
          value={formData.actualCostPaid}
          onChange={handleInputChange}
          step="0.01"
          min="0"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            validationErrors.actualCostPaid ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="0.00"
        />
        {validationErrors.actualCostPaid && (
          <p className="text-sm text-red-600 mt-1">{validationErrors.actualCostPaid}</p>
        )}
        {formData.actualCostPaid && (
          <div className="mt-2 text-sm">
            <p className="text-gray-600">
              Variance: {variance > 0 ? '+' : ''}{(variance * 100).toFixed(2)}%
            </p>
            {showVarianceWarning && (
              <p className="text-yellow-600 font-medium">
                ⚠️ Payment exceeds approved cost by more than 10%. A comment is required.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Payment Date */}
      <div>
        <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700 mb-1">
          Payment Date *
        </label>
        <input
          type="date"
          id="paymentDate"
          name="paymentDate"
          value={formData.paymentDate}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            validationErrors.paymentDate ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {validationErrors.paymentDate && (
          <p className="text-sm text-red-600 mt-1">{validationErrors.paymentDate}</p>
        )}
      </div>

      {/* Payment Method */}
      <div>
        <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
          Payment Method *
        </label>
        <select
          id="paymentMethod"
          name="paymentMethod"
          value={formData.paymentMethod}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            validationErrors.paymentMethod ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="Bank Transfer">Bank Transfer</option>
          <option value="Check">Check</option>
          <option value="Credit Card">Credit Card</option>
          <option value="Internal Transfer">Internal Transfer</option>
          <option value="Cash">Cash</option>
          <option value="Other">Other</option>
        </select>
        {validationErrors.paymentMethod && (
          <p className="text-sm text-red-600 mt-1">{validationErrors.paymentMethod}</p>
        )}
      </div>

      {/* Payment Reference */}
      <div>
        <label htmlFor="paymentReference" className="block text-sm font-medium text-gray-700 mb-1">
          Payment Reference *
        </label>
        <input
          type="text"
          id="paymentReference"
          name="paymentReference"
          value={formData.paymentReference}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            validationErrors.paymentReference ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g., TXN-12345 or Check #789"
        />
        {validationErrors.paymentReference && (
          <p className="text-sm text-red-600 mt-1">{validationErrors.paymentReference}</p>
        )}
      </div>

      {/* Payment Comment */}
      <div>
        <label htmlFor="paymentComment" className="block text-sm font-medium text-gray-700 mb-1">
          Comment {exceedsThreshold && '*'}
        </label>
        <textarea
          id="paymentComment"
          name="paymentComment"
          value={formData.paymentComment}
          onChange={handleInputChange}
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            validationErrors.paymentComment ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder={
            exceedsThreshold
              ? 'Required: Explain why payment exceeds approved cost'
              : 'Optional: Add any notes about this payment'
          }
        />
        {validationErrors.paymentComment && (
          <p className="text-sm text-red-600 mt-1">{validationErrors.paymentComment}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Recording Payment...' : 'Record Payment'}
        </button>
      </div>
    </form>
  )
}
