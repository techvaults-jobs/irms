import { auth } from '@/auth'
import { UserService } from '@/services/user.service'
import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'

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
        { error: 'Only admins can update users' },
        { status: 403 }
      )
    }

    const userId = params.id
    const body = await req.json()

    // Get current user to track role changes
    const currentUser = await UserService.getUserById(userId)
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const updatedUser = await UserService.updateUser(userId, body, session.user.id)

    // Record role change in audit trail if role was changed
    if (body.role && body.role !== currentUser.role) {
      // Create an audit trail entry for the role change
      // We'll create a dummy requisition entry to track this
      // For now, we'll just log it in the response metadata
      // In a real system, you might want a separate AuditLog table for non-requisition changes
    }

    return NextResponse.json(updatedUser)
  } catch (error: any) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
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
        { error: 'Only admins can deactivate users' },
        { status: 403 }
      )
    }

    const userId = params.id

    // Prevent admin from deactivating themselves
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot deactivate your own account' },
        { status: 400 }
      )
    }

    const deactivatedUser = await UserService.deactivateUser(userId, session.user.id)

    return NextResponse.json(deactivatedUser)
  } catch (error: any) {
    console.error('Error deactivating user:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to deactivate user' },
      { status: 400 }
    )
  }
}
