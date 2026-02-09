import { auth } from '@/auth'
import { RequisitionService } from '@/services/requisition.service'
import { AuditTrailService } from '@/services/audit-trail.service'
import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'

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

    const requisition = await RequisitionService.getRequisition(params.id)

    if (!requisition) {
      return NextResponse.json(
        { error: 'Requisition not found' },
        { status: 404 }
      )
    }

    // Check access
    const userRole = session.user.role as UserRole
    if (
      userRole === 'STAFF' &&
      requisition.submitter.id !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    if (
      userRole === 'MANAGER' &&
      requisition.department.id !== session.user.departmentId
    ) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    return NextResponse.json(requisition)
  } catch (error: any) {
    console.error('Error fetching requisition:', error)
    return NextResponse.json(
      { error: 'Failed to fetch requisition' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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

    const requisition = await RequisitionService.getRequisition(params.id)

    if (!requisition) {
      return NextResponse.json(
        { error: 'Requisition not found' },
        { status: 404 }
      )
    }

    // Check ownership
    if (requisition.submitter.id !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const updated = await RequisitionService.updateRequisition(params.id, body)

    // Record field updates in audit trail
    for (const [key, value] of Object.entries(body)) {
      const previousValue = (requisition as any)[key]
      if (previousValue !== value) {
        await AuditTrailService.recordFieldUpdate(
          params.id,
          session.user.id,
          key,
          previousValue,
          value
        )
      }
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating requisition:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update requisition' },
      { status: 400 }
    )
  }
}
