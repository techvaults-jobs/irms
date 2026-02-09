import { auth } from '@/auth'
import { AuditTrailService } from '@/services/audit-trail.service'
import { validatePaginationParams, formatPaginationResult } from '@/lib/pagination'
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

    // Only Admin and Finance can access global audit trail
    const userRole = session.user.role as UserRole
    if (userRole !== 'ADMIN' && userRole !== 'FINANCE') {
      return NextResponse.json(
        { error: 'Forbidden - Only Admin and Finance can access global audit trail' },
        { status: 403 }
      )
    }

    // Get pagination parameters
    const searchParams = req.nextUrl.searchParams
    const { skip, take } = validatePaginationParams(
      searchParams.get('skip'),
      searchParams.get('take'),
      1000
    )

    // Get audit trail
    const auditTrail = await AuditTrailService.getAllAuditTrail(skip, take)
    const count = await AuditTrailService.getAuditTrailCount()

    const result = formatPaginationResult(auditTrail, skip, take, count)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error fetching audit trail:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit trail' },
      { status: 500 }
    )
  }
}
