'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from './empty-state'
import { useAuth } from '@/hooks/useAuth'

/**
 * Render children only for the given roles; everyone else sees an
 * access-denied state. Server routes still enforce access independently.
 */
export function RoleGate({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { user } = useAuth()

  if (!user?.role || !roles.includes(user.role)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="You don't have access to this page"
        description="Ask an administrator if you think you should."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
        className="mt-10"
      />
    )
  }

  return <>{children}</>
}
