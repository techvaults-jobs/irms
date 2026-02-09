import { NextRequest, NextResponse } from 'next/server'
import { sendEmailNotification, EmailNotificationPayload } from '@/services/email.service'
import { auth } from '@/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { to, subject, type, data } = body as EmailNotificationPayload

    if (!to || !type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: to, type, data' },
        { status: 400 }
      )
    }

    const result = await sendEmailNotification({
      to,
      subject,
      type,
      data,
    })

    return NextResponse.json(
      { success: true, data: result },
      { status: 200 }
    )
  } catch (error) {
    console.error('Email notification error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}
