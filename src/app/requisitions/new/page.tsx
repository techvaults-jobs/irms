'use client'

import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/DashboardLayout'
import { RequisitionForm } from '@/components/RequisitionForm'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewRequisitionPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user && user.role !== 'STAFF' && user.role !== 'ADMIN' && user.role !== 'FINANCE' && user.role !== 'MANAGER') {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  return (
    <DashboardLayout>
      {isLoading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : !user || (user.role !== 'STAFF' && user.role !== 'ADMIN' && user.role !== 'FINANCE' && user.role !== 'MANAGER') ? (
        <div className="text-center text-red-600">You don&apos;t have permission to create requisitions</div>
      ) : (
        <div className="space-y-6">
          <Link
            href="/requisitions"
            className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium"
          >
            <ChevronLeft size={18} />
            Back to Requisitions
          </Link>

          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Requisition</h1>
            <p className="text-gray-600 mt-2">Fill in the details below to create a new requisition</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <RequisitionForm />
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
