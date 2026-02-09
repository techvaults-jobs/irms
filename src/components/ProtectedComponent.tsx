'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Permission } from '@/lib/rbac'
import { UserRole } from '@prisma/client'

interface ProtectedComponentProps {
  children: ReactNode
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  role?: UserRole | UserRole[]
  fallback?: ReactNode
}

export function ProtectedComponent({
  children,
  permission,
  permissions,
  requireAll = false,
  role,
  fallback = null,
}: ProtectedComponentProps) {
  const { checkPermission, checkRole, isLoading } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  let hasAccess = true

  if (role) {
    hasAccess = checkRole(role)
  }

  if (hasAccess && permission) {
    hasAccess = checkPermission(permission)
  }

  if (hasAccess && permissions && permissions.length > 0) {
    if (requireAll) {
      hasAccess = permissions.every(p => checkPermission(p))
    } else {
      hasAccess = permissions.some(p => checkPermission(p))
    }
  }

  if (!hasAccess) {
    return fallback
  }

  return <>{children}</>
}
