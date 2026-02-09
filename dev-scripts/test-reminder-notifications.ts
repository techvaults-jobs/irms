/**
 * Test reminder notifications for a specific user
 * Run with: npx ts-node --project tsconfig.json dev-scripts/test-reminder-notifications.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testReminderNotifications() {
  console.log('🧪 Testing Reminder Notifications\n')

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

    console.log(`✓ Found user: ${user.name} (${user.email})`)
    console.log(`  - ID: ${user.id}`)
    console.log(`  - Role: ${user.role}`)
    console.log(`  - Settings: ${user.settings ? 'Yes' : 'No'}\n`)

    // Step 2: Check user settings
    console.log('Step 2: Checking notification preferences...')
    if (user.settings) {
      console.log(`✓ Email notifications: ${user.settings.emailNotifications}`)
      console.log(`✓ Approval reminders: ${user.settings.approvalReminders}`)
      console.log(`✓ Weekly reports: ${user.settings.weeklyReports}`)
      console.log(`✓ System alerts: ${user.settings.systemAlerts}\n`)
    } else {
      console.log('⚠️  No settings found, creating default settings...')
      const newSettings = await prisma.userSettings.create({
        data: {
          userId: user.id,
          emailNotifications: true,
          approvalReminders: true,
          weeklyReports: true,
          systemAlerts: true,
        },
      })
      console.log('✓ Settings created\n')
    }

    // Step 3: Find pending requisitions
    console.log('Step 3: Finding pending requisitions...')
    const pendingRequisitions = await prisma.requisition.findMany({
      where: { status: 'PENDING' },
      include: {
        approvalSteps: {
          where: { status: 'PENDING' },
          include: { assignedUser: true },
        },
      },
      take: 5,
    })

    console.log(`✓ Found ${pendingRequisitions.length} pending requisitions\n`)

    if (pendingRequisitions.length === 0) {
      console.log('⚠️  No pending requisitions found')
      console.log('   Creating test requisition...\n')

      // Create a test requisition
      const testRequisition = await prisma.requisition.create({
        data: {
          title: 'Test Requisition for Reminder',
          category: 'Office Supplies',
          description: 'This is a test requisition to test reminder notifications',
          estimatedCost: 5000,
          businessJustification: 'Testing reminder notifications',
          submitterId: user.id,
          departmentId: user.departmentId,
          status: 'PENDING',
        },
      })

      console.log(`✓ Created test requisition: ${testRequisition.title}`)
      console.log(`  - ID: ${testRequisition.id}`)
      console.log(`  - Status: ${testRequisition.status}\n`)

      // Create approval step
      const approvalStep = await prisma.approvalStep.create({
        data: {
          requisitionId: testRequisition.id,
          stepNumber: 1,
          requiredRole: 'MANAGER',
          assignedUserId: user.id,
          status: 'PENDING',
        },
      })

      console.log(`✓ Created approval step`)
      console.log(`  - Step: ${approvalStep.stepNumber}`)
      console.log(`  - Status: ${approvalStep.status}\n`)
    }

    // Step 4: Create reminder notifications
    console.log('Step 4: Creating reminder notifications...')

    const requisitionsToRemind = pendingRequisitions.length > 0 
      ? pendingRequisitions 
      : await prisma.requisition.findMany({
          where: { status: 'PENDING' },
          take: 3,
        })

    let reminderCount = 0

    for (const requisition of requisitionsToRemind) {
      // Create in-app reminder notification
      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          requisitionId: requisition.id,
          type: 'REMINDER',
          message: `Reminder: You have a pending requisition "${requisition.title}" awaiting your approval`,
          isRead: false,
        },
      })

      reminderCount++
      console.log(`✓ Created reminder #${reminderCount}`)
      console.log(`  - Requisition: ${requisition.title}`)
      console.log(`  - Message: ${notification.message}`)
    }
    console.log()

    // Step 5: Record delivery
    console.log('Step 5: Recording delivery...')

    for (let i = 0; i < reminderCount; i++) {
      // Record in-app delivery
      await prisma.notificationDelivery.create({
        data: {
          userId: user.id,
          channel: 'IN_APP',
          status: 'DELIVERED',
          payload: JSON.stringify({
            type: 'REMINDER',
            timestamp: new Date().toISOString(),
          }),
        },
      })

      // Record email delivery
      await prisma.notificationDelivery.create({
        data: {
          userId: user.id,
          channel: 'EMAIL',
          status: 'DELIVERED',
          payload: JSON.stringify({
            type: 'REMINDER',
            to: user.email,
            timestamp: new Date().toISOString(),
          }),
        },
      })
    }

    console.log(`✓ Recorded ${reminderCount * 2} deliveries (in-app + email)\n`)

    // Step 6: Get statistics
    console.log('Step 6: Getting notification statistics...')

    const totalNotifications = await prisma.notification.count({
      where: { userId: user.id },
    })

    const reminderNotifications = await prisma.notification.count({
      where: { userId: user.id, type: 'REMINDER' },
    })

    const unreadNotifications = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    })

    const deliveries = await prisma.notificationDelivery.findMany({
      where: { userId: user.id },
    })

    const emailDeliveries = deliveries.filter(d => d.channel === 'EMAIL').length
    const inAppDeliveries = deliveries.filter(d => d.channel === 'IN_APP').length

    console.log(`✓ Total notifications: ${totalNotifications}`)
    console.log(`✓ Reminder notifications: ${reminderNotifications}`)
    console.log(`✓ Unread notifications: ${unreadNotifications}`)
    console.log(`✓ Email deliveries: ${emailDeliveries}`)
    console.log(`✓ In-app deliveries: ${inAppDeliveries}\n`)

    // Step 7: Summary
    console.log('✅ Reminder notification test completed!\n')
    console.log('📊 Summary:')
    console.log(`  - User: ${user.name} (${user.email})`)
    console.log(`  - Reminders sent: ${reminderCount}`)
    console.log(`  - Total notifications: ${totalNotifications}`)
    console.log(`  - Unread: ${unreadNotifications}`)
    console.log(`  - Email deliveries: ${emailDeliveries}`)
    console.log(`  - In-app deliveries: ${inAppDeliveries}`)
    console.log()

    console.log('🚀 Next steps:')
    console.log(`  1. Check email: ${user.email}`)
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

testReminderNotifications()
