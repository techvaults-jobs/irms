/**
 * Simple test script for push notifications
 * Works with ts-node without path aliases
 * Run with: npx ts-node --project tsconfig.json dev-scripts/test-notifications-simple.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testNotifications() {
  console.log('🧪 Testing Push Notifications\n')

  try {
    // Test 1: Database connection
    console.log('Test 1: Database connection...')
    const result = await prisma.$queryRaw`SELECT 1`
    console.log('✓ Database connected\n')

    // Test 2: Check tables exist
    console.log('Test 2: Checking tables...')
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('Notification', 'PushSubscription', 'NotificationDelivery', 'UserSettings')
    `
    console.log(`✓ Found ${(tables as any[]).length} notification tables\n`)

    // Test 3: Get user count
    console.log('Test 3: Checking users...')
    const userCount = await prisma.user.count()
    console.log(`✓ Found ${userCount} users\n`)

    // Test 4: Get notification count
    console.log('Test 4: Checking notifications...')
    const notificationCount = await prisma.notification.count()
    console.log(`✓ Found ${notificationCount} notifications\n`)

    // Test 5: Get push subscription count
    console.log('Test 5: Checking push subscriptions...')
    const subscriptionCount = await prisma.pushSubscription.count()
    console.log(`✓ Found ${subscriptionCount} push subscriptions\n`)

    // Test 6: Get delivery tracking count
    console.log('Test 6: Checking delivery tracking...')
    const deliveryCount = await prisma.notificationDelivery.count()
    console.log(`✓ Found ${deliveryCount} delivery records\n`)

    // Test 7: Get user settings count
    console.log('Test 7: Checking user settings...')
    const settingsCount = await prisma.userSettings.count()
    console.log(`✓ Found ${settingsCount} user settings\n`)

    // Test 8: Sample data
    console.log('Test 8: Sample data...')
    const user = await prisma.user.findFirst({
      include: { settings: true },
    })

    if (user) {
      console.log(`✓ Sample user: ${user.email}`)
      console.log(`  - Name: ${user.name}`)
      console.log(`  - Role: ${user.role}`)
      console.log(`  - Settings: ${user.settings ? 'Yes' : 'No'}\n`)
    } else {
      console.log('⚠️  No users found\n')
    }

    // Summary
    console.log('✅ All tests passed!\n')
    console.log('📊 Database Summary:')
    console.log(`  - Users: ${userCount}`)
    console.log(`  - Notifications: ${notificationCount}`)
    console.log(`  - Push Subscriptions: ${subscriptionCount}`)
    console.log(`  - Delivery Records: ${deliveryCount}`)
    console.log(`  - User Settings: ${settingsCount}`)
    console.log()

    console.log('🚀 Next steps:')
    console.log('  1. Start app: npm run dev')
    console.log('  2. Go to http://localhost:3000')
    console.log('  3. Log in')
    console.log('  4. Go to Settings → Notification Tester')
    console.log('  5. Click "Send Test Notification"')
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testNotifications()
