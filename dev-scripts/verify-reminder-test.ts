/**
 * Verify reminder notifications were created successfully
 * Run with: npx ts-node --project tsconfig.json dev-scripts/verify-reminder-test.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyReminderTest() {
  console.log('✅ Verifying Reminder Notifications\n')

  try {
    const targetEmail = 'belloibrahv@gmail.com'

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: targetEmail },
    })

    if (!user) {
      console.error(`❌ User not found: ${targetEmail}`)
      return
    }

    console.log(`📧 User: ${user.name} (${user.email})\n`)

    // Get all notifications for this user
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      include: { requisition: true },
      orderBy: { createdAt: 'desc' },
    })

    console.log(`📬 Notifications: ${notifications.length}\n`)

    if (notifications.length > 0) {
      console.log('Recent notifications:')
      notifications.slice(0, 5).forEach((notif, index) => {
        const isRead = notif.isRead ? '✓ Read' : '✗ Unread'
        console.log(`  ${index + 1}. [${notif.type}] ${isRead}`)
        console.log(`     Message: ${notif.message}`)
        console.log(`     Requisition: ${notif.requisition?.title}`)
        console.log(`     Created: ${notif.createdAt.toLocaleString()}`)
      })
      console.log()
    }

    // Get reminder notifications
    const reminders = await prisma.notification.findMany({
      where: { userId: user.id, type: 'REMINDER' },
    })

    console.log(`🔔 Reminder Notifications: ${reminders.length}`)
    if (reminders.length > 0) {
      console.log(`   ✓ Reminders are set up and working!\n`)
    }

    // Get delivery stats
    const deliveries = await prisma.notificationDelivery.findMany({
      where: { userId: user.id },
    })

    console.log(`📊 Delivery Records: ${deliveries.length}`)

    const byChannel = deliveries.reduce((acc, d) => {
      acc[d.channel] = (acc[d.channel] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const byStatus = deliveries.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('   By Channel:')
    Object.entries(byChannel).forEach(([channel, count]) => {
      console.log(`     - ${channel}: ${count}`)
    })

    console.log('   By Status:')
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`     - ${status}: ${count}`)
    })
    console.log()

    // Get pending requisitions
    const pendingReqs = await prisma.requisition.findMany({
      where: { status: 'PENDING' },
    })

    console.log(`⏳ Pending Requisitions: ${pendingReqs.length}`)
    if (pendingReqs.length > 0) {
      console.log('   Recent pending requisitions:')
      pendingReqs.slice(0, 3).forEach((req, index) => {
        console.log(`     ${index + 1}. ${req.title}`)
        console.log(`        ID: ${req.id}`)
        console.log(`        Cost: ${req.estimatedCost}`)
      })
      console.log()
    }

    // Summary
    console.log('✅ Verification Complete!\n')
    console.log('📋 What to do next:\n')

    console.log('1️⃣  Start the app:')
    console.log('   npm run dev\n')

    console.log('2️⃣  Open browser:')
    console.log('   http://localhost:3000\n')

    console.log('3️⃣  Log in as:')
    console.log(`   Email: ${user.email}`)
    console.log('   (Use your password)\n')

    console.log('4️⃣  Check notifications:')
    console.log('   - Look for notification bell (top right)')
    if (reminders.length > 0) {
      console.log(`   - Should show "${reminders.length}" unread notification(s)`)
    }
    console.log('   - Click to see reminder messages\n')

    console.log('5️⃣  Go to Notifications page:')
    console.log('   - Click "Notifications" in sidebar')
    console.log('   - See all reminder notifications')
    console.log('   - Mark as read or delete\n')

    console.log('6️⃣  Check email (optional):')
    console.log(`   - Check inbox: ${user.email}`)
    console.log('   - Look for reminder emails')
    console.log('   - (May not arrive if domain not verified)\n')

    console.log('🎉 Reminder notifications are ready to test!')
  } catch (error) {
    console.error('❌ Verification failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

verifyReminderTest()
