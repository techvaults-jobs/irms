/**
 * In-memory caching utility for reports and frequently accessed data
 * Uses TTL (Time To Live) for automatic cache invalidation
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Start cleanup interval to remove expired entries
    this.startCleanup()
  }

  /**
   * Set a value in cache with TTL in milliseconds
   */
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    })
  }

  /**
   * Get a value from cache if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    const isExpired = Date.now() - entry.timestamp > entry.ttl
    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Check if a key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    const isExpired = Date.now() - entry.timestamp > entry.ttl
    if (isExpired) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Delete a specific key from cache
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      let cleaned = 0

      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key)
          cleaned++
        }
      }

      if (cleaned > 0) {
        console.log(`Cache cleanup: removed ${cleaned} expired entries`)
      }
    }, 60 * 1000)
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

// Export singleton instance
export const cacheManager = new CacheManager()

/**
 * Cache key generators for different report types
 */
export const cacheKeys = {
  monthlySpendings: (startDate?: string, endDate?: string) =>
    `report:monthly-spending:${startDate || 'all'}:${endDate || 'all'}`,
  categorySpendings: (startDate?: string, endDate?: string) =>
    `report:category-spending:${startDate || 'all'}:${endDate || 'all'}`,
  departmentSpendings: (startDate?: string, endDate?: string, deptId?: string) =>
    `report:department-spending:${startDate || 'all'}:${endDate || 'all'}:${deptId || 'all'}`,
  approvalStatus: (startDate?: string, endDate?: string) =>
    `report:approval-status:${startDate || 'all'}:${endDate || 'all'}`,
  pendingLiabilities: () => `report:pending-liabilities`,
  yearlySummary: (year?: number) => `report:yearly-summary:${year || 'current'}`,
  totalSpending: (startDate?: string, endDate?: string) =>
    `report:total-spending:${startDate || 'all'}:${endDate || 'all'}`,
}

/**
 * Cache TTL constants (in milliseconds)
 */
export const cacheTTL = {
  SHORT: 2 * 60 * 1000, // 2 minutes
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 15 * 60 * 1000, // 15 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
}
