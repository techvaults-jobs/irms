import { Decimal } from '@prisma/client/runtime/library'
import * as XLSX from 'xlsx'

export interface ExportOptions {
  format: 'csv' | 'excel'
  filename?: string
}

/**
 * Convert data to CSV format
 */
export function convertToCSV(data: any[], headers?: string[]): string {
  if (data.length === 0) {
    return ''
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0])

  // Create header row
  const headerRow = csvHeaders.map(h => escapeCSVField(h)).join(',')

  // Create data rows
  const dataRows = data.map(row => {
    return csvHeaders.map(header => {
      const value = row[header]
      return escapeCSVField(formatValue(value))
    }).join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Escape CSV field values
 */
function escapeCSVField(field: any): string {
  const value = String(field)
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Format value for export
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (value instanceof Decimal) {
    return value.toString()
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

/**
 * Generate CSV content for monthly spending report
 */
export function generateMonthlySpendingCSV(data: any[]): string {
  const headers = ['Month', 'Estimated Total', 'Approved Total', 'Actual Total', 'Count']
  const formattedData = data.map(item => ({
    'Month': item.month,
    'Estimated Total': item.estimatedTotal.toString(),
    'Approved Total': item.approvedTotal.toString(),
    'Actual Total': item.actualTotal.toString(),
    'Count': item.count,
  }))
  return convertToCSV(formattedData, headers)
}

/**
 * Generate CSV content for category spending report
 */
export function generateCategorySpendingCSV(data: any[]): string {
  const headers = ['Category', 'Estimated Total', 'Approved Total', 'Actual Total', 'Count']
  const formattedData = data.map(item => ({
    'Category': item.category,
    'Estimated Total': item.estimatedTotal.toString(),
    'Approved Total': item.approvedTotal.toString(),
    'Actual Total': item.actualTotal.toString(),
    'Count': item.count,
  }))
  return convertToCSV(formattedData, headers)
}

/**
 * Generate CSV content for department spending report
 */
export function generateDepartmentSpendingCSV(data: any[]): string {
  const headers = ['Department', 'Estimated Total', 'Approved Total', 'Actual Total', 'Count']
  const formattedData = data.map(item => ({
    'Department': item.departmentName,
    'Estimated Total': item.estimatedTotal.toString(),
    'Approved Total': item.approvedTotal.toString(),
    'Actual Total': item.actualTotal.toString(),
    'Count': item.count,
  }))
  return convertToCSV(formattedData, headers)
}

/**
 * Generate CSV content for approval status report
 */
export function generateApprovalStatusCSV(data: any[]): string {
  const headers = ['Status', 'Count', 'Percentage']
  const formattedData = data.map(item => ({
    'Status': item.status,
    'Count': item.count,
    'Percentage': `${item.percentage.toFixed(2)}%`,
  }))
  return convertToCSV(formattedData, headers)
}

/**
 * Generate CSV content for pending liabilities report
 */
export function generatePendingLiabilitiesCSV(data: any[]): string {
  const headers = ['Requisition ID', 'Title', 'Department', 'Approved Cost', 'Submitted Date']
  const formattedData = data.map(item => ({
    'Requisition ID': item.requisitionId,
    'Title': item.title,
    'Department': item.departmentName,
    'Approved Cost': item.approvedCost.toString(),
    'Submitted Date': item.submittedDate.toISOString(),
  }))
  return convertToCSV(formattedData, headers)
}

/**
 * Generate CSV content for yearly summary report
 */
export function generateYearlySummaryCSV(data: any): string {
  const lines: string[] = []

  // Summary section
  lines.push('Year Summary')
  lines.push(`Year,${data.year}`)
  lines.push(`Estimated Total,${data.estimatedTotal.toString()}`)
  lines.push(`Approved Total,${data.approvedTotal.toString()}`)
  lines.push(`Actual Total,${data.actualTotal.toString()}`)
  lines.push('')

  // Monthly breakdown
  lines.push('Monthly Breakdown')
  lines.push('Month,Estimated Total,Approved Total,Actual Total,Count')
  data.monthlyBreakdown.forEach((item: any) => {
    lines.push(
      `${item.month},${item.estimatedTotal.toString()},${item.approvedTotal.toString()},${item.actualTotal.toString()},${item.count}`
    )
  })
  lines.push('')

  // Category breakdown
  lines.push('Category Breakdown')
  lines.push('Category,Estimated Total,Approved Total,Actual Total,Count')
  data.categoryBreakdown.forEach((item: any) => {
    lines.push(
      `${item.category},${item.estimatedTotal.toString()},${item.approvedTotal.toString()},${item.actualTotal.toString()},${item.count}`
    )
  })
  lines.push('')

  // Status breakdown
  lines.push('Status Breakdown')
  lines.push('Status,Count,Percentage')
  data.statusBreakdown.forEach((item: any) => {
    lines.push(`${item.status},${item.count},${item.percentage.toFixed(2)}%`)
  })

  return lines.join('\n')
}

/**
 * Get MIME type for format
 */
export function getMimeType(format: 'csv' | 'excel'): string {
  return format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
}

/**
 * Get file extension for format
 */
export function getFileExtension(format: 'csv' | 'excel'): string {
  return format === 'csv' ? 'csv' : 'xlsx'
}

/**
 * Convert data to Excel format (returns Buffer)
 */
export function convertToExcel(data: any[], headers?: string[]): Buffer {
  if (data.length === 0) {
    // Return empty workbook
    const ws = XLSX.utils.aoa_to_sheet([headers || []])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    return Buffer.from(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }))
  }

  // Get headers from first object if not provided
  const excelHeaders = headers || Object.keys(data[0])

  // Format data for Excel
  const formattedData = data.map(row => {
    return excelHeaders.map(header => {
      const value = row[header]
      return formatValue(value)
    })
  })

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet([excelHeaders, ...formattedData])
  
  // Set column widths
  const colWidths = excelHeaders.map(header => ({
    wch: Math.max(header.length, 15),
  }))
  ws['!cols'] = colWidths

  // Create workbook
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Report')

  // Generate buffer
  return Buffer.from(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }))
}

