import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { hasPermission, Permission, canAccessRequisition, canPerformAction } from './rbac'
import { UserRole } from '@prisma/client'

export async function withAuth(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>,
  requiredPermissions?: Permission[]
) {
  return async (req: NextRequest, context: any) => {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      const userRole = session.user.role as UserRole
      const hasRequiredPermission = requiredPermissions.some(permission =>
        hasPermission(userRole, permission)
      )

      if (!hasRequiredPermission) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }
    }

    return handler(req, context)
  }
}

export async function withRoleCheck(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>,
  allowedRoles: UserRole[]
) {
  return async (req: NextRequest, context: any) => {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userRole = session.user.role as UserRole
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    return handler(req, context)
  }
}

/**
 * Middleware to check if user has specific permission
 */
export async function requirePermission(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>,
  permission: Permission
) {
  return async (req: NextRequest, context: any) => {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userRole = session.user.role as UserRole
    if (!hasPermission(userRole, permission)) {
      return NextResponse.json(
        { error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      )
    }

    return handler(req, context)
  }
}

/**
 * Middleware to check if user can perform a specific action
 */
export async function requireAction(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>,
  action: 'approve' | 'reject' | 'record_payment' | 'view_audit' | 'manage_rules'
) {
  return async (req: NextRequest, context: any) => {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userRole = session.user.role as UserRole
    if (!canPerformAction(userRole, action)) {
      return NextResponse.json(
        { error: `Forbidden: cannot perform action '${action}'` },
        { status: 403 }
      )
    }

    return handler(req, context)
  }
}

/**
 * Middleware to check if user can access a specific requisition
 */
export async function requireRequisitionAccess(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>,
  getRequisitionData: (context: any) => Promise<{
    departmentId: string
    submitterId: string
  }>
) {
  return async (req: NextRequest, context: any) => {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    try {
      const requisitionData = await getRequisitionData(context)
      const userRole = session.user.role as UserRole
      const userDepartmentId = session.user.departmentId as string
      const userId = session.user.id as string

      if (
        !canAccessRequisition(
          userRole,
          userDepartmentId,
          requisitionData.departmentId,
          requisitionData.submitterId,
          userId
        )
      ) {
        return NextResponse.json(
          { error: 'Forbidden: cannot access this requisition' },
          { status: 403 }
        )
      }

      return handler(req, context)
    } catch (error) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      )
    }
  }
}
