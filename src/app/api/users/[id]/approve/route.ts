import { auth } from '@/auth'
import { UserService } from '@/services/user.service'
import { NotificationService } from '@/services/notification.service'
import { validateRequestBody, handleValidationError, ValidationError } from '@/lib/validation-middleware'
import { approveAccountSchema } from '@/lib/validation-schemas'
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

    const userRole = session.user.role as UserRole
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can approve accounts' },
        { status: 403 }
      )
    }

    let body: { role: UserRole; departmentId?: string }
    try {
      body = await validateRequestBody(req, approveAccountSchema)
    } catch (error) {
      if (error instanceof ValidationError) {
        return handleValidationError(error)
      }
      throw error
    }

    const user = await UserService.approveAccount(params.id, session.user.id, body)

    NotificationService.notifyAccountApproved(user).catch(error =>
      console.error('Failed to send account approval email:', error)
    )

    return NextResponse.json(user)
  } catch (error: any) {
    console.error('Error approving account:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to approve account' },
      { status: 400 }
    )
  }
}
