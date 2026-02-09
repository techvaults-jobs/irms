'use client'

import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/DashboardLayout'
import { RequisitionList } from '@/components/RequisitionList'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default function RequisitionsPage() {
  const { user, isLoading } = useAuth()

  return (
    <DashboardLayout>
      {isLoading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Requisitions</h1>
              <p className="text-gray-600 mt-2">Manage and track all your requisitions</p>
            </div>
            {user?.role === 'STAFF' || user?.role === 'ADMIN' ? (
              <Link
                href="/requisitions/new"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                <Plus size={18} />
                Create Requisition
              </Link>
            ) : null}
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <RequisitionList />
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
