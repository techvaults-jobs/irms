/**
 * Production User Seeding Script
 * Seeds real company users with their roles to the production database
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

async function main() {
  console.log('🔧 Starting production user seeding...')

  try {
    // Check if users already exist
    const existingAdminCount = await prisma.user.count({
      where: { role: 'ADMIN' }
    })

    if (existingAdminCount > 0) {
      console.log('⚠️  Admin users already exist. Skipping seeding.')
      console.log('💡 To reseed, delete existing users first.')
      return
    }

    // Create default department if it doesn't exist
    console.log('📁 Creating default department...')
    const department = await prisma.department.upsert({
      where: { name: 'General' },
      update: {},
      create: {
        name: 'General',
      },
    })
    console.log(`✅ Department created: ${department.name}`)

    // Hash passwords
    console.log('🔐 Hashing passwords...')
    const adminPassword = await hashPassword('TechVaults@2024!')
    const staffPassword = await hashPassword('Staff@2024!')

    // Create Admin User - Adams Shittu
    console.log('👤 Creating admin user: Adams Shittu...')
    const adminUser = await prisma.user.create({
      data: {
        email: 'techvaults@gmail.com',
        name: 'Adams Shittu',
        password: adminPassword,
        role: 'ADMIN',
        departmentId: department.id,
        isActive: true,
      },
    })
    console.log(`✅ Admin user created: ${adminUser.email}`)

    // Create Staff User - Ibrahim Bello
    console.log('👤 Creating staff user: Ibrahim Bello...')
    const staffUser = await prisma.user.create({
      data: {
        email: 'belloibrahv@gmail.com',
        name: 'Ibrahim Bello',
        password: staffPassword,
        role: 'STAFF',
        departmentId: department.id,
        isActive: true,
      },
    })
    console.log(`✅ Staff user created: ${staffUser.email}`)

    // Create audit trail entries (optional - skip for now)
    console.log('📊 Skipping audit trail entries for now...')

    console.log('\n✨ Production user seeding completed successfully!')
    console.log('\n📋 Created Users:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n🔐 Admin Account:')
    console.log(`   Email: ${adminUser.email}`)
    console.log(`   Name: ${adminUser.name}`)
    console.log(`   Role: ${adminUser.role}`)
    console.log(`   Password: TechVaults@2024!`)
    console.log('\n👤 Staff Account:')
    console.log(`   Email: ${staffUser.email}`)
    console.log(`   Name: ${staffUser.name}`)
    console.log(`   Role: ${staffUser.role}`)
    console.log(`   Password: Staff@2024!`)
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n✅ Users are ready to use in production!')
    console.log('💡 Keep these credentials secure and share only with authorized users.\n')
  } catch (error) {
    console.error('❌ Error seeding production users:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
