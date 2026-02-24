import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testAuth() {
  try {
    console.log('Testing authentication flow...\n');

    // Get the admin user
    const user = await prisma.user.findUnique({
      where: { email: 'techvaults@gmail.com' },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        isActive: true,
        departmentId: true,
      },
    });

    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }

    console.log('✓ User found:', {
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    });

    // Test password verification
    const testPassword = 'Admin@123';
    const isValid = await bcrypt.compare(testPassword, user.password);

    if (isValid) {
      console.log('✓ Password verification successful');
    } else {
      console.error('❌ Password verification failed');
      console.log('  Expected password: Admin@123');
      console.log('  Stored hash:', user.password);
    }

    // Check department
    const dept = await prisma.department.findUnique({
      where: { id: user.departmentId },
    });

    if (dept) {
      console.log('✓ Department found:', dept.name);
    } else {
      console.error('❌ Department not found');
    }

    console.log('\n✓ Auth test completed successfully');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testAuth();
