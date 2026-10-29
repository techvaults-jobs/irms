import { auth } from '@/auth'
import { UserService } from '@/services/user.service'
import { NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'

export async function GET() {
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
        { error: 'Only admins can view user statistics' },
        { status: 403 }
      )
    }

    const stats = await UserService.getAccountStats()

    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('Error fetching user stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user statistics' },
      { status: 500 }
    )
  }
}
