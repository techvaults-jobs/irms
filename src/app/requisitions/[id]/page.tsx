'use client'

import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/DashboardLayout'
import { RequisitionDetail } from '@/components/RequisitionDetail'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function RequisitionDetailPage({ params }: { params: { id: string } }) {
  const { user, isLoading } = useAuth()

  return (
    <DashboardLayout>
      {isLoading ? (
        <div className="text-center text-gray-500">Loading...</div>
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
            <h1 className="text-3xl font-bold text-gray-900">Requisition Details</h1>
            <p className="text-gray-600 mt-2">View and manage requisition information</p>
          </div>

          <RequisitionDetail requisitionId={params.id} />
        </div>
      )}
    </DashboardLayout>
  )
}
