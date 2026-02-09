import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      password: true
    }
  })
  
  console.log('Users in database:')
  users.forEach(user => {
    console.log(`\nEmail: ${user.email}`)
    console.log(`Name: ${user.name}`)
    console.log(`Role: ${user.role}`)
    console.log(`Active: ${user.isActive}`)
    console.log(`Password Hash: ${user.password.substring(0, 20)}...`)
  })
  
  await prisma.$disconnect()
}

main().catch(console.error)
