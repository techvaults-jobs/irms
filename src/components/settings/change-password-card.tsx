'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { KeyRound, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { PasswordInput, PasswordStrength } from '@/components/auth/password-input'
import { FieldError } from '@/components/auth/field-error'
import { apiFetch } from '@/lib/utils'

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' }

export function ChangePasswordCard() {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof typeof EMPTY, string>>>({})
  const [saving, setSaving] = useState(false)

  const update = (field: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    setErrors(errs => ({ ...errs, [field]: undefined }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!form.currentPassword) next.currentPassword = 'Enter your current password'
    if (form.newPassword.length < 8) next.newPassword = 'Use at least 8 characters'
    else if (!/[A-Za-z]/.test(form.newPassword) || !/[0-9]/.test(form.newPassword)) next.newPassword = 'Include at least one letter and one number'
    else if (form.newPassword === form.currentPassword) next.newPassword = 'Choose a different password from your current one'
    if (form.confirmPassword !== form.newPassword) next.confirmPassword = 'Passwords do not match'
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    try {
      await apiFetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      })
      toast.success('Password changed', { description: 'Use your new password next time you sign in.' })
      setForm(EMPTY)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change password'
      if (/current password/i.test(message)) setErrors({ currentPassword: message })
      else toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <form onSubmit={submit} noValidate>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" /> Change password
          </CardTitle>
          <CardDescription>Use at least 8 characters with a letter and a number.</CardDescription>
        </CardHeader>
        <CardContent className="max-w-md space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <PasswordInput id="currentPassword" autoComplete="current-password" value={form.currentPassword} onChange={update('currentPassword')} aria-invalid={!!errors.currentPassword} />
            <FieldError message={errors.currentPassword} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <PasswordInput id="newPassword" autoComplete="new-password" value={form.newPassword} onChange={update('newPassword')} aria-invalid={!!errors.newPassword} />
            <PasswordStrength value={form.newPassword} />
            <FieldError message={errors.newPassword} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmNewPassword">Confirm new password</Label>
            <PasswordInput id="confirmNewPassword" autoComplete="new-password" value={form.confirmPassword} onChange={update('confirmPassword')} aria-invalid={!!errors.confirmPassword} />
            <FieldError message={errors.confirmPassword} />
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t pt-4">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <KeyRound />}
            Update password
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
