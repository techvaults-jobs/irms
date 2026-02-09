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

    // Get year parameter
    const searchParams = req.nextUrl.searchParams
    const yearStr = searchParams.get('year')

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

    return NextResponse.json({
      reportType: 'yearly-summary',
      data: report,
      generatedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error generating yearly summary report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
