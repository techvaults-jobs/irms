import { auth } from '@/auth'
import { ReportingService } from '@/services/reporting.service'
import { hasPermission } from '@/lib/rbac'
import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userRole = session.user.role as UserRole

    // Check permission - Finance and Admin can generate reports
    if (!hasPermission(userRole, 'generate_reports')) {
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

    const report = await ReportingService.generateApprovalStatusReport(startDate, endDate)

    return NextResponse.json({
      reportType: 'approval-status',
      data: report,
      generatedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error generating approval status report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
