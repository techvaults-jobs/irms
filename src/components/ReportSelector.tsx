'use client'

import { useState } from 'react'
import { AlertCircle, Calendar, BarChart3, FolderOpen, Building2, CheckCircle2, Clock, TrendingUp, type LucideIcon } from 'lucide-react'

interface ReportSelectorProps {
  onReportSelect: (reportType: string, startDate: string, endDate: string) => void
  isLoading?: boolean
}

interface ReportType {
  id: string
  name: string
  description: string
  icon: LucideIcon
  color: string
}

const REPORT_TYPES: ReportType[] = [
  {
    id: 'monthly-spending',
    name: 'Monthly Spending',
    description: 'Total estimated, approved, and actual spending by month',
    icon: BarChart3,
    color: 'text-blue-600 bg-blue-100',
  },
  {
    id: 'category-spending',
    name: 'Category Spending',
    description: 'Spending breakdown by requisition category',
    icon: FolderOpen,
    color: 'text-purple-600 bg-purple-100',
  },
  {
    id: 'department-spending',
    name: 'Department Spending',
    description: 'Spending by department with manager-level visibility',
    icon: Building2,
    color: 'text-orange-600 bg-orange-100',
  },
  {
    id: 'approval-status',
    name: 'Approval Status',
    description: 'Count of requisitions by status (Draft, Submitted, etc.)',
    icon: CheckCircle2,
    color: 'text-green-600 bg-green-100',
  },
  {
    id: 'pending-liabilities',
    name: 'Pending Liabilities',
    description: 'Approved but unpaid requisitions with total liability',
    icon: Clock,
    color: 'text-yellow-600 bg-yellow-100',
  },
  {
    id: 'yearly-summary',
    name: 'Yearly Summary',
    description: 'Annual spending totals, trends, and year-over-year comparison',
    icon: TrendingUp,
    color: 'text-red-600 bg-red-100',
  },
]

export function ReportSelector({ onReportSelect, isLoading = false }: ReportSelectorProps) {
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSelectReport = (reportId: string) => {
    setSelectedReport(reportId)
    setValidationError(null)
  }

  const handleGenerateReport = () => {
    setValidationError(null)

    if (!selectedReport) {
      setValidationError('Please select a report type')
      return
    }

    if (!startDate) {
      setValidationError('Start date is required')
      return
    }

    if (!endDate) {
      setValidationError('End date is required')
      return
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start > end) {
      setValidationError('Start date must be before end date')
      return
    }

    onReportSelect(selectedReport, startDate, endDate)
  }

  const today = new Date().toISOString().split('T')[0]
  const oneYearAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 1))
    .toISOString()
    .split('T')[0]

  const handleSetLastMonth = () => {
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    setStartDate(lastMonth.toISOString().split('T')[0])
    setEndDate(lastMonthEnd.toISOString().split('T')[0])
  }

  const handleSetLastYear = () => {
    const now = new Date()
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31)

    setStartDate(lastYearStart.toISOString().split('T')[0])
    setEndDate(lastYearEnd.toISOString().split('T')[0])
  }

  const handleSetCurrentYear = () => {
    const now = new Date()
    const yearStart = new Date(now.getFullYear(), 0, 1)

    setStartDate(yearStart.toISOString().split('T')[0])
    setEndDate(today)
  }

  return (
    <div className="space-y-5">
      {/* Error Message */}
      {validationError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 font-medium">{validationError}</p>
        </div>
      )}

      {/* Report Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Select Report</h3>
          {selectedReport && (
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
              Selected
            </span>
          )}
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
          {REPORT_TYPES.map((report, idx) => (
            <button
              key={report.id}
              onClick={() => handleSelectReport(report.id)}
              className={`w-full p-3 rounded-xl border-2 transition-all text-left group ${
                selectedReport === report.id
                  ? 'border-red-500 bg-red-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-red-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform ${report.color}`}>
                  <report.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{report.name}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{report.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Date Range Selection */}
      <div className="space-y-3 pt-3 border-t border-gray-200">
        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Date Range</h3>

        {/* Quick Select Buttons - Grid Layout */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleSetLastMonth}
            className="px-2 py-2 text-xs font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-red-100 hover:text-red-700 transition-all duration-200 border border-gray-200 hover:border-red-300"
            title="Last calendar month"
          >
            📅 Last Month
          </button>
          <button
            onClick={handleSetCurrentYear}
            className="px-2 py-2 text-xs font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-red-100 hover:text-red-700 transition-all duration-200 border border-gray-200 hover:border-red-300"
            title="From Jan 1 to today"
          >
            📊 This Year
          </button>
          <button
            onClick={handleSetLastYear}
            className="px-2 py-2 text-xs font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-red-100 hover:text-red-700 transition-all duration-200 border border-gray-200 hover:border-red-300"
            title="Full previous year"
          >
            📈 Last Year
          </button>
        </div>

        {/* Date Inputs */}
        <div className="space-y-2.5">
          <div>
            <label htmlFor="startDate" className="block text-xs font-semibold text-gray-700 mb-1.5">
              From
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate || today}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm font-medium transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="endDate" className="block text-xs font-semibold text-gray-700 mb-1.5">
              To
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={today}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm font-medium transition-all"
              />
            </div>
          </div>
        </div>

        {/* Date Range Display */}
        {startDate && endDate && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-3 animate-in fade-in slide-in-from-bottom-2">
            <p className="text-xs text-gray-700 font-medium">
              <span className="text-red-600 font-bold">📅 Range:</span> {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerateReport}
        disabled={isLoading || !selectedReport}
        className="w-full px-4 py-3 text-sm font-bold text-white bg-gradient-to-r from-red-600 to-red-700 rounded-xl hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <BarChart3 size={18} />
            Generate Report
          </>
        )}
      </button>
    </div>
  )
}
