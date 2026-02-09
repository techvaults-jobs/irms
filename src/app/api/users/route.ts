import { auth } from '@/auth'
import { UserService } from '@/services/user.service'
import { validatePaginationParams, formatPaginationResult } from '@/lib/pagination'
import { validateRequestBody, handleValidationError, ValidationError } from '@/lib/validation-middleware'
import { createUserSchema } from '@/lib/validation-schemas'
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

    const userRole = session.user.role as UserRole
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can list users' },
        { status: 403 }
      )
    }

    const searchParams = req.nextUrl.searchParams
    const { skip, take } = validatePaginationParams(
      searchParams.get('skip'),
      searchParams.get('take'),
      100
    )

    const { users, total } = await UserService.listUsers(skip, take)
    const result = formatPaginationResult(users, skip, take, total)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error listing users:', error)
    return NextResponse.json(
      { error: 'Failed to list users' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
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
        { error: 'Only admins can create users' },
        { status: 403 }
      )
    }

    let body: any
    try {
      body = await validateRequestBody(req, createUserSchema)
    } catch (error) {
      if (error instanceof ValidationError) {
        return handleValidationError(error)
      }
      throw error
    }

    const user = await UserService.createUser(body, session.user.id)

    return NextResponse.json(user, { status: 201 })
  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 400 }
    )
  }
}
