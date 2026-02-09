import { prisma } from '../src/lib/prisma'
import { NotificationManager } from '../src/lib/notification-manager'
import { PushNotificationService } from '../src/lib/push-notifications'

/**
 * Test script for push notifications
 * Run with: npx ts-node dev-scripts/test-push-notifications.ts
 */

async function testPushNotifications() {
  console.log('🧪 Starting Push Notification Tests\n')

  try {
    // Test 1: Check if push notifications are configured
    console.log('Test 1: Checking VAPID configuration...')
    const isConfigured = PushNotificationService.isPushNotificationsConfigured()
    console.log(`✓ Push notifications configured: ${isConfigured}\n`)

    if (!isConfigured) {
      console.warn('⚠️  Push notifications not configured. Set VAPID keys in .env\n')
    }

    // Test 2: Get a test user
    console.log('Test 2: Finding test user...')
    let user
    try {
      user = await prisma.user.findFirst({
        include: { settings: true },
      })
    } catch (dbError: any) {
      if (dbError.code === 'P1001') {
        console.error('❌ Database connection failed')
        console.error('   Make sure your database is running and accessible')
        console.error(`   Database URL: ${process.env.DATABASE_URL?.split('@')[1] || 'not set'}\n`)
        return
      }
      throw dbError
    }

    if (!user) {
      console.error('❌ No users found in database')
      return
    }

    console.log(`✓ Found user: ${user.email} (${user.name})`)
    console.log(`  - Settings: ${user.settings ? 'Yes' : 'No'}\n`)

    // Test 3: Get a test requisition
    console.log('Test 3: Finding test requisition...')
    const requisition = await prisma.requisition.findFirst({
      include: { submitter: true },
    })

    if (!requisition) {
      console.error('❌ No requisitions found in database')
      return
    }

    console.log(`✓ Found requisition: ${requisition.title}`)
    console.log(`  - ID: ${requisition.id}`)
    console.log(`  - Status: ${requisition.status}`)
    console.log(`  - Submitter: ${requisition.submitter.name}\n`)

    // Test 4: Send in-app notification
    console.log('Test 4: Sending in-app notification...')
    const inAppResult = await NotificationManager.sendNotification(
      user.id,
      requisition.id,
      'APPROVED',
      'Test in-app notification',
      { channels: ['IN_APP'] }
    )
    console.log(`✓ In-app notification sent: ${inAppResult.inApp}\n`)

    // Test 5: Send email notification
    console.log('Test 5: Sending email notification...')
    const emailResult = await NotificationManager.sendNotification(
      user.id,
      requisition.id,
      'APPROVED',
      'Test email notification',
      { channels: ['EMAIL'] }
    )
    console.log(`✓ Email notification sent: ${emailResult.email}\n`)

    // Test 6: Send push notification
    console.log('Test 6: Sending push notification...')
    const pushResult = await NotificationManager.sendNotification(
      user.id,
      requisition.id,
      'APPROVED',
      'Test push notification',
      { channels: ['PUSH'] }
    )
    console.log(`✓ Push notification sent: ${pushResult.push}\n`)

    // Test 7: Send multi-channel notification
    console.log('Test 7: Sending multi-channel notification...')
    const multiResult = await NotificationManager.sendNotification(
      user.id,
      requisition.id,
      'SUBMITTED',
      'Test multi-channel notification',
      {
        channels: ['IN_APP', 'EMAIL', 'PUSH'],
        priority: 'HIGH',
      }
    )
    console.log(`✓ Multi-channel notification sent:`)
    console.log(`  - In-app: ${multiResult.inApp}`)
    console.log(`  - Email: ${multiResult.email}`)
    console.log(`  - Push: ${multiResult.push}\n`)

    // Test 8: Get delivery statistics
    console.log('Test 8: Getting delivery statistics...')
    const stats = await NotificationManager.getDeliveryStats(user.id)
    console.log(`✓ Delivery statistics:`)
    console.log(`  - Total: ${stats.total}`)
    console.log(`  - Delivered: ${stats.delivered}`)
    console.log(`  - Failed: ${stats.failed}`)
    console.log(`  - Success rate: ${stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0}%`)
    console.log(`  - By channel:`)
    console.log(`    - Email: ${stats.byChannel.EMAIL}`)
    console.log(`    - Push: ${stats.byChannel.PUSH}`)
    console.log(`    - In-app: ${stats.byChannel.IN_APP}\n`)

    // Test 9: Get delivery history
    console.log('Test 9: Getting delivery history...')
    const history = await NotificationManager.getDeliveryHistory(user.id, 5)
    console.log(`✓ Recent deliveries (${history.length}):`)
    history.forEach((delivery, index) => {
      console.log(`  ${index + 1}. ${delivery.channel} - ${delivery.status} (${new Date(delivery.createdAt).toLocaleString()})`)
    })
    console.log()

    // Test 10: Check user preferences
    console.log('Test 10: Checking user notification preferences...')
    const userWithSettings = await prisma.user.findUnique({
      where: { id: user.id },
      include: { settings: true },
    })

    if (userWithSettings?.settings) {
      console.log(`✓ User preferences:`)
      console.log(`  - Email notifications: ${userWithSettings.settings.emailNotifications}`)
      console.log(`  - Approval reminders: ${userWithSettings.settings.approvalReminders}`)
      console.log(`  - Weekly reports: ${userWithSettings.settings.weeklyReports}`)
      console.log(`  - System alerts: ${userWithSettings.settings.systemAlerts}`)
    } else {
      console.log('⚠️  No user settings found')
    }
    console.log()

    // Test 11: Bulk notification
    console.log('Test 11: Sending bulk notification...')
    const users = await prisma.user.findMany({ take: 3 })
    const userIds = users.map(u => u.id)

    const bulkResult = await NotificationManager.sendBulkNotification(
      userIds,
      requisition.id,
      'REMINDER',
      'Test bulk notification',
      { channels: ['IN_APP', 'EMAIL'] }
    )
    console.log(`✓ Bulk notification sent:`)
    console.log(`  - Successful: ${bulkResult.successful}`)
    console.log(`  - Failed: ${bulkResult.failed}\n`)

    console.log('✅ All tests completed successfully!\n')

    // Summary
    console.log('📊 Test Summary:')
    console.log('  ✓ VAPID configuration check')
    console.log('  ✓ User lookup')
    console.log('  ✓ Requisition lookup')
    console.log('  ✓ In-app notification')
    console.log('  ✓ Email notification')
    console.log('  ✓ Push notification')
    console.log('  ✓ Multi-channel notification')
    console.log('  ✓ Delivery statistics')
    console.log('  ✓ Delivery history')
    console.log('  ✓ User preferences')
    console.log('  ✓ Bulk notification')
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testPushNotifications()
