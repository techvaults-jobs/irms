'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react'
import { AuthLayout } from '@/components/auth/auth-layout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const MESSAGES: Record<string, { title: string; message: string }> = {
  CredentialsSignin: {
    title: 'Invalid credentials',
    message: 'The email or password you entered is incorrect. Please try again.',
  },
  AccessDenied: {
    title: 'Access denied',
    message: 'You do not have permission to access this resource.',
  },
  SessionCallback: {
    title: 'Session error',
    message: 'There was a problem with your session. Please sign in again.',
  },
  SignoutCallbackError: {
    title: 'Sign-out error',
    message: 'Something went wrong while signing out. Please try again.',
  },
  Configuration: {
    title: 'Server configuration error',
    message: 'Authentication is not configured correctly. Contact your administrator.',
  },
}

function ErrorContent() {
  const searchParams = useSearchParams()
  const code = searchParams.get('error')
  const info = (code && MESSAGES[code]) || {
    title: 'Authentication failed',
    message: 'An unexpected error occurred during sign-in. Please try again.',
  }

  return (
    <div className="space-y-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{info.title}</h1>
        <p className="text-sm text-muted-foreground">{info.message}</p>
        {code && <p className="font-mono text-xs text-muted-foreground">Code: {code}</p>}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild className="flex-1">
          <Link href="/auth/login">
            <RotateCcw /> Try again
          </Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href="/">
            <ArrowLeft /> Back to home
          </Link>
        </Button>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <ErrorContent />
      </Suspense>
    </AuthLayout>
  )
}
