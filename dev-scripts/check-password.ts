import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@techvaults.com' }
  })
  
  if (user) {
    console.log('✅ User found:', user.email)
    console.log('✅ Password hash exists:', user.password ? 'YES' : 'NO')
    console.log('✅ Password hash length:', user.password?.length)
    console.log('✅ Password is bcrypt hash:', user.password?.startsWith('$2a') || user.password?.startsWith('$2b') ? 'YES' : 'NO')
    console.log('\n✅ All 8 users:')
    const allUsers = await prisma.user.findMany()
    allUsers.forEach(u => {
      console.log(`   - ${u.email}: ${u.password?.substring(0, 20)}...`)
    })
  } else {
    console.log('❌ User not found')
  }
  
  await prisma.$disconnect()
}

main()
