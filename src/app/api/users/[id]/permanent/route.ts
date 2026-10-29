import { auth } from '@/auth'
import { UserService } from '@/services/user.service'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (session.user.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Only admins can delete users' }, { status: 403 }) }
  }
  return { session }
}

/**
 * Preview what permanently deleting this user would remove.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin()
  if (error) return error
  try {
    return NextResponse.json(await UserService.getDeletionImpact(params.id))
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load user' }, { status: 404 })
  }
}

/**
 * Permanently delete a user and the data they own.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin()
  if (error) return error
  try {
    const result = await UserService.deleteUserPermanently(params.id, session!.user.id)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Error permanently deleting user:', err)
    return NextResponse.json({ error: err.message || 'Failed to delete user' }, { status: 400 })
  }
}
