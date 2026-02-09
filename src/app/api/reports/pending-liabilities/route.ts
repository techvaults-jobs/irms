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

    const report = await ReportingService.generatePendingLiabilities()

    // Calculate total pending liability
    const totalLiability = report.reduce((sum, item) => sum.plus(item.approvedCost), new Decimal(0))

    return NextResponse.json({
      reportType: 'pending-liabilities',
      data: report,
      totalLiability: totalLiability.toString(),
      count: report.length,
      generatedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error generating pending liabilities report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

import { Decimal } from '@prisma/client/runtime/library'
