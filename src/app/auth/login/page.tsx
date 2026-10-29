import { Suspense } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { LoginForm } from '@/components/LoginForm'
import { AuthLayout } from '@/components/auth/auth-layout'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your IRMS account to continue.</p>
        </div>

        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <LoginForm />
        </Suspense>

        <p className="text-center text-sm text-muted-foreground">
          New to IRMS?{' '}
          <Link href="/auth/register" className="font-medium text-primary underline-offset-4 hover:underline">
            Request an account
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
