'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Briefcase, Building2, CheckCircle2, Hourglass, Loader2, Mail, Phone, ShieldCheck, User } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PasswordInput, PasswordStrength } from './password-input'
import { FieldError } from './field-error'
import { apiFetch, cn } from '@/lib/utils'

interface Department {
  id: string
  name: string
}

const EMPTY = {
  name: '',
  email: '',
  jobTitle: '',
  phone: '',
  departmentId: '',
  password: '',
  confirmPassword: '',
}

type Fields = typeof EMPTY
type FieldErrors = Partial<Record<keyof Fields | 'agree', string>>

function IconInput({ icon: Icon, className, ...props }: React.ComponentProps<typeof Input> & { icon: typeof Mail }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input className={cn('pl-9', className)} {...props} />
    </div>
  )
}

export function RegisterForm() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [form, setForm] = useState<Fields>(EMPTY)
  const [agree, setAgree] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<Department[]>('/api/auth/register')
      .then(setDepartments)
      .catch(() => setSubmitError('Could not load departments. Refresh the page to try again.'))
  }, [])

  const update = (field: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    setErrors(errs => ({ ...errs, [field]: undefined }))
  }

  const validate = () => {
    const next: FieldErrors = {}
    if (form.name.trim().length < 2) next.name = 'Enter your full name'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address'
    if (!form.departmentId) next.departmentId = 'Select your department'
    if (form.phone && !/^[0-9+()\-\s]*$/.test(form.phone)) next.phone = 'Use digits, spaces, +, - or ()'
    if (form.password.length < 8) next.password = 'Use at least 8 characters'
    else if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) next.password = 'Include at least one letter and one number'
    if (form.confirmPassword !== form.password) next.confirmPassword = 'Passwords do not match'
    if (!agree) next.agree = 'Please confirm to continue'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    if (!validate()) return

    setIsLoading(true)
    try {
      const { confirmPassword: _confirm, ...payload } = form
      await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          jobTitle: payload.jobTitle || undefined,
          phone: payload.phone || undefined,
        }),
      })
      setSubmittedEmail(form.email.trim().toLowerCase())
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (submittedEmail) {
    return <RegistrationSubmitted email={submittedEmail} />
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {submitError && (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <IconInput icon={User} id="name" autoComplete="name" placeholder="Ada Okafor" value={form.name} onChange={update('name')} aria-invalid={!!errors.name} />
        <FieldError message={errors.name} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <IconInput icon={Mail} id="email" type="email" autoComplete="email" placeholder="you@techvaults.com" value={form.email} onChange={update('email')} aria-invalid={!!errors.email} />
        <FieldError message={errors.email} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Select
            value={form.departmentId}
            onValueChange={value => {
              setForm(f => ({ ...f, departmentId: value }))
              setErrors(errs => ({ ...errs, departmentId: undefined }))
            }}
          >
            <SelectTrigger id="department" aria-invalid={!!errors.departmentId} className="h-9">
              <div className="flex items-center gap-2 truncate">
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="Select…" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.departmentId} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="jobTitle">
            Job title <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <IconInput icon={Briefcase} id="jobTitle" autoComplete="organization-title" placeholder="Analyst" value={form.jobTitle} onChange={update('jobTitle')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">
          Phone <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <IconInput icon={Phone} id="phone" type="tel" autoComplete="tel" placeholder="+234 800 000 0000" value={form.phone} onChange={update('phone')} aria-invalid={!!errors.phone} />
        <FieldError message={errors.phone} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput id="password" autoComplete="new-password" placeholder="Create a password" value={form.password} onChange={update('password')} aria-invalid={!!errors.password} />
        <PasswordStrength value={form.password} />
        <FieldError message={errors.password} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <PasswordInput id="confirmPassword" autoComplete="new-password" placeholder="Repeat your password" value={form.confirmPassword} onChange={update('confirmPassword')} aria-invalid={!!errors.confirmPassword} />
        <FieldError message={errors.confirmPassword} />
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
          <Checkbox
            id="agree"
            checked={agree}
            onCheckedChange={checked => {
              setAgree(checked === true)
              setErrors(errs => ({ ...errs, agree: undefined }))
            }}
            className="mt-0.5"
          />
          <Label htmlFor="agree" className="text-sm font-normal leading-snug text-muted-foreground">
            I&apos;m a Techvaults staff member. I understand an administrator will review this request and assign my role.
          </Label>
        </div>
        <FieldError message={errors.agree} />
      </div>

      <Button type="submit" className="h-10 w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="animate-spin" />}
        {isLoading ? 'Submitting request…' : 'Request account'}
        {!isLoading && <ArrowRight />}
      </Button>
    </form>
  )
}

function RegistrationSubmitted({ email }: { email: string }) {
  const steps = [
    { icon: CheckCircle2, title: 'Request submitted', text: 'We received your details.', state: 'done' },
    { icon: Hourglass, title: 'Admin review', text: 'An administrator will verify your account and assign a role.', state: 'current' },
    { icon: ShieldCheck, title: 'Access granted', text: 'Sign in with the email and password you just created.', state: 'upcoming' },
  ] as const

  return (
    <div className="space-y-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
        <CheckCircle2 className="h-6 w-6 text-success" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">You&apos;re on the list</h2>
        <p className="text-sm text-muted-foreground">
          Your request for <span className="font-medium text-foreground">{email}</span> is awaiting approval.
        </p>
      </div>
      <ol className="space-y-4">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border',
                  step.state === 'done' && 'border-success/30 bg-success/10 text-success',
                  step.state === 'current' && 'border-warning/30 bg-warning/10 text-warning',
                  step.state === 'upcoming' && 'text-muted-foreground'
                )}
              >
                <step.icon className="h-4 w-4" />
              </div>
              {index < steps.length - 1 && <div className="mt-1 w-px flex-1 bg-border" />}
            </div>
            <div className="pb-2">
              <p className="text-sm font-medium">{step.title}</p>
              <p className="text-sm text-muted-foreground">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <Button asChild className="w-full">
        <Link href={`/auth/login?registered=1&email=${encodeURIComponent(email)}`}>Back to sign in</Link>
      </Button>
    </div>
  )
}
