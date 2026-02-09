'use client'

import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/DashboardLayout'
import { UserManagement } from '@/components/UserManagement'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function UsersPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user && user.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  return (
    <DashboardLayout>
      {isLoading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : !user || user.role !== 'ADMIN' ? (
        <div className="text-center text-red-600">You don&apos;t have permission to manage users</div>
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-2">Manage system users and their roles</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <UserManagement />
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
