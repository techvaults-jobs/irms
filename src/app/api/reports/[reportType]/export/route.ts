import { auth } from '@/auth'
import { ReportingService } from '@/services/reporting.service'
import { hasPermission } from '@/lib/rbac'
import {
  generateMonthlySpendingCSV,
  generateCategorySpendingCSV,
  generateDepartmentSpendingCSV,
  generateApprovalStatusCSV,
  generatePendingLiabilitiesCSV,
  generateYearlySummaryCSV,
  generateMonthlySpendingExcel,
  generateCategorySpendingExcel,
  generateDepartmentSpendingExcel,
  generateApprovalStatusExcel,
  generatePendingLiabilitiesExcel,
  generateYearlySummaryExcel,
  getMimeType,
  getFileExtension,
} from '@/lib/export-utils'
import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { reportType: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userRole = session.user.role as UserRole
    const userId = session.user.id as string
    const reportType = params.reportType

    // Check permission - Finance and Admin can generate reports, Managers can view department reports
    const canGenerateReports = hasPermission(userRole, 'generate_reports')
    const canViewDepartmentReports = hasPermission(userRole, 'view_department_reports')

    if (!canGenerateReports && !canViewDepartmentReports) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions to export reports' },
        { status: 403 }
      )
    }

    // Get format parameter
    const searchParams = req.nextUrl.searchParams
    const format = (searchParams.get('format') || 'csv') as 'csv' | 'excel'
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')
    const yearStr = searchParams.get('year')
    const departmentIdParam = searchParams.get('departmentId')

    // Validate format
    if (!['csv', 'excel'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be csv or excel' },
        { status: 400 }
      )
    }

    const startDate = startDateStr ? new Date(startDateStr) : undefined
    const endDate = endDateStr ? new Date(endDateStr) : undefined

    // Validate dates
    if (startDate && isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid startDate format' },
        { status: 400 }
      )
    }

    if (endDate && isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid endDate format' },
        { status: 400 }
      )
    }

    let csvContent = ''
    let excelBuffer: Buffer | null = null
    let filename = ''

    // Generate report based on type
    switch (reportType) {
      case 'monthly-spending': {
        const report = await ReportingService.generateMonthlySpendings(startDate, endDate)
        if (format === 'csv') {
          csvContent = generateMonthlySpendingCSV(report)
        } else {
          excelBuffer = generateMonthlySpendingExcel(report)
        }
        filename = `monthly-spending-${new Date().toISOString().split('T')[0]}`
        break
      }

      case 'category-spending': {
        const report = await ReportingService.generateCategorySpendings(startDate, endDate)
        if (format === 'csv') {
          csvContent = generateCategorySpendingCSV(report)
        } else {
          excelBuffer = generateCategorySpendingExcel(report)
        }
        filename = `category-spending-${new Date().toISOString().split('T')[0]}`
        break
      }

      case 'department-spending': {
        // Check department access for managers
        let departmentId = departmentIdParam
        if (userRole === 'MANAGER' && !canGenerateReports) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { departmentId: true },
          })

          if (!user) {
            return NextResponse.json(
              { error: 'User not found' },
              { status: 404 }
            )
          }

          if (departmentIdParam && departmentIdParam !== user.departmentId) {
            return NextResponse.json(
              { error: 'Forbidden - Can only export your own department' },
              { status: 403 }
            )
          }

          departmentId = user.departmentId
        }

        const report = await ReportingService.generateDepartmentSpendings(
          startDate,
          endDate,
          departmentId || undefined
        )
        if (format === 'csv') {
          csvContent = generateDepartmentSpendingCSV(report)
        } else {
          excelBuffer = generateDepartmentSpendingExcel(report)
        }
        filename = `department-spending-${new Date().toISOString().split('T')[0]}`
        break
      }

      case 'approval-status': {
        const report = await ReportingService.generateApprovalStatusReport(startDate, endDate)
        if (format === 'csv') {
          csvContent = generateApprovalStatusCSV(report)
        } else {
          excelBuffer = generateApprovalStatusExcel(report)
        }
        filename = `approval-status-${new Date().toISOString().split('T')[0]}`
        break
      }

      case 'pending-liabilities': {
        const report = await ReportingService.generatePendingLiabilities()
        if (format === 'csv') {
          csvContent = generatePendingLiabilitiesCSV(report)
        } else {
          excelBuffer = generatePendingLiabilitiesExcel(report)
        }
        filename = `pending-liabilities-${new Date().toISOString().split('T')[0]}`
        break
      }

      case 'yearly-summary': {
        let year: number | undefined
        if (yearStr) {
          year = parseInt(yearStr)
          if (isNaN(year) || year < 1900 || year > 2100) {
            return NextResponse.json(
              { error: 'Invalid year format' },
              { status: 400 }
            )
          }
        }

        const report = await ReportingService.generateYearlySummary(year)
        if (format === 'csv') {
          csvContent = generateYearlySummaryCSV(report)
        } else {
          excelBuffer = generateYearlySummaryExcel(report)
        }
        filename = `yearly-summary-${year || new Date().getFullYear()}`
        break
      }

      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        )
    }

    if (!csvContent && !excelBuffer) {
      return NextResponse.json(
        { error: 'Failed to generate report content' },
        { status: 500 }
      )
    }

    // Create response with appropriate headers
    const mimeType = getMimeType(format)
    const extension = getFileExtension(format)
    const fullFilename = `${filename}.${extension}`

    if (format === 'excel' && excelBuffer) {
      return new NextResponse(new Uint8Array(excelBuffer), {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${fullFilename}"`,
        },
      })
    } else {
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${fullFilename}"`,
        },
      })
    }
  } catch (error: any) {
    console.error('Error exporting report:', error)
    return NextResponse.json(
      { error: 'Failed to export report' },
      { status: 500 }
    )
  }
}
