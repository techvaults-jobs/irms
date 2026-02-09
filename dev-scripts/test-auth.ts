import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@techvaults.com' }
  })
  
  if (!user) {
    console.log('❌ User not found')
    return
  }
  
  console.log('✅ User found:', user.email)
  console.log('✅ User active:', user.isActive)
  console.log('✅ Password hash exists:', !!user.password)
  console.log('✅ Password hash:', user.password?.substring(0, 30) + '...')
  
  // Test password verification
  const testPassword = 'admin@123'
  const isValid = await bcrypt.compare(testPassword, user.password)
  console.log(`✅ Password "${testPassword}" is valid:`, isValid)
  
  // Test wrong password
  const wrongPassword = 'wrong@123'
  const isWrong = await bcrypt.compare(wrongPassword, user.password)
  console.log(`✅ Password "${wrongPassword}" is valid:`, isWrong)
  
  await prisma.$disconnect()
}

main()
