import { auth } from '@/auth'
import { InvalidPasswordError, UserService } from '@/services/user.service'
import { validateRequestBody, handleValidationError, ValidationError } from '@/lib/validation-middleware'
import { changePasswordSchema } from '@/lib/validation-schemas'
import { checkRateLimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Change the signed-in user's own password.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { allowed, retryAfterSeconds } = checkRateLimit(`password:${session.user.id}`, 5, 15 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
    )
  }

  let body: { currentPassword: string; newPassword: string }
  try {
    body = await validateRequestBody(req, changePasswordSchema)
  } catch (error) {
    if (error instanceof ValidationError) return handleValidationError(error)
    throw error
  }

  try {
    await UserService.changePassword(session.user.id, body.currentPassword, body.newPassword)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error instanceof InvalidPasswordError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error changing password:', error)
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }
}
