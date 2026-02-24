import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Check existing users
    const existingUsers = await prisma.user.findMany();
    console.log('Existing users:', existingUsers.length);
    existingUsers.forEach(u => console.log(`  - ${u.email} (${u.role})`));

    // Get or create default department
    let department = await prisma.department.findFirst({
      where: { name: 'Default' }
    });

    if (!department) {
      department = await prisma.department.create({
        data: { name: 'Default' }
      });
      console.log('Created default department');
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    const adminUser = await prisma.user.create({
      data: {
        email: 'techvaults@gmail.com',
        name: 'Admin User',
        password: hashedPassword,
        role: 'ADMIN',
        departmentId: department.id,
        isActive: true
      }
    });

    console.log('✓ Admin user created successfully');
    console.log(`  Email: ${adminUser.email}`);
    console.log(`  Role: ${adminUser.role}`);
    console.log(`  Password: Admin@123`);
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.log('User already exists. Updating password...');
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      await prisma.user.update({
        where: { email: 'techvaults@gmail.com' },
        data: { password: hashedPassword, role: 'ADMIN' }
      });
      console.log('✓ Admin user updated');
      console.log(`  Password: Admin@123`);
    } else {
      console.error('Error:', error);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
