'use client'

import { useAuth } from '@/hooks/useAuth'
import { AuthGuard } from '@/components/AuthGuard'
import DashboardLayout from '@/components/DashboardLayout'
import { RequisitionList } from '@/components/RequisitionList'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default function RequisitionsPage() {
  return (
    <AuthGuard>
      <RequisitionsContent />
    </AuthGuard>
  )
}

function RequisitionsContent() {
  const { user, isLoading } = useAuth()

  return (
    <DashboardLayout>
      {isLoading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Requisitions</h1>
              <p className="text-gray-600 mt-2 text-lg">Manage and track all your requisitions</p>
            </div>
            {user?.role === 'STAFF' || user?.role === 'ADMIN' ? (
              <Link
                href="/requisitions/new"
                className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-brand-primary rounded-lg hover:opacity-90 active:opacity-80 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
              >
                <Plus size={18} />
                Create Requisition
              </Link>
            ) : null}
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <RequisitionList />
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
