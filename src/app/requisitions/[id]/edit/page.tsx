'use client'

import { useAuth } from '@/hooks/useAuth'
import { AuthGuard } from '@/components/AuthGuard'
import DashboardLayout from '@/components/DashboardLayout'
import { RequisitionForm } from '@/components/RequisitionForm'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function EditRequisitionPage({ params }: { params: { id: string } }) {
  return (
    <AuthGuard>
      <EditRequisitionContent params={params} />
    </AuthGuard>
  )
}

function EditRequisitionContent({ params }: { params: { id: string } }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [requisition, setRequisition] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingReq, setIsLoadingReq] = useState(true)
  const [showCancelModal, setShowCancelModal] = useState(false)

  useEffect(() => {
    // Only admins can edit requisitions
    if (!isLoading && user?.role !== 'ADMIN') {
      router.push('/requisitions')
      return
    }

    // Fetch the requisition
    const fetchRequisition = async () => {
      try {
        const response = await fetch(`/api/requisitions/${params.id}`)
        if (!response.ok) {
          throw new Error('Failed to fetch requisition')
        }
        const data = await response.json()
        setRequisition(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoadingReq(false)
      }
    }

    if (!isLoading) {
      fetchRequisition()
    }
  }, [isLoading, user, params.id, router])

  const handleCancel = () => {
    setShowCancelModal(true)
  }

  const handleConfirmCancel = () => {
    router.push(`/requisitions/${params.id}`)
  }

  if (isLoading || isLoadingReq) {
    return (
      <DashboardLayout>
        <div className="text-center text-gray-500">Loading...</div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <button
            onClick={() => router.push(`/requisitions/${params.id}`)}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium"
          >
            <ChevronLeft size={18} />
            Back to Requisition
          </button>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium"
        >
          <ChevronLeft size={18} />
          Back to Requisition
        </button>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Requisition</h1>
          <p className="text-gray-600 mt-2">Update requisition details</p>
        </div>

        {requisition && (
          <RequisitionForm
            initialData={requisition}
            isEditing={true}
            onSuccess={() => {
              router.push(`/requisitions/${params.id}`)
            }}
          />
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCancelModal}
        title="Discard Changes"
        message="Are you sure you want to go back? Any unsaved changes will be lost."
        confirmText="Discard"
        cancelText="Keep Editing"
        isDangerous={true}
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelModal(false)}
      />
    </DashboardLayout>
  )
}
