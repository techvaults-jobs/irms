/**
 * Test Login Flow
 * Simulates the login process to debug authentication issues
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const prisma = new PrismaClient()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

async function testLoginFlow() {
  console.log('\n🔐 Testing Login Flow\n')

  // Test credentials
  const credentials = {
    email: 'admin@techvaults.com',
    password: 'admin@123',
  }

  console.log('1️⃣  Validating credentials schema...')
  const validatedCredentials = loginSchema.safeParse(credentials)

  if (!validatedCredentials.success) {
    console.log('❌ Validation failed:', validatedCredentials.error)
    return
  }
  console.log('✅ Validation passed')

  console.log('\n2️⃣  Looking up user in database...')
  const user = await prisma.user.findUnique({
    where: { email: validatedCredentials.data.email },
  })

  if (!user) {
    console.log('❌ User not found')
    return
  }
  console.log('✅ User found:', user.email)

  console.log('\n3️⃣  Checking if user is active...')
  if (!user.isActive) {
    console.log('❌ User is not active')
    return
  }
  console.log('✅ User is active')

  console.log('\n4️⃣  Verifying password...')
  console.log('   Password hash:', user.password.substring(0, 30) + '...')
  const isPasswordValid = await bcrypt.compare(
    validatedCredentials.data.password,
    user.password
  )

  if (!isPasswordValid) {
    console.log('❌ Password verification failed')
    return
  }
  console.log('✅ Password verified')

  console.log('\n5️⃣  Creating user object for session...')
  const sessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    departmentId: user.departmentId,
  }
  console.log('✅ Session user created:', sessionUser)

  console.log('\n✨ Login flow test completed successfully!\n')

  await prisma.$disconnect()
}

testLoginFlow().catch(console.error)
