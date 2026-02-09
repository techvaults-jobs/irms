'use client'

import { useAuth } from '@/hooks/useAuth'
import EnhancedDashboardLayout from '@/components/EnhancedDashboardLayout'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle, Save } from 'lucide-react'

export default function SettingsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [settings, setSettings] = useState({
    emailNotifications: true,
    approvalReminders: true,
    weeklyReports: true,
    systemAlerts: true,
  })

  useEffect(() => {
    if (!isLoading && user && user.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (!isLoading && user && user.role === 'ADMIN') {
      fetchSettings()
    }
  }, [isLoading, user])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    }
  }

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <EnhancedDashboardLayout>
      {isLoading ? (
        <div className="text-center text-brand-gray">Loading...</div>
      ) : !user || user.role !== 'ADMIN' ? (
        <div className="text-center text-brand-primary">You don&apos;t have permission to access settings</div>
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-brand-dark">System Settings</h1>
            <p className="text-brand-gray mt-2">Configure system-wide preferences and notifications</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Settings Panel */}
            <div className="lg:col-span-2">
              <div className="bg-brand-light rounded-lg shadow-sm p-6 border border-brand-gray-border space-y-6">
                {error && (
                  <div className="flex items-center gap-2 p-4 bg-brand-primary bg-opacity-10 border border-brand-primary border-opacity-20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-brand-primary" />
                    <p className="text-sm text-brand-primary">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-green-700">Settings saved successfully</p>
                  </div>
                )}

                {/* Notification Settings */}
                <div>
                  <h2 className="text-lg font-semibold text-brand-dark mb-4">Notifications</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-brand-gray-light rounded-lg">
                      <div>
                        <p className="font-medium text-brand-dark">Email Notifications</p>
                        <p className="text-sm text-brand-gray">Receive email updates on requisition status</p>
                      </div>
                      <button
                        onClick={() => handleToggle('emailNotifications')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.emailNotifications ? 'bg-brand-primary' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-brand-gray-light rounded-lg">
                      <div>
                        <p className="font-medium text-brand-dark">Approval Reminders</p>
                        <p className="text-sm text-brand-gray">Get reminders for pending approvals</p>
                      </div>
                      <button
                        onClick={() => handleToggle('approvalReminders')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.approvalReminders ? 'bg-brand-primary' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.approvalReminders ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-brand-gray-light rounded-lg">
                      <div>
                        <p className="font-medium text-brand-dark">Weekly Reports</p>
                        <p className="text-sm text-brand-gray">Receive weekly spending reports</p>
                      </div>
                      <button
                        onClick={() => handleToggle('weeklyReports')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.weeklyReports ? 'bg-brand-primary' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.weeklyReports ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-brand-gray-light rounded-lg">
                      <div>
                        <p className="font-medium text-brand-dark">System Alerts</p>
                        <p className="text-sm text-brand-gray">Receive critical system alerts</p>
                      </div>
                      <button
                        onClick={() => handleToggle('systemAlerts')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.systemAlerts ? 'bg-brand-primary' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.systemAlerts ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex gap-4 pt-4 border-t border-brand-gray-border">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-light bg-brand-primary rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    <Save size={18} />
                    {isSaving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </div>

            {/* Info Panel */}
            <div className="lg:col-span-1">
              <div className="bg-brand-light rounded-lg shadow-sm p-6 border border-brand-gray-border space-y-4">
                <h3 className="font-semibold text-brand-dark">System Information</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-brand-gray">Version</p>
                    <p className="font-medium text-brand-dark">1.0.0</p>
                  </div>
                  <div>
                    <p className="text-brand-gray">Last Updated</p>
                    <p className="font-medium text-brand-dark">Today</p>
                  </div>
                  <div>
                    <p className="text-brand-gray">Status</p>
                    <p className="font-medium text-green-600">Operational</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </EnhancedDashboardLayout>
  )
}
