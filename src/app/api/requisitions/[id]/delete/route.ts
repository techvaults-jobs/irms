import { auth } from '@/auth'
import { RequisitionService } from '@/services/requisition.service'
import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'

export async function POST(
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

    // Only admins can delete requisitions
    const userRole = session.user.role as UserRole
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Only admins can delete requisitions' },
        { status: 403 }
      )
    }

    const requisition = await RequisitionService.getRequisition(params.id)

    if (!requisition) {
      return NextResponse.json(
        { error: 'Requisition not found' },
        { status: 404 }
      )
    }

    // Delete the requisition (cascading deletes will handle related records)
    await RequisitionService.deleteRequisition(params.id)

    return NextResponse.json({
      success: true,
      message: 'Requisition deleted successfully',
      id: params.id,
    })
  } catch (error: any) {
    console.error('Error deleting requisition:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete requisition' },
      { status: 400 }
    )
  }
}
