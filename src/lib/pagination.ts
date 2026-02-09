/**
 * Pagination utilities for server-side pagination
 * Supports both offset-based and cursor-based pagination
 */

export interface PaginationParams {
  skip?: number
  take?: number
  cursor?: string
}

export interface PaginationResult<T> {
  data: T[]
  pagination: {
    skip: number
    take: number
    total: number
    hasMore: boolean
    pageCount: number
  }
}

export interface CursorPaginationResult<T> {
  data: T[]
  pagination: {
    cursor?: string
    take: number
    hasMore: boolean
  }
}

/**
 * Validate and normalize pagination parameters
 */
export function validatePaginationParams(
  skip?: string | number | null,
  take?: string | number | null,
  maxTake: number = 100
): { skip: number; take: number } {
  let skipNum = 0
  let takeNum = 20

  if (skip !== undefined && skip !== null) {
    skipNum = Math.max(0, parseInt(String(skip), 10) || 0)
  }

  if (take !== undefined && take !== null) {
    takeNum = Math.min(maxTake, Math.max(1, parseInt(String(take), 10) || 20))
  }

  return { skip: skipNum, take: takeNum }
}

/**
 * Format pagination result with metadata
 */
export function formatPaginationResult<T>(
  data: T[],
  skip: number,
  take: number,
  total: number
): PaginationResult<T> {
  return {
    data,
    pagination: {
      skip,
      take,
      total,
      hasMore: skip + take < total,
      pageCount: Math.ceil(total / take),
    },
  }
}

/**
 * Format cursor-based pagination result
 */
export function formatCursorPaginationResult<T>(
  data: T[],
  take: number,
  hasMore: boolean,
  nextCursor?: string
): CursorPaginationResult<T> {
  return {
    data,
    pagination: {
      cursor: nextCursor,
      take,
      hasMore,
    },
  }
}

/**
 * Generate cursor from item ID for cursor-based pagination
 */
export function generateCursor(id: string): string {
  return Buffer.from(id).toString('base64')
}

/**
 * Decode cursor to get item ID
 */
export function decodeCursor(cursor: string): string {
  try {
    return Buffer.from(cursor, 'base64').toString('utf-8')
  } catch {
    return ''
  }
}
