'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils'

interface FinancialSummaryProps {
  requisitionId: string
  estimatedCost: string | number
  approvedCost?: string | number | null
  actualCostPaid?: string | number | null
  currency: string
  status: string
  paymentMethod?: string | null
  paymentReference?: string | null
  paymentDate?: string | null
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

export function FinancialSummary({
  requisitionId,
  estimatedCost,
  approvedCost,
  actualCostPaid,
  currency,
  status,
  paymentMethod,
  paymentReference,
  paymentDate,
}: FinancialSummaryProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const estimatedNum = typeof estimatedCost === 'string' ? parseFloat(estimatedCost) : estimatedCost
  const approvedNum = approvedCost ? (typeof approvedCost === 'string' ? parseFloat(approvedCost) : approvedCost) : null
  const actualNum = actualCostPaid ? (typeof actualCostPaid === 'string' ? parseFloat(actualCostPaid) : actualCostPaid) : null

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A'
    return formatCurrencyUtil(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const calculateVariance = (approved: number | null, actual: number | null) => {
    if (!approved || !actual) return null
    return actual - approved
  }

  const calculateVariancePercentage = (approved: number | null, actual: number | null) => {
    if (!approved || !actual) return null
    return ((actual - approved) / approved) * 100
  }

  const variance = calculateVariance(approvedNum, actualNum)
  const variancePercentage = calculateVariancePercentage(approvedNum, actualNum)

  const getPaymentStatus = () => {
    if (status === 'PAID' || status === 'CLOSED') {
      return 'Paid'
    } else if (status === 'APPROVED') {
      return 'Pending Payment'
    } else if (status === 'REJECTED') {
      return 'Rejected'
    } else {
      return 'In Progress'
    }
  }

  const getPaymentStatusColor = () => {
    const paymentStatus = getPaymentStatus()
    switch (paymentStatus) {
      case 'Paid':
        return 'bg-green-100 text-green-800'
      case 'Pending Payment':
        return 'bg-yellow-100 text-yellow-800'
      case 'Rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Main Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Estimated Cost */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Estimated Cost</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(estimatedNum)}</p>
          <p className="text-xs text-gray-500 mt-1">Initial estimate</p>
        </div>

        {/* Approved Cost */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Approved Cost</p>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {formatCurrency(approvedNum)}
          </p>
          {approvedNum !== null && estimatedNum !== null && (
            <p className={`text-xs mt-1 ${approvedNum > estimatedNum ? 'text-red-600' : 'text-green-600'}`}>
              {approvedNum > estimatedNum ? '+' : ''}{formatCurrency(approvedNum - estimatedNum)}
            </p>
          )}
        </div>

        {/* Actual Cost Paid */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Actual Paid</p>
          <p className="text-2xl font-bold text-purple-600 mt-2">
            {formatCurrency(actualNum)}
          </p>
          {variance !== null && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {variance > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {variance > 0 ? '+' : ''}{formatCurrency(variance)}
            </p>
          )}
        </div>

        {/* Payment Status */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Payment Status</p>
          <div className="mt-2">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getPaymentStatusColor()}`}>
              {getPaymentStatus()}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Requisition: <span className={`font-semibold px-2 py-1 rounded text-xs ${STATUS_COLORS[status] || 'bg-gray-100'}`}>
              {status.replace(/_/g, ' ')}
            </span>
          </p>
        </div>
      </div>

      {/* Variance Analysis */}
      {approvedNum !== null && actualNum !== null && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 uppercase mb-4">Variance Analysis</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Approved Cost</span>
              <span className="font-semibold text-gray-900">{formatCurrency(approvedNum)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Actual Paid</span>
              <span className="font-semibold text-gray-900">{formatCurrency(actualNum)}</span>
            </div>
            <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
              <span className="text-gray-600 font-medium">Variance</span>
              <div className="text-right">
                <p className={`text-lg font-bold ${variance && variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {variance && variance > 0 ? '+' : ''}{formatCurrency(variance)}
                </p>
                <p className={`text-sm ${variance && variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {variance && variance > 0 ? '+' : ''}{variancePercentage?.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Details */}
      {(paymentMethod || paymentReference || paymentDate) && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 uppercase mb-4">Payment Details</h3>
          <div className="space-y-3">
            {paymentMethod && (
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method</span>
                <span className="font-medium text-gray-900">{paymentMethod}</span>
              </div>
            )}
            {paymentReference && (
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Reference</span>
                <span className="font-medium text-gray-900 font-mono text-sm">{paymentReference}</span>
              </div>
            )}
            {paymentDate && (
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Date</span>
                <span className="font-medium text-gray-900">{formatDate(paymentDate)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cost Breakdown */}
      {approvedNum !== null && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 uppercase mb-4">Cost Breakdown</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Estimated</span>
                <span className="text-sm font-medium text-gray-900">{formatCurrency(estimatedNum)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Approved</span>
                <span className="text-sm font-medium text-gray-900">{formatCurrency(approvedNum)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${approvedNum > estimatedNum ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${(approvedNum / estimatedNum) * 100}%` }}
                />
              </div>
            </div>

            {actualNum !== null && (
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Actual Paid</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(actualNum)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${actualNum > approvedNum ? 'bg-red-500' : 'bg-purple-500'}`}
                    style={{ width: `${(actualNum / approvedNum) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Legend */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <p className="text-xs font-semibold text-gray-600 uppercase mb-3">Status Legend</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-gray-600">Estimated</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-gray-600">Approved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full" />
            <span className="text-gray-600">Actual Paid</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-gray-600">Over Budget</span>
          </div>
        </div>
      </div>
    </div>
  )
}
