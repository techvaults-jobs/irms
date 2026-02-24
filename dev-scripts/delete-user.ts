import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteUser() {
  try {
    const email = 'belloibrahv@gmail.com';

    console.log(`Deleting user ${email}...`);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    await prisma.user.delete({
      where: { email },
    });

    console.log('✓ User deleted successfully');
    console.log(`  Email: ${email}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteUser();
