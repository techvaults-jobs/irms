import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function changePassword() {
  try {
    const email = 'belloibrahv@gmail.com';
    const newPassword = 'Password@123';

    console.log(`Changing password for ${email}...`);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    console.log('✓ Password updated successfully');
    console.log(`  Email: ${email}`);
    console.log(`  New Password: ${newPassword}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

changePassword();
