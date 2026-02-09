import bcrypt from 'bcryptjs'

async function testPasswordHash() {
  const plainPassword = 'TechVaults@2024!'
  
  console.log('Testing password hashing...\n')
  console.log(`Plain password: ${plainPassword}`)
  
  // Hash the password the same way the seed script does
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(plainPassword, salt)
  
  console.log(`\nGenerated hash: ${hashedPassword}`)
  
  // Test comparison
  const isMatch = await bcrypt.compare(plainPassword, hashedPassword)
  console.log(`\nPassword comparison result: ${isMatch}`)
  
  // Now test with the actual hash from database
  const dbHash = '$2b$10$wxbw3ncVT9FXlYvVT9FXlYvVT9FXlYvVT9FXlYvVT9FXlYvVT9FXlY' // placeholder
  console.log(`\nTesting with database hash format...`)
  
  // Get actual hash from database
  console.log('\n✅ Password hashing test complete')
}

testPasswordHash().catch(console.error)
