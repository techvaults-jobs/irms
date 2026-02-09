'use client'

import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/DashboardLayout'
import { useState, useEffect } from 'react'
import { BarChart3, Download, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface ReportData {
  title?: string
  description?: string
  data: any[]
  columns?: string[]
  summary?: Record<string, any>
}

export default function ReportsPage() {
  const { isLoading } = useAuth()
  const [reportType, setReportType] = useState('monthly-spending')
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [isLoading2, setIsLoading2] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

  const reportTypes = [
    { id: 'monthly-spending', label: 'Monthly Spending', description: 'Track spending by month' },
    { id: 'category-spending', label: 'Category Breakdown', description: 'Analyze spending by category' },
    { id: 'department-spending', label: 'Department Spending', description: 'View department-wise spending' },
    { id: 'approval-status', label: 'Approval Status', description: 'Monitor approval progress' },
  ]

  const fetchReport = async () => {
    setIsLoading2(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      })

      const response = await fetch(`/api/reports/${reportType}?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch report')
      }

      const data = await response.json()
      
      // Sort data by date if it contains a date field
      if (data.data && Array.isArray(data.data)) {
        const dateFields = ['date', 'createdAt', 'submittedAt', 'approvedAt', 'paidAt', 'month']
        const dateField = dateFields.find((field: string) => 
          data.data.some((row: any) => row[field])
        )
        
        if (dateField) {
          data.data.sort((a: any, b: any) => {
            const dateA = new Date(a[dateField])
            const dateB = new Date(b[dateField])
            return dateB.getTime() - dateA.getTime() // Newest first
          })
        }
      }
      
      setReportData(data)
      setExpandedDates(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading2(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [reportType, startDate, endDate])

  // Group data by date
  const groupedByDate = reportData?.data?.reduce((acc: Record<string, any[]>, row: any) => {
    const dateFields = ['date', 'createdAt', 'submittedAt', 'approvedAt', 'paidAt', 'month']
    const dateField = dateFields.find((field: string) => row[field])
    
    if (dateField) {
      const date = new Date(row[dateField])
      const dateKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      if (!acc[dateKey]) acc[dateKey] = []
      acc[dateKey].push(row)
    } else {
      if (!acc['Other']) acc['Other'] = []
      acc['Other'].push(row)
    }
    return acc
  }, {}) || {}

  const toggleDateExpanded = (date: string) => {
    const newSet = new Set(expandedDates)
    if (newSet.has(date)) {
      newSet.delete(date)
    } else {
      newSet.add(date)
    }
    setExpandedDates(newSet)
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">View and analyze financial data by transaction</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Report Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {reportTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Export Button */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  const params = new URLSearchParams({ startDate, endDate })
                  window.location.href = `/api/reports/${reportType}/export?${params}`
                }}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Download size={18} />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Report Display */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {isLoading2 ? (
          <div className="flex items-center justify-center p-12 bg-white rounded-lg border border-gray-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
          </div>
        ) : reportData ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            {reportData.summary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Object.entries(reportData.summary).map(([key, value]: [string, any]) => {
                  // Format key with spaces
                  const formattedKey = key
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/([a-z])([A-Z])/g, '$1 $2')
                    .replace(/_/g, ' ')
                    .trim()
                    .split(' ')
                    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')
                  
                  // Convert Decimal strings to numbers
                  let displayValue = value
                  if (typeof value === 'string' && !isNaN(parseFloat(value))) {
                    const numValue = parseFloat(value)
                    if (key.includes('amount') || key.includes('total') || key.includes('cost')) {
                      displayValue = formatCurrency(numValue)
                    } else {
                      displayValue = numValue.toLocaleString('en-US')
                    }
                  } else if (typeof value === 'number') {
                    if (key.includes('amount') || key.includes('total') || key.includes('cost')) {
                      displayValue = formatCurrency(value)
                    } else {
                      displayValue = value.toLocaleString('en-US')
                    }
                  }
                  
                  return (
                    <div key={key} className="bg-white rounded-lg shadow border border-gray-200 p-4">
                      <p className="text-sm font-medium text-gray-600">{formattedKey}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">
                        {displayValue}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Grouped by Date */}
            {Object.keys(groupedByDate).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(groupedByDate).map(([dateKey, rows]: [string, any[]]) => {
                  const isExpanded = expandedDates.has(dateKey)
                  const dateTotal = rows.reduce((sum, row) => {
                    const dateFields = ['date', 'createdAt', 'submittedAt', 'approvedAt', 'paidAt']
                    const amountFields = ['amount', 'total', 'cost', 'spent', 'approved', 'price', 'estimatedTotal', 'approvedTotal', 'actualTotal']
                    const amountField = amountFields.find(field => typeof row[field] === 'number')
                    return sum + (amountField && typeof row[amountField] === 'number' ? row[amountField] : 0)
                  }, 0)

                  return (
                    <div key={dateKey} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                      {/* Date Header */}
                      <button
                        onClick={() => toggleDateExpanded(dateKey)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div>
                            <p className="font-semibold text-gray-900">{dateKey}</p>
                            <p className="text-sm text-gray-600">{rows.length} transaction{rows.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-gray-900">{formatCurrency(dateTotal)}</p>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </button>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="border-t border-gray-200">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                  {(reportData.columns && reportData.columns.length > 0
                                    ? reportData.columns
                                    : Object.keys(rows[0] || {})
                                  ).map((col: string) => {
                                    // Format column header with spaces
                                    const formattedHeader = col
                                      .replace(/([A-Z])/g, ' $1') // Add space before capitals
                                      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between lowercase and uppercase
                                      .replace(/_/g, ' ') // Replace underscores with spaces
                                      .trim()
                                      .split(' ')
                                      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                                      .join(' ')
                                    
                                    return (
                                      <th
                                        key={col}
                                        className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                                      >
                                        {formattedHeader}
                                      </th>
                                    )
                                  })}
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((row: any, idx: number) => (
                                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                                    {(reportData.columns && reportData.columns.length > 0
                                      ? reportData.columns
                                      : Object.keys(row)
                                    ).map((col: string) => {
                                      let value = row[col]
                                      const colLower = col.toLowerCase()
                                      const isMonetary = colLower.includes('amount') || 
                                                       colLower.includes('total') || 
                                                       colLower.includes('cost') ||
                                                       colLower.includes('spent') ||
                                                       colLower.includes('approved') ||
                                                       colLower.includes('price') ||
                                                       colLower.includes('estimated') ||
                                                       colLower.includes('actual')
                                      const isDate = colLower.includes('date') || 
                                                   colLower.includes('at')
                                      const isMonth = colLower.includes('month')
                                      
                                      let displayValue = value
                                      
                                      // Handle null/undefined
                                      if (value === null || value === undefined) {
                                        displayValue = '-'
                                      }
                                      // Don't format month field as number
                                      else if (isMonth) {
                                        displayValue = value
                                      }
                                      // Try to convert string numbers to actual numbers
                                      else if (typeof value === 'string' && !isNaN(parseFloat(value)) && value.trim() !== '') {
                                        const numValue = parseFloat(value)
                                        if (isMonetary) {
                                          displayValue = formatCurrency(numValue)
                                        } else {
                                          displayValue = numValue.toLocaleString('en-US')
                                        }
                                      }
                                      // Handle actual numbers
                                      else if (typeof value === 'number') {
                                        if (isMonetary) {
                                          displayValue = formatCurrency(value)
                                        } else {
                                          displayValue = value.toLocaleString('en-US')
                                        }
                                      }
                                      // Handle dates
                                      else if (isDate && value) {
                                        displayValue = new Date(value).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        })
                                      }
                                      
                                      return (
                                        <td key={col} className="px-6 py-4 text-sm text-gray-900">
                                          {displayValue}
                                        </td>
                                      )
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No data available for the selected period</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
