import { auth } from '@/auth'
import { UserService } from '@/services/user.service'
import { NotificationService } from '@/services/notification.service'
import { validateRequestBody, handleValidationError, ValidationError } from '@/lib/validation-middleware'
import { rejectAccountSchema } from '@/lib/validation-schemas'
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
        { error: 'Only admins can reject accounts' },
        { status: 403 }
      )
    }

    let body: { reason: string }
    try {
      body = await validateRequestBody(req, rejectAccountSchema)
    } catch (error) {
      if (error instanceof ValidationError) {
        return handleValidationError(error)
      }
      throw error
    }

    const user = await UserService.rejectAccount(params.id, session.user.id, body.reason)

    NotificationService.notifyAccountRejected(user, body.reason).catch(error =>
      console.error('Failed to send account rejection email:', error)
    )

    return NextResponse.json(user)
  } catch (error: any) {
    console.error('Error rejecting account:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reject account' },
      { status: 400 }
    )
  }
}
