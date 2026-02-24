import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  try {
    console.log('Starting database cleanup (keeping users)...');

    // Delete in order of foreign key dependencies
    console.log('Deleting NotificationDelivery records...');
    await prisma.notificationDelivery.deleteMany({});

    console.log('Deleting Notification records...');
    await prisma.notification.deleteMany({});

    console.log('Deleting PushSubscription records...');
    await prisma.pushSubscription.deleteMany({});

    console.log('Deleting UserSettings records...');
    await prisma.userSettings.deleteMany({});

    console.log('Deleting Attachment records...');
    await prisma.attachment.deleteMany({});

    console.log('Deleting AuditTrail records...');
    await prisma.auditTrail.deleteMany({});

    console.log('Deleting ApprovalStep records...');
    await prisma.approvalStep.deleteMany({});

    console.log('Deleting Requisition records...');
    await prisma.requisition.deleteMany({});

    console.log('Deleting ApprovalRule records...');
    await prisma.approvalRule.deleteMany({});

    // Keep at least one default department for users
    console.log('Clearing departments except default...');
    const defaultDept = await prisma.department.findFirst({
      where: { name: 'Default' }
    });
    
    if (defaultDept) {
      await prisma.department.deleteMany({
        where: { id: { not: defaultDept.id } }
      });
      console.log('Kept default department for users');
    } else {
      // Create a default department if it doesn't exist
      const created = await prisma.department.create({
        data: { name: 'Default' }
      });
      console.log('Created default department');
      
      // Update all users to use this department
      await prisma.user.updateMany({
        data: { departmentId: created.id }
      });
      
      // Delete all other departments
      await prisma.department.deleteMany({
        where: { id: { not: created.id } }
      });
    }

    console.log('✓ Database cleared successfully (users preserved)');
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase();
