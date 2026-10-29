'use client'

import { signIn } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, ArrowRight, Hourglass, Loader2, Mail, UserX } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/auth/password-input'
import { FieldError } from '@/components/auth/field-error'

type LoginError = 'invalid' | 'pending' | 'rejected' | 'inactive' | 'network' | 'server'

const ERRORS: Record<LoginError, { title: string; message: string; icon: typeof AlertCircle; variant: 'destructive' | 'default' }> = {
  invalid: {
    title: 'Invalid credentials',
    message: 'The email or password you entered is incorrect.',
    icon: AlertCircle,
    variant: 'destructive',
  },
  pending: {
    title: 'Awaiting approval',
    message: 'Your account request has been received. An administrator needs to approve it before you can sign in.',
    icon: Hourglass,
    variant: 'default',
  },
  rejected: {
    title: 'Account request declined',
    message: 'Your registration was not approved. Contact your administrator, or submit a new request.',
    icon: UserX,
    variant: 'destructive',
  },
  inactive: {
    title: 'Account deactivated',
    message: 'Your account has been deactivated. Contact your administrator to restore access.',
    icon: UserX,
    variant: 'destructive',
  },
  network: {
    title: 'Connection error',
    message: 'Unable to reach the server. Check your connection and try again.',
    icon: AlertCircle,
    variant: 'destructive',
  },
  server: {
    title: 'Sign-in failed',
    message: 'Something went wrong on our side. Please try again in a moment.',
    icon: AlertCircle,
    variant: 'destructive',
  },
}

const CODE_TO_ERROR: Record<string, LoginError> = {
  account_pending: 'pending',
  account_rejected: 'rejected',
  account_inactive: 'inactive',
}

export function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<LoginError | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({})

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) setEmail(decodeURIComponent(emailParam))
  }, [searchParams])

  const validateForm = () => {
    const errors: { email?: string; password?: string } = {}
    if (!email) errors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address'
    if (!password) errors.password = 'Password is required'
    else if (password.length < 6) errors.password = 'Password must be at least 6 characters'
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validateForm()) return

    setError(null)
    setIsLoading(true)

    try {
      const result = await signIn('credentials', { email, password, redirect: false })

      if (!result) {
        setError('server')
      } else if (result.error) {
        const code = (result as { code?: string }).code
        setError(code && CODE_TO_ERROR[code] ? CODE_TO_ERROR[code] : result.error.includes('CredentialsSignin') ? 'invalid' : 'server')
      } else if (result.ok) {
        const callbackUrl = searchParams.get('callbackUrl')
        // Hard redirect so the new session cookie is picked up everywhere
        window.location.href = callbackUrl?.startsWith('/') ? callbackUrl : '/dashboard'
        return
      } else {
        setError('server')
      }
    } catch {
      setError('network')
    }
    setIsLoading(false)
  }

  const registered = searchParams.get('registered') === '1'
  const info = error ? ERRORS[error] : null

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {registered && !error && (
        <Alert className="border-success/30 bg-success/5">
          <Hourglass className="h-4 w-4 !text-success" />
          <AlertTitle>Request submitted</AlertTitle>
          <AlertDescription>
            Your account is pending approval. You&apos;ll be able to sign in once an administrator approves it.
          </AlertDescription>
        </Alert>
      )}

      {info && (
        <Alert variant={info.variant} className={info.variant === 'default' ? 'border-warning/30 bg-warning/5' : undefined}>
          <info.icon className={info.variant === 'default' ? 'h-4 w-4 !text-warning' : 'h-4 w-4'} />
          <AlertTitle>{info.title}</AlertTitle>
          <AlertDescription>
            {info.message}
            {error === 'rejected' && (
              <Link href="/auth/register" className="mt-1 block font-medium underline underline-offset-4">
                Submit a new request
              </Link>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@techvaults.com"
            className="pl-9"
            value={email}
            aria-invalid={!!validationErrors.email}
            onChange={e => {
              setEmail(e.target.value)
              setValidationErrors(v => ({ ...v, email: undefined }))
            }}
          />
        </div>
        <FieldError message={validationErrors.email} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          aria-invalid={!!validationErrors.password}
          onChange={e => {
            setPassword(e.target.value)
            setValidationErrors(v => ({ ...v, password: undefined }))
          }}
        />
        <FieldError message={validationErrors.password} />
      </div>

      <Button type="submit" className="h-10 w-full" disabled={isLoading}>
        {isLoading ? <Loader2 className="animate-spin" /> : null}
        {isLoading ? 'Signing in…' : 'Sign in'}
        {!isLoading && <ArrowRight />}
      </Button>
    </form>
  )
}
