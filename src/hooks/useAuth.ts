'use client'

import { useSession } from 'next-auth/react'
import { hasPermission, hasFeature, Permission } from '@/lib/rbac'
import { UserRole } from '@prisma/client'

export function useAuth() {
  const { data: session, status } = useSession()

  const isLoading = status === 'loading'
  const isAuthenticated = status === 'authenticated'
  const user = session?.user

  const checkPermission = (permission: Permission): boolean => {
    if (!user?.role) return false
    return hasPermission(user.role as UserRole, permission)
  }

  const checkFeature = (feature: string): boolean => {
    if (!user?.role) return false
    return hasFeature(user.role as UserRole, feature)
  }

  const checkRole = (role: UserRole | UserRole[]): boolean => {
    if (!user?.role) return false
    if (Array.isArray(role)) {
      return role.includes(user.role as UserRole)
    }
    return user.role === role
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    checkPermission,
    checkFeature,
    checkRole,
  }
}
