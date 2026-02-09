import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userRole = session.user.role as UserRole
    const userId = session.user.id
    const departmentId = session.user.departmentId

    // Build filters based on role
    let whereClause: any = {}

    if (userRole === 'STAFF') {
      whereClause.submitterId = userId
    } else if (userRole === 'MANAGER') {
      whereClause.departmentId = departmentId
    }
    // FINANCE and ADMIN can see all

    // Get requisition counts by status
    const [
      totalRequisitions,
      draftCount,
      submittedCount,
      approvedCount,
      rejectedCount,
      paidCount,
    ] = await Promise.all([
      prisma.requisition.count({ where: whereClause }),
      prisma.requisition.count({ where: { ...whereClause, status: 'DRAFT' } }),
      prisma.requisition.count({ where: { ...whereClause, status: 'SUBMITTED' } }),
      prisma.requisition.count({ where: { ...whereClause, status: 'APPROVED' } }),
      prisma.requisition.count({ where: { ...whereClause, status: 'REJECTED' } }),
      prisma.requisition.count({ where: { ...whereClause, status: 'PAID' } }),
    ])

    // Get financial totals
    const financialData = await prisma.requisition.aggregate({
      where: whereClause,
      _sum: {
        estimatedCost: true,
        approvedCost: true,
        actualCostPaid: true,
      },
    })

    const totalSpent = financialData._sum.actualCostPaid || 0
    const totalApproved = financialData._sum.approvedCost || 0
    const totalEstimated = financialData._sum.estimatedCost || 0

    // Get pending approvals count (for managers/finance)
    let pendingApprovalsCount = 0
    if (userRole === 'MANAGER' || userRole === 'FINANCE' || userRole === 'ADMIN') {
      pendingApprovalsCount = await prisma.requisition.count({
        where: { status: 'SUBMITTED' },
      })
    }

    return NextResponse.json({
      totalRequisitions,
      draftCount,
      submittedCount,
      approvedCount,
      rejectedCount,
      paidCount,
      totalSpent,
      totalApproved,
      totalEstimated,
      pendingApprovalsCount,
    })
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
