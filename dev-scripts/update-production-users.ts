/**
 * Update Production Users Script
 * Updates existing users with real company credentials
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

async function main() {
  console.log('🔧 Starting production user update...')

  try {
    // Hash passwords
    console.log('🔐 Hashing passwords...')
    const adminPassword = await hashPassword('TechVaults@2024!')
    const staffPassword = await hashPassword('Staff@2024!')

    // Get or create department
    let department = await prisma.department.findFirst({
      where: { name: 'General' }
    })

    if (!department) {
      console.log('📁 Creating default department...')
      department = await prisma.department.create({
        data: { name: 'General' }
      })
    }

    console.log(`✅ Using department: ${department.name} (ID: ${department.id})`)

    // Update or create Admin User - Adams Shittu
    console.log('👤 Updating admin user: Adams Shittu...')
    const adminUser = await prisma.user.upsert({
      where: { email: 'techvaults@gmail.com' },
      update: {
        name: 'Adams Shittu',
        password: adminPassword,
        role: 'ADMIN',
        isActive: true,
      },
      create: {
        email: 'techvaults@gmail.com',
        name: 'Adams Shittu',
        password: adminPassword,
        role: 'ADMIN',
        departmentId: department.id,
        isActive: true,
      },
    })
    console.log(`✅ Admin user updated: ${adminUser.email}`)

    // Update or create Staff User - Ibrahim Bello
    console.log('👤 Updating staff user: Ibrahim Bello...')
    const staffUser = await prisma.user.upsert({
      where: { email: 'belloibrahv@gmail.com' },
      update: {
        name: 'Ibrahim Bello',
        password: staffPassword,
        role: 'STAFF',
        isActive: true,
      },
      create: {
        email: 'belloibrahv@gmail.com',
        name: 'Ibrahim Bello',
        password: staffPassword,
        role: 'STAFF',
        departmentId: department.id,
        isActive: true,
      },
    })
    console.log(`✅ Staff user updated: ${staffUser.email}`)

    // Verify users
    console.log('\n📋 Verifying users in database...')
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    })

    console.log(`\n✅ Total users in database: ${allUsers.length}`)
    console.log('\n📊 Users:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`)
      console.log(`   Role: ${user.role} | Active: ${user.isActive}`)
    })
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    console.log('\n✨ Production users updated successfully!')
    console.log('\n🔐 Login Credentials:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n👨‍💼 Admin Account:')
    console.log(`   Email: techvaults@gmail.com`)
    console.log(`   Password: TechVaults@2024!`)
    console.log(`   Role: ADMIN`)
    console.log('\n👤 Staff Account:')
    console.log(`   Email: belloibrahv@gmail.com`)
    console.log(`   Password: Staff@2024!`)
    console.log(`   Role: STAFF`)
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n✅ Users are ready to use in production!')
    console.log('💡 Keep these credentials secure and share only with authorized users.\n')
  } catch (error) {
    console.error('❌ Error updating production users:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
