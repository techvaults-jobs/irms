'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Download, RefreshCw, FileSpreadsheet, ArrowLeft, FileText, Calendar } from 'lucide-react'
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils'

interface ReportDisplayProps {
  reportType: string
  startDate: string
  endDate: string
  onBack?: () => void
}

interface ReportData {
  title: string
  description: string
  columns: string[]
  data: Record<string, any>[]
  summary?: Record<string, any>
}

export function ReportDisplay({ reportType, startDate, endDate, onBack }: ReportDisplayProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    fetchReport()
  }, [reportType, startDate, endDate])

  const fetchReport = async () => {
    setIsLoading(true)
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
      setReportData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'excel') => {
    setIsExporting(true)

    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        format,
      })

      const response = await fetch(`/api/reports/${reportType}/export?${params}`)
      if (!response.ok) {
        throw new Error('Failed to export report')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportType}-${startDate}-to-${endDate}.${format === 'excel' ? 'xlsx' : 'csv'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report')
    } finally {
      setIsExporting(false)
    }
  }

  const formatCurrency = (value: any) => {
    if (typeof value !== 'number') return value
    return formatCurrencyUtil(value)
  }

  const formatValue = (value: any) => {
    if (typeof value === 'number' && value > 1000) {
      return formatCurrency(value)
    }
    if (typeof value === 'number') {
      return value.toFixed(2)
    }
    return value
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
        </div>
        <p className="text-gray-600 mt-4 font-medium">Generating report...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Back to Report Selection
          </button>
        )}
      </div>
    )
  }

  if (!reportData || !reportData.columns || reportData.columns.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No data available for the selected date range</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{reportData.title}</h2>
              <p className="text-red-100 mt-1">{reportData.description}</p>
              <div className="flex items-center gap-2 mt-3">
                <Calendar className="w-4 h-4 text-red-200" />
                <p className="text-sm text-red-200">
                  {new Date(startDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })} — {new Date(endDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => fetchReport()}
            disabled={isLoading}
            className="p-2.5 text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
            title="Refresh report"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-white/20">
          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-700 bg-white rounded-lg hover:bg-red-50 disabled:opacity-50 transition-all shadow-sm hover:shadow-md"
          >
            <FileText className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-700 bg-white rounded-lg hover:bg-red-50 disabled:opacity-50 transition-all shadow-sm hover:shadow-md"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-white/20 rounded-lg hover:bg-white/30 transition-all backdrop-blur-sm ml-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
        </div>
      </div>

      {/* Summary Section */}
      {reportData.summary && Object.keys(reportData.summary).length > 0 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(reportData.summary).map(([key, value]) => (
              <div key={key} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{key}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{formatValue(value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Table */}
      {reportData.columns && reportData.columns.length > 0 && (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                {reportData.columns.map(column => (
                  <th
                    key={column}
                    className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportData.data.length === 0 ? (
                <tr>
                  <td colSpan={reportData.columns.length} className="px-6 py-8 text-center text-gray-500">
                    No data available
                  </td>
                </tr>
              ) : (
                reportData.data.map((row, index) => (
                  <tr
                    key={index}
                    className={`border-b border-gray-200 transition-colors ${index % 2 === 0 ? 'bg-white hover:bg-red-50' : 'bg-gray-50 hover:bg-red-100'
                      }`}
                  >
                    {reportData.columns.map(column => (
                      <td key={`${index}-${column}`} className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {formatValue(row[column])}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Info */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-600 font-medium">
            Showing {reportData.data.length} {reportData.data.length === 1 ? 'record' : 'records'}
          </p>
        </div>
      </div>
      )}

      {/* Info Box */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-700">
          <strong>Export Options:</strong> You can export this report to CSV for spreadsheet applications or to Excel for advanced formatting and analysis.
        </p>
      </div>
    </div>
  )
}
