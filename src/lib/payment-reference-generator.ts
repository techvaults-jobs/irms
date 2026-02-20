/**
 * Payment Reference Generator
 * Generates unique payment reference codes for each payment
 * Format: PAY-YYYYMMDD-HHMMSS-XXXX (e.g., PAY-20240220-143052-A1B2)
 */

export class PaymentReferenceGenerator {
  /**
   * Generates a unique payment reference code
   * Format: PAY-YYYYMMDD-HHMMSS-XXXX
   * Where XXXX is a random alphanumeric code
   */
  static generate(): string {
    const now = new Date()
    
    // Format: YYYYMMDD
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const dateStr = `${year}${month}${day}`
    
    // Format: HHMMSS
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const timeStr = `${hours}${minutes}${seconds}`
    
    // Generate random alphanumeric code (4 characters)
    const randomCode = this.generateRandomCode(4)
    
    return `PAY-${dateStr}-${timeStr}-${randomCode}`
  }

  /**
   * Generates a random alphanumeric code
   * @param length Length of the code
   */
  private static generateRandomCode(length: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excludes ambiguous characters
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  /**
   * Validates a payment reference format
   */
  static isValid(reference: string): boolean {
    const pattern = /^PAY-\d{8}-\d{6}-[A-Z0-9]{4}$/
    return pattern.test(reference)
  }
}
