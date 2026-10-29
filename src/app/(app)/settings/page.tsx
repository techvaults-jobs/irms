'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { BellRing, Building2, Loader2, Mail, Save, ShieldCheck, Smartphone, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { UserAvatar } from '@/components/shared/user-avatar'
import { ApprovalRuleConfig } from '@/components/ApprovalRuleConfig'
import { useAuth } from '@/hooks/useAuth'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { ROLES } from '@/lib/status'
import { apiFetch } from '@/lib/utils'

interface Preferences {
  emailNotifications: boolean
  approvalReminders: boolean
  weeklyReports: boolean
  systemAlerts: boolean
}

const PREFERENCE_ITEMS: { key: keyof Preferences; title: string; description: string }[] = [
  { key: 'emailNotifications', title: 'Email notifications', description: 'Status updates on your requisitions by email.' },
  { key: 'approvalReminders', title: 'Approval reminders', description: 'Reminders when approvals are waiting on you.' },
  { key: 'weeklyReports', title: 'Weekly reports', description: 'A weekly summary of spending activity.' },
  { key: 'systemAlerts', title: 'System alerts', description: 'Important notices about IRMS itself.' },
]

export default function SettingsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your profile, notifications and system configuration." />
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          {isAdmin && <TabsTrigger value="workflow">Approval workflow</TabsTrigger>}
        </TabsList>
        <TabsContent value="profile" className="mt-4">
          <ProfileCard />
        </TabsContent>
        <TabsContent value="notifications" className="mt-4 space-y-4">
          <PreferencesCard />
          <PushCard />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="workflow" className="mt-4">
            <ApprovalRuleConfig />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

function ProfileCard() {
  const { user } = useAuth()
  const [department, setDepartment] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<{ id: string; name: string }[]>('/api/departments')
      .then(list => setDepartment(list.find(d => d.id === user?.departmentId)?.name ?? '—'))
      .catch(() => setDepartment('—'))
  }, [user?.departmentId])

  const role = user?.role ? ROLES[user.role] : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your profile</CardTitle>
        <CardDescription>Contact an administrator to change your name, role or department.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <UserAvatar name={user?.name} className="h-14 w-14 text-base" />
          <div>
            <p className="text-lg font-semibold">{user?.name}</p>
            <StatusBadge kind="role" value={user?.role} />
          </div>
        </div>
        <Separator />
        <dl className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: User, label: 'Full name', value: user?.name },
            { icon: Mail, label: 'Email', value: user?.email },
            { icon: Building2, label: 'Department', value: department },
            { icon: ShieldCheck, label: 'Permissions', value: role?.description },
          ].map(item => (
            <div key={item.label} className="flex gap-3 rounded-lg border p-3">
              <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                <dd className="truncate text-sm font-medium">{item.value ?? <Skeleton className="h-4 w-24" />}</dd>
              </div>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

function PreferencesCard() {
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [saved, setSaved] = useState<Preferences | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiFetch<Preferences>('/api/settings')
      .then(data => {
        setPrefs(data)
        setSaved(data)
      })
      .catch(() => toast.error('Failed to load preferences'))
  }, [])

  const dirty = !!prefs && !!saved && PREFERENCE_ITEMS.some(item => prefs[item.key] !== saved[item.key])

  const save = async () => {
    if (!prefs) return
    setSaving(true)
    try {
      await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      setSaved(prefs)
      toast.success('Preferences saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Email & alerts</CardTitle>
        <CardDescription>Choose what we send you.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {PREFERENCE_ITEMS.map((item, index) => (
          <div key={item.key}>
            {index > 0 && <Separator className="my-3" />}
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor={item.key} className="cursor-pointer space-y-0.5 font-normal">
                <span className="block text-sm font-medium">{item.title}</span>
                <span className="block text-sm text-muted-foreground">{item.description}</span>
              </Label>
              {prefs ? (
                <Switch id={item.key} checked={prefs[item.key]} onCheckedChange={checked => setPrefs(p => (p ? { ...p, [item.key]: checked } : p))} />
              ) : (
                <Skeleton className="h-5 w-9 rounded-full" />
              )}
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-end border-t pt-4">
        <Button onClick={save} disabled={!dirty || saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          Save preferences
        </Button>
      </CardFooter>
    </Card>
  )
}

function PushCard() {
  const { isSupported, isSubscribed, isLoading, error, subscribe, unsubscribe } = usePushNotifications()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className="h-4 w-4" /> Push notifications
        </CardTitle>
        <CardDescription>Get notified on this device even when IRMS isn&apos;t open.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">This browser</p>
              <p className="text-sm text-muted-foreground">
                {!isSupported ? 'Not supported in this browser' : isSubscribed ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
          <Switch
            checked={isSubscribed}
            disabled={!isSupported || isLoading}
            onCheckedChange={checked => (checked ? subscribe() : unsubscribe())}
            aria-label="Toggle push notifications"
          />
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
