/**
 * Test Helpers
 * Utility functions for test setup and teardown
 */

import bcrypt from 'bcryptjs'

/**
 * Hash a password for testing
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

/**
 * Generate a test password
 */
export function generateTestPassword(): string {
  return `Test${Date.now()}@123`
}
