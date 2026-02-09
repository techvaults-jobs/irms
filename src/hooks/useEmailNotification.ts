import { useState } from 'react'

interface EmailNotificationPayload {
  to: string
  subject: string
  type: 'requisition_created' | 'requisition_approved' | 'requisition_rejected' | 'approval_pending' | 'payment_recorded'
  data: Record<string, any>
}

export function useEmailNotification() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendNotification = async (payload: EmailNotificationPayload) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send email notification')
      }

      const data = await response.json()
      console.log('Email notification sent:', data)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      console.error('Error sending email notification:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    sendNotification,
    isLoading,
    error,
  }
}
