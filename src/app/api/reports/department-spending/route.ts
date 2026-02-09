import { auth } from '@/auth'
import { ReportingService } from '@/services/reporting.service'
import { hasPermission } from '@/lib/rbac'
import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'

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
    const userId = session.user.id as string

    // Check permission - Finance and Admin can generate reports, Managers can view department reports
    const canGenerateReports = hasPermission(userRole, 'generate_reports')
    const canViewDepartmentReports = hasPermission(userRole, 'view_department_reports')

    if (!canGenerateReports && !canViewDepartmentReports) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions to generate reports' },
        { status: 403 }
      )
    }

    // Get date range parameters
    const searchParams = req.nextUrl.searchParams
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')
    const departmentIdParam = searchParams.get('departmentId')

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

    // Determine which department to report on
    let departmentId = departmentIdParam

    // If user is a Manager, restrict to their department
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

      // If departmentId is specified and doesn't match user's department, deny access
      if (departmentIdParam && departmentIdParam !== user.departmentId) {
        return NextResponse.json(
          { error: 'Forbidden - Can only view your own department' },
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

    return NextResponse.json({
      reportType: 'department-spending',
      data: report,
      generatedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error generating department spending report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
