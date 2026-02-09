import { auth } from '@/auth'
import { AuditTrailService } from '@/services/audit-trail.service'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get audit trail for this requisition
    const auditTrail = await AuditTrailService.getRequisitionAuditTrail(params.id)

    return NextResponse.json({
      data: auditTrail,
      count: auditTrail.length,
    })
  } catch (error: any) {
    console.error('Error fetching audit trail:', error)
    return NextResponse.json(
      { data: [], count: 0, error: 'Failed to fetch audit trail' },
      { status: 200 }
    )
  }
}
