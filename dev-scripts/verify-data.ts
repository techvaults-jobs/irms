import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyData() {
  try {
    const users = await prisma.user.count();
    const requisitions = await prisma.requisition.count();
    const approvalSteps = await prisma.approvalStep.count();
    const auditTrails = await prisma.auditTrail.count();
    const attachments = await prisma.attachment.count();
    const notifications = await prisma.notification.count();
    const departments = await prisma.department.count();
    const approvalRules = await prisma.approvalRule.count();
    const userSettings = await prisma.userSettings.count();
    const pushSubscriptions = await prisma.pushSubscription.count();
    const notificationDeliveries = await prisma.notificationDelivery.count();

    console.log('Current database state:');
    console.log(`Users: ${users}`);
    console.log(`Requisitions: ${requisitions}`);
    console.log(`ApprovalSteps: ${approvalSteps}`);
    console.log(`AuditTrails: ${auditTrails}`);
    console.log(`Attachments: ${attachments}`);
    console.log(`Notifications: ${notifications}`);
    console.log(`Departments: ${departments}`);
    console.log(`ApprovalRules: ${approvalRules}`);
    console.log(`UserSettings: ${userSettings}`);
    console.log(`PushSubscriptions: ${pushSubscriptions}`);
    console.log(`NotificationDeliveries: ${notificationDeliveries}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyData();
