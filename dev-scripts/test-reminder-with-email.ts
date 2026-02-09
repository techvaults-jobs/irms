/**
 * Test reminder notifications with actual email sending
 * Run with: npx ts-node --project tsconfig.json dev-scripts/test-reminder-with-email.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function sendReminderEmail(email: string, userName: string, requisitionTitle: string) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'noreply@irms.example.com',
        to: email,
        subject: `Reminder: Pending Requisition Approval - ${requisitionTitle}`,
        html: `
          <h2>Pending Approval Reminder</h2>
          <p>Hi ${userName},</p>
          <p>This is a reminder that you have a pending requisition awaiting your approval:</p>
          <p><strong>${requisitionTitle}</strong></p>
          <p>Please review and take action at your earliest convenience.</p>
          <p>Best regards,<br>IRMS System</p>
        `,
        text: `Pending Approval Reminder\n\nHi ${userName},\n\nThis is a reminder that you have a pending requisition awaiting your approval:\n\n${requisitionTitle}\n\nPlease review and take action at your earliest convenience.\n\nBest regards,\nIRMS System`,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return { success: true, messageId: data.id }
    } else {
      const error = await response.json()
      return { success: false, error: error.message }
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

async function testReminderWithEmail() {
  console.log('🧪 Testing Reminder Notifications with Email\n')

  try {
    const targetEmail = 'belloibrahv@gmail.com'

    // Step 1: Find the user
    console.log(`Step 1: Finding user ${targetEmail}...`)
    const user = await prisma.user.findUnique({
      where: { email: targetEmail },
      include: { settings: true },
    })

    if (!user) {
      console.error(`❌ User not found: ${targetEmail}`)
      return
    }

    console.log(`✓ Found user: ${user.name} (${user.email})\n`)

    // Step 2: Check if email service is configured
    console.log('Step 2: Checking email service...')
    const hasResendKey = !!process.env.RESEND_API_KEY
    console.log(`✓ Resend API configured: ${hasResendKey}`)

    if (!hasResendKey) {
      console.warn('⚠️  RESEND_API_KEY not set. Email will not be sent.')
      console.warn('   Set RESEND_API_KEY in .env to enable email sending\n')
    } else {
      console.log('✓ Email service ready\n')
    }

    // Step 3: Get pending requisitions
    console.log('Step 3: Getting pending requisitions...')
    const pendingRequisitions = await prisma.requisition.findMany({
      where: { status: 'PENDING' },
      take: 3,
    })

    console.log(`✓ Found ${pendingRequisitions.length} pending requisitions\n`)

    // Step 4: Send reminders
    console.log('Step 4: Sending reminder notifications...')

    let emailsSent = 0
    let notificationsCreated = 0

    for (const requisition of pendingRequisitions) {
      // Create in-app notification
      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          requisitionId: requisition.id,
          type: 'REMINDER',
          message: `Reminder: You have a pending requisition "${requisition.title}" awaiting your approval`,
          isRead: false,
        },
      })

      notificationsCreated++
      console.log(`✓ Created in-app reminder for: ${requisition.title}`)

      // Record in-app delivery
      await prisma.notificationDelivery.create({
        data: {
          userId: user.id,
          channel: 'IN_APP',
          status: 'DELIVERED',
          payload: JSON.stringify({
            type: 'REMINDER',
            requisitionId: requisition.id,
            timestamp: new Date().toISOString(),
          }),
        },
      })

      // Send email if service is configured
      if (hasResendKey) {
        const emailResult = await sendReminderEmail(
          user.email,
          user.name,
          requisition.title
        )

        if (emailResult.success) {
          emailsSent++
          console.log(`  ✓ Email sent (ID: ${emailResult.messageId})`)

          // Record email delivery
          await prisma.notificationDelivery.create({
            data: {
              userId: user.id,
              channel: 'EMAIL',
              status: 'DELIVERED',
              payload: JSON.stringify({
                type: 'REMINDER',
                requisitionId: requisition.id,
                messageId: emailResult.messageId,
                timestamp: new Date().toISOString(),
              }),
            },
          })
        } else {
          console.log(`  ✗ Email failed: ${emailResult.error}`)

          // Record failed delivery
          await prisma.notificationDelivery.create({
            data: {
              userId: user.id,
              channel: 'EMAIL',
              status: 'FAILED',
              payload: JSON.stringify({
                type: 'REMINDER',
                requisitionId: requisition.id,
                timestamp: new Date().toISOString(),
              }),
              error: emailResult.error,
            },
          })
        }
      }
    }
    console.log()

    // Step 5: Get statistics
    console.log('Step 5: Getting notification statistics...')

    const stats = await prisma.notificationDelivery.groupBy({
      by: ['channel', 'status'],
      where: { userId: user.id },
      _count: true,
    })

    console.log('✓ Delivery statistics:')
    stats.forEach(stat => {
      console.log(`  - ${stat.channel} (${stat.status}): ${stat._count}`)
    })
    console.log()

    // Step 6: Summary
    console.log('✅ Reminder notification test completed!\n')
    console.log('📊 Summary:')
    console.log(`  - User: ${user.name} (${user.email})`)
    console.log(`  - Notifications created: ${notificationsCreated}`)
    console.log(`  - Emails sent: ${emailsSent}`)
    console.log()

    console.log('🚀 Next steps:')
    console.log(`  1. Check email inbox: ${user.email}`)
    console.log('  2. Start app: npm run dev')
    console.log('  3. Log in as this user')
    console.log('  4. Check notification bell for reminders')
    console.log('  5. Go to Notifications page to see all reminders')
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testReminderWithEmail()
