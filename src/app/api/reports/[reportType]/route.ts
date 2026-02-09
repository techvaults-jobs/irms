import { auth } from '@/auth'
import { ReportingService } from '@/services/reporting.service'
import { hasPermission } from '@/lib/rbac'
import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'

interface ReportResponse {
  title: string
  description: string
  columns: string[]
  data: Record<string, any>[]
  summary?: Record<string, any>
}

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

    // Check permission - Finance, Admin, and Manager can generate reports
    if (!hasPermission(userRole, 'generate_reports')) {
      console.error(`User ${session.user.id} with role ${userRole} tried to generate reports without permission`)
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions to generate reports' },
        { status: 403 }
      )
    }

    // Get date range parameters
    const searchParams = req.nextUrl.searchParams
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

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

    let reportData: ReportResponse

    switch (params.reportType) {
      case 'monthly-spending': {
        const data = await ReportingService.generateMonthlySpendings(startDate, endDate)
        reportData = {
          title: 'Monthly Spending Report',
          description: 'Total estimated, approved, and actual spending by month',
          columns: ['Month', 'Estimated', 'Approved', 'Actual', 'Count'],
          data: data.map(item => ({
            Month: item.month,
            Estimated: Number(item.estimatedTotal),
            Approved: Number(item.approvedTotal),
            Actual: Number(item.actualTotal),
            Count: item.count,
          })),
        }
        break
      }

      case 'category-spending': {
        const data = await ReportingService.generateCategorySpendings(startDate, endDate)
        reportData = {
          title: 'Category Spending Report',
          description: 'Spending breakdown by requisition category',
          columns: ['Category', 'Estimated', 'Approved', 'Actual', 'Count'],
          data: data.map(item => ({
            Category: item.category,
            Estimated: Number(item.estimatedTotal),
            Approved: Number(item.approvedTotal),
            Actual: Number(item.actualTotal),
            Count: item.count,
          })),
        }
        break
      }

      case 'department-spending': {
        const data = await ReportingService.generateDepartmentSpendings(startDate, endDate)
        reportData = {
          title: 'Department Spending Report',
          description: 'Spending by department with manager-level visibility',
          columns: ['Department', 'Estimated', 'Approved', 'Actual', 'Count'],
          data: data.map(item => ({
            Department: item.departmentName,
            Estimated: Number(item.estimatedTotal),
            Approved: Number(item.approvedTotal),
            Actual: Number(item.actualTotal),
            Count: item.count,
          })),
        }
        break
      }

      case 'approval-status': {
        const data = await ReportingService.generateApprovalStatusReport(startDate, endDate)
        reportData = {
          title: 'Approval Status Report',
          description: 'Count of requisitions by status',
          columns: ['Status', 'Count', 'Percentage'],
          data: data.map(item => ({
            Status: item.status.replace(/_/g, ' '),
            Count: item.count,
            Percentage: `${item.percentage.toFixed(2)}%`,
          })),
          summary: {
            'Total Requisitions': data.reduce((sum, item) => sum + item.count, 0),
          },
        }
        break
      }

      case 'pending-liabilities': {
        const data = await ReportingService.generatePendingLiabilities()
        const totalLiability = data.reduce((sum, item) => sum + Number(item.approvedCost), 0)
        reportData = {
          title: 'Pending Liabilities Report',
          description: 'Approved but unpaid requisitions with total liability',
          columns: ['Requisition ID', 'Title', 'Department', 'Approved Cost', 'Submitted Date'],
          data: data.map(item => ({
            'Requisition ID': item.requisitionId.substring(0, 8),
            Title: item.title,
            Department: item.departmentName,
            'Approved Cost': Number(item.approvedCost),
            'Submitted Date': new Date(item.submittedDate).toLocaleDateString('en-NG'),
          })),
          summary: {
            'Total Pending': data.length,
            'Total Liability': totalLiability,
          },
        }
        break
      }

      case 'yearly-summary': {
        const year = startDate ? startDate.getFullYear() : new Date().getFullYear()
        const data = await ReportingService.generateYearlySummary(year)
        reportData = {
          title: `Yearly Summary Report - ${year}`,
          description: 'Annual spending totals, trends, and year-over-year comparison',
          columns: ['Month', 'Estimated', 'Approved', 'Actual'],
          data: data.monthlyBreakdown.map(item => ({
            Month: item.month,
            Estimated: Number(item.estimatedTotal),
            Approved: Number(item.approvedTotal),
            Actual: Number(item.actualTotal),
          })),
          summary: {
            'Year': year,
            'Total Estimated': Number(data.estimatedTotal),
            'Total Approved': Number(data.approvedTotal),
            'Total Actual': Number(data.actualTotal),
          },
        }
        break
      }

      default:
        return NextResponse.json(
          { error: 'Unknown report type' },
          { status: 400 }
        )
    }

    return NextResponse.json(reportData)
  } catch (error: any) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate report' },
      { status: 500 }
    )
  }
}
