import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function testAuthFlow() {
  console.log('🧪 Testing authentication flow...\n')

  try {
    // 1. Check if users exist
    console.log('1️⃣  Checking if users exist in database...')
    const users = await prisma.user.findMany({
      select: { email: true, name: true, role: true, isActive: true }
    })
    
    if (users.length === 0) {
      console.log('❌ No users found in database!')
      return
    }
    
    console.log(`✅ Found ${users.length} users:`)
    users.forEach(u => console.log(`   - ${u.email} (${u.role})`))

    // 2. Test password verification
    console.log('\n2️⃣  Testing password verification...')
    const adminUser = await prisma.user.findUnique({
      where: { email: 'techvaults@gmail.com' },
      select: { email: true, password: true }
    })

    if (!adminUser) {
      console.log('❌ Admin user not found!')
      return
    }

    console.log(`✅ Admin user found: ${adminUser.email}`)
    console.log(`   Password hash: ${adminUser.password.substring(0, 30)}...`)

    // 3. Test bcrypt comparison
    console.log('\n3️⃣  Testing bcrypt password comparison...')
    const testPassword = 'TechVaults@2024!'
    const isMatch = await bcrypt.compare(testPassword, adminUser.password)
    
    console.log(`   Testing password: ${testPassword}`)
    console.log(`   Password matches: ${isMatch}`)

    if (!isMatch) {
      console.log('❌ Password does not match!')
      console.log('   This means the password in the database is different')
      return
    }

    console.log('✅ Password verification successful!')

    // 4. Summary
    console.log('\n✨ Authentication flow test complete!')
    console.log('\n📋 Summary:')
    console.log('   ✅ Users exist in database')
    console.log('   ✅ Admin user found')
    console.log('   ✅ Password verification works')
    console.log('\n💡 If login still fails, the issue is likely:')
    console.log('   - NEXTAUTH_SECRET not set in Vercel')
    console.log('   - Database connection issue in Vercel')
    console.log('   - NextAuth configuration issue')

  } catch (error) {
    console.error('❌ Error during test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAuthFlow()
