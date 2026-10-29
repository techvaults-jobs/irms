'use client'

import { PageHeader } from '@/components/shared/page-header'
import { RoleGate } from '@/components/shared/role-gate'
import { PaymentQueue } from '@/components/payments/payment-queue'

export default function PaymentsPage() {
  return (
    <RoleGate roles={['FINANCE', 'ADMIN']}>
      <div className="space-y-6">
        <PageHeader title="Payments" description="Approved requisitions waiting to be paid, with where and how to pay them." />
        <PaymentQueue />
      </div>
    </RoleGate>
  )
}
