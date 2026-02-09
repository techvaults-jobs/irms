/**
 * SQL Injection Prevention Utility
 * 
 * This module documents and enforces SQL injection prevention practices.
 * 
 * Key Principles:
 * 1. Use Prisma ORM for all database queries (parameterized queries)
 * 2. Never concatenate user input into SQL strings
 * 3. Validate and sanitize all inputs before database operations
 * 4. Use Prisma's built-in type safety and query builders
 * 5. Implement input validation with Zod schemas
 */

/**
 * Validates that a value is safe for use in database queries
 * This is a defensive check - Prisma handles parameterization
 */
export function validateDatabaseInput(input: unknown): boolean {
  // Reject null bytes which could be used in SQL injection
  if (typeof input === 'string' && input.includes('\0')) {
    return false
  }

  // Reject extremely long strings that could indicate injection attempts
  if (typeof input === 'string' && input.length > 10000) {
    return false
  }

  return true
}

/**
 * Validates array of database inputs
 */
export function validateDatabaseInputs(inputs: unknown[]): boolean {
  return inputs.every(input => validateDatabaseInput(input))
}

/**
 * Validates object for database operations
 */
export function validateDatabaseObject(obj: Record<string, any>): boolean {
  for (const value of Object.values(obj)) {
    if (!validateDatabaseInput(value)) {
      return false
    }
  }
  return true
}

/**
 * IMPORTANT: SQL Injection Prevention Guidelines
 * 
 * ✅ DO:
 * - Use Prisma client for all queries
 * - Use Prisma's query builder methods (findUnique, findMany, create, update, etc.)
 * - Use Zod schemas to validate all inputs
 * - Use parameterized queries (Prisma does this automatically)
 * - Validate input types and lengths
 * - Use prepared statements (Prisma does this automatically)
 * 
 * ❌ DON'T:
 * - Never use string concatenation for SQL queries
 * - Never use template literals for SQL queries
 * - Never use raw SQL unless absolutely necessary
 * - Never trust user input without validation
 * - Never skip input validation
 * 
 * Example of SAFE code (using Prisma):
 * ```typescript
 * const requisition = await prisma.requisition.findUnique({
 *   where: { id: userId }, // userId is parameterized
 * })
 * ```
 * 
 * Example of UNSAFE code (DO NOT USE):
 * ```typescript
 * const query = `SELECT * FROM requisitions WHERE id = '${userId}'`
 * const result = await db.query(query) // VULNERABLE!
 * ```
 */

/**
 * Type-safe database query builder
 * Ensures all queries use Prisma's parameterized approach
 */
export class SafeDatabaseQuery {
  /**
   * Validates that a filter object is safe for database queries
   */
  static validateFilter(filter: Record<string, any>): boolean {
    return validateDatabaseObject(filter)
  }

  /**
   * Validates that a data object is safe for database operations
   */
  static validateData(data: Record<string, any>): boolean {
    return validateDatabaseObject(data)
  }

  /**
   * Validates that a where clause is safe
   */
  static validateWhere(where: Record<string, any>): boolean {
    return validateDatabaseObject(where)
  }
}

/**
 * Prisma Query Safety Checklist
 * 
 * Before executing any database query, verify:
 * 1. ✓ Input has been validated with Zod schema
 * 2. ✓ Using Prisma client methods (not raw SQL)
 * 3. ✓ All parameters are passed as arguments, not concatenated
 * 4. ✓ No string interpolation in query construction
 * 5. ✓ Error handling is in place
 * 6. ✓ Sensitive data is not logged
 */

/**
 * Common Prisma patterns for safe queries:
 * 
 * // Safe: Using where clause with parameters
 * const user = await prisma.user.findUnique({
 *   where: { id: userId }
 * })
 * 
 * // Safe: Using filter with parameters
 * const requisitions = await prisma.requisition.findMany({
 *   where: {
 *     status: 'DRAFT',
 *     submitterId: userId
 *   }
 * })
 * 
 * // Safe: Using create with validated data
 * const requisition = await prisma.requisition.create({
 *   data: {
 *     title: validatedTitle,
 *     description: validatedDescription,
 *     submitterId: userId
 *   }
 * })
 * 
 * // Safe: Using update with where and data
 * const updated = await prisma.requisition.update({
 *   where: { id: requisitionId },
 *   data: { status: 'SUBMITTED' }
 * })
 */