/**
 * Generate Excel content for monthly spending report
 */
export function generateMonthlySpendingExcel(data: any[]): Buffer {
  const headers = ['Month', 'Estimated Total', 'Approved Total', 'Actual Total', 'Count']
  const formattedData = data.map(item => ({
    'Month': item.month,
    'Estimated Total': item.estimatedTotal.toString(),
    'Approved Total': item.approvedTotal.toString(),
    'Actual Total': item.actualTotal.toString(),
    'Count': item.count,
  }))
  return convertToExcel(formattedData, headers)
}

/**
 * Generate Excel content for category spending report
 */
export function generateCategorySpendingExcel(data: any[]): Buffer {
  const headers = ['Category', 'Estimated Total', 'Approved Total', 'Actual Total', 'Count']
  const formattedData = data.map(item => ({
    'Category': item.category,
    'Estimated Total': item.estimatedTotal.toString(),
    'Approved Total': item.approvedTotal.toString(),
    'Actual Total': item.actualTotal.toString(),
    'Count': item.count,
  }))
  return convertToExcel(formattedData, headers)
}

/**
 * Generate Excel content for department spending report
 */
export function generateDepartmentSpendingExcel(data: any[]): Buffer {
  const headers = ['Department', 'Estimated Total', 'Approved Total', 'Actual Total', 'Count']
  const formattedData = data.map(item => ({
    'Department': item.departmentName,
    'Estimated Total': item.estimatedTotal.toString(),
    'Approved Total': item.approvedTotal.toString(),
    'Actual Total': item.actualTotal.toString(),
    'Count': item.count,
  }))
  return convertToExcel(formattedData, headers)
}

/**
 * Generate Excel content for approval status report
 */
export function generateApprovalStatusExcel(data: any[]): Buffer {
  const headers = ['Status', 'Count', 'Percentage']
  const formattedData = data.map(item => ({
    'Status': item.status,
    'Count': item.count,
    'Percentage': `${item.percentage.toFixed(2)}%`,
  }))
  return convertToExcel(formattedData, headers)
}

/**
 * Generate Excel content for pending liabilities report
 */
export function generatePendingLiabilitiesExcel(data: any[]): Buffer {
  const headers = ['Requisition ID', 'Title', 'Department', 'Approved Cost', 'Submitted Date']
  const formattedData = data.map(item => ({
    'Requisition ID': item.requisitionId,
    'Title': item.title,
    'Department': item.departmentName,
    'Approved Cost': item.approvedCost.toString(),
    'Submitted Date': item.submittedDate.toISOString(),
  }))
  return convertToExcel(formattedData, headers)
}

/**
 * Generate Excel content for yearly summary report
 */
export function generateYearlySummaryExcel(data: any): Buffer {
  const wb = XLSX.utils.book_new()

  // Summary sheet
  const summaryData = [
    ['Year Summary'],
    ['Year', data.year],
    ['Estimated Total', data.estimatedTotal.toString()],
    ['Approved Total', data.approvedTotal.toString()],
    ['Actual Total', data.actualTotal.toString()],
  ]
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

  // Monthly breakdown sheet
  const monthlyHeaders = ['Month', 'Estimated Total', 'Approved Total', 'Actual Total', 'Count']
  const monthlyData = data.monthlyBreakdown.map((item: any) => [
    item.month,
    item.estimatedTotal.toString(),
    item.approvedTotal.toString(),
    item.actualTotal.toString(),
    item.count,
  ])
  const monthlyWs = XLSX.utils.aoa_to_sheet([monthlyHeaders, ...monthlyData])
  XLSX.utils.book_append_sheet(wb, monthlyWs, 'Monthly')

  // Category breakdown sheet
  const categoryHeaders = ['Category', 'Estimated Total', 'Approved Total', 'Actual Total', 'Count']
  const categoryData = data.categoryBreakdown.map((item: any) => [
    item.category,
    item.estimatedTotal.toString(),
    item.approvedTotal.toString(),
    item.actualTotal.toString(),
    item.count,
  ])
  const categoryWs = XLSX.utils.aoa_to_sheet([categoryHeaders, ...categoryData])
  XLSX.utils.book_append_sheet(wb, categoryWs, 'Categories')

  // Status breakdown sheet
  const statusHeaders = ['Status', 'Count', 'Percentage']
  const statusData = data.statusBreakdown.map((item: any) => [
    item.status,
    item.count,
    `${item.percentage.toFixed(2)}%`,
  ])
  const statusWs = XLSX.utils.aoa_to_sheet([statusHeaders, ...statusData])
  XLSX.utils.book_append_sheet(wb, statusWs, 'Status')

  return Buffer.from(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }))
}
