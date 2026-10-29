import { AccountExistsError, UserService } from '@/services/user.service'
import { NotificationService } from '@/services/notification.service'
import { validateRequestBody, handleValidationError, ValidationError } from '@/lib/validation-middleware'
import { registerUserSchema, RegisterUserInput } from '@/lib/validation-schemas'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// Never prerender: the department list must reflect the live database
export const dynamic = 'force-dynamic'

/**
 * Departments a new staff member can choose from when registering.
 * Public: the sign-up form is shown before the user has a session.
 */
export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(departments)
  } catch (error: any) {
    console.error('Error fetching registration departments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 }
    )
  }
}

/**
 * Self-service staff registration. Creates a PENDING account that an
 * admin must approve before the user can sign in.
 */
export async function POST(req: NextRequest) {
  try {
    const { allowed, retryAfterSeconds } = checkRateLimit(
      `register:${getClientIp(req)}`,
      5,
      15 * 60 * 1000
    )
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      )
    }

    let body: RegisterUserInput
    try {
      body = await validateRequestBody<RegisterUserInput>(req, registerUserSchema)
    } catch (error) {
      if (error instanceof ValidationError) {
        return handleValidationError(error)
      }
      throw error
    }

    if (!body.email) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    const user = await UserService.registerUser(body)

    NotificationService.notifyAdminsOfRegistration(user).catch(error =>
      console.error('Failed to notify admins of registration:', error)
    )

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        accountStatus: user.accountStatus,
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error instanceof AccountExistsError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    if (error?.name === 'ReferentialIntegrityError') {
      return NextResponse.json({ error: 'Please select a valid department' }, { status: 400 })
    }
    console.error('Error registering user:', error)
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}
