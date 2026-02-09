import { auth } from '@/auth'
import { ApprovalWorkflowService } from '@/services/approval-workflow.service'
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

    const userRole = session.user.role as UserRole
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can view approval rules' },
        { status: 403 }
      )
    }

    const rule = await ApprovalWorkflowService.getApprovalRule(params.id)

    if (!rule) {
      return NextResponse.json(
        { error: 'Approval rule not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(rule)
  } catch (error: any) {
    console.error('Error fetching approval rule:', error)
    return NextResponse.json(
      { error: 'Failed to fetch approval rule' },
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

    const userRole = session.user.role as UserRole
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can update approval rules' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const rule = await ApprovalWorkflowService.updateApprovalRule(params.id, body)

    return NextResponse.json(rule)
  } catch (error: any) {
    console.error('Error updating approval rule:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update approval rule' },
      { status: 400 }
    )
  }
}

export async function DELETE(
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

    const userRole = session.user.role as UserRole
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can delete approval rules' },
        { status: 403 }
      )
    }

    await ApprovalWorkflowService.deleteApprovalRule(params.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting approval rule:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete approval rule' },
      { status: 400 }
    )
  }
}
