import { prisma } from '@/lib/prisma'
import { cacheManager, cacheKeys, cacheTTL } from '@/lib/cache'
import { Decimal } from '@prisma/client/runtime/library'

export interface MonthlySpendings {
  month: string
  estimatedTotal: Decimal
  approvedTotal: Decimal
  actualTotal: Decimal
  count: number
}

export interface CategorySpending {
  category: string
  estimatedTotal: Decimal
  approvedTotal: Decimal
  actualTotal: Decimal
  count: number
}

export interface DepartmentSpending {
  departmentId: string
  departmentName: string
  estimatedTotal: Decimal
  approvedTotal: Decimal
  actualTotal: Decimal
  count: number
}

export interface ApprovalStatusReport {
  status: string
  count: number
  percentage: number
}

export interface PendingLiability {
  requisitionId: string
  title: string
  departmentId: string
  departmentName: string
  approvedCost: Decimal
  submittedDate: Date
}

export interface YearlySummary {
  year: number
  estimatedTotal: Decimal
  approvedTotal: Decimal
  actualTotal: Decimal
  monthlyBreakdown: MonthlySpendings[]
  categoryBreakdown: CategorySpending[]
  statusBreakdown: ApprovalStatusReport[]
}

export class ReportingService {
  /**
   * Generate monthly spending report with caching
   * Requirement 8.2: Monthly Spending report
   */
  static async generateMonthlySpendings(
    startDate?: Date,
    endDate?: Date
  ): Promise<MonthlySpendings[]> {
    const cacheKey = cacheKeys.monthlySpendings(
      startDate?.toISOString(),
      endDate?.toISOString()
    )

    // Check cache first
    const cached = cacheManager.get<MonthlySpendings[]>(cacheKey)
    if (cached) {
      return cached
    }

    const start = startDate || new Date(new Date().getFullYear(), 0, 1)
    const end = endDate || new Date()

    const requisitions = await prisma.requisition.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        estimatedCost: true,
        approvedCost: true,
        actualCostPaid: true,
        createdAt: true,
      },
    })

    // Group by month
    const monthlyMap = new Map<string, {
      estimatedTotal: Decimal
      approvedTotal: Decimal
      actualTotal: Decimal
      count: number
    }>()

    requisitions.forEach(req => {
      const monthKey = req.createdAt.toISOString().substring(0, 7) // YYYY-MM
      const existing = monthlyMap.get(monthKey) || {
        estimatedTotal: new Decimal(0),
        approvedTotal: new Decimal(0),
        actualTotal: new Decimal(0),
        count: 0,
      }

      monthlyMap.set(monthKey, {
        estimatedTotal: existing.estimatedTotal.plus(req.estimatedCost || 0),
        approvedTotal: existing.approvedTotal.plus(req.approvedCost || 0),
        actualTotal: existing.actualTotal.plus(req.actualCostPaid || 0),
        count: existing.count + 1,
      })
    })

    // Convert to array and sort
    const result = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        ...data,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // Cache the result
    cacheManager.set(cacheKey, result, cacheTTL.LONG)

    return result
  }

  /**
   * Generate category spending report with caching
   * Requirement 8.3: Category Spending report
   */
  static async generateCategorySpendings(
    startDate?: Date,
    endDate?: Date
  ): Promise<CategorySpending[]> {
    const cacheKey = cacheKeys.categorySpendings(
      startDate?.toISOString(),
      endDate?.toISOString()
    )

    // Check cache first
    const cached = cacheManager.get<CategorySpending[]>(cacheKey)
    if (cached) {
      return cached
    }

    const start = startDate || new Date(new Date().getFullYear(), 0, 1)
    const end = endDate || new Date()

    const requisitions = await prisma.requisition.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        category: true,
        estimatedCost: true,
        approvedCost: true,
        actualCostPaid: true,
      },
    })

    // Group by category
    const categoryMap = new Map<string, {
      estimatedTotal: Decimal
      approvedTotal: Decimal
      actualTotal: Decimal
      count: number
    }>()

    requisitions.forEach(req => {
      const existing = categoryMap.get(req.category) || {
        estimatedTotal: new Decimal(0),
        approvedTotal: new Decimal(0),
        actualTotal: new Decimal(0),
        count: 0,
      }

      categoryMap.set(req.category, {
        estimatedTotal: existing.estimatedTotal.plus(req.estimatedCost || 0),
        approvedTotal: existing.approvedTotal.plus(req.approvedCost || 0),
        actualTotal: existing.actualTotal.plus(req.actualCostPaid || 0),
        count: existing.count + 1,
      })
    })

    // Convert to array and sort by category name
    const result = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        ...data,
      }))
      .sort((a, b) => a.category.localeCompare(b.category))

    // Cache the result
    cacheManager.set(cacheKey, result, cacheTTL.LONG)

    return result
  }

  /**
   * Generate department spending report with caching
   * Requirement 8.4: Department Spending report
   */
  static async generateDepartmentSpendings(
    startDate?: Date,
    endDate?: Date,
    departmentId?: string
  ): Promise<DepartmentSpending[]> {
    const cacheKey = cacheKeys.departmentSpendings(
      startDate?.toISOString(),
      endDate?.toISOString(),
      departmentId
    )

    // Check cache first
    const cached = cacheManager.get<DepartmentSpending[]>(cacheKey)
    if (cached) {
      return cached
    }

    const start = startDate || new Date(new Date().getFullYear(), 0, 1)
    const end = endDate || new Date()

    const requisitions = await prisma.requisition.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        ...(departmentId && { departmentId }),
      },
      select: {
        departmentId: true,
        department: {
          select: {
            name: true,
          },
        },
        estimatedCost: true,
        approvedCost: true,
        actualCostPaid: true,
      },
    })

    // Group by department
    const departmentMap = new Map<string, {
      departmentName: string
      estimatedTotal: Decimal
      approvedTotal: Decimal
      actualTotal: Decimal
      count: number
    }>()

    requisitions.forEach(req => {
      const existing = departmentMap.get(req.departmentId) || {
        departmentName: req.department.name,
        estimatedTotal: new Decimal(0),
        approvedTotal: new Decimal(0),
        actualTotal: new Decimal(0),
        count: 0,
      }

      departmentMap.set(req.departmentId, {
        departmentName: req.department.name,
        estimatedTotal: existing.estimatedTotal.plus(req.estimatedCost || 0),
        approvedTotal: existing.approvedTotal.plus(req.approvedCost || 0),
        actualTotal: existing.actualTotal.plus(req.actualCostPaid || 0),
        count: existing.count + 1,
      })
    })

    // Convert to array and sort by department name
    const result = Array.from(departmentMap.entries())
      .map(([deptId, data]) => ({
        departmentId: deptId,
        ...data,
      }))
      .sort((a, b) => a.departmentName.localeCompare(b.departmentName))

    // Cache the result
    cacheManager.set(cacheKey, result, cacheTTL.LONG)

    return result
  }

  /**
   * Generate approval status report with caching
   * Requirement 8.5: Approval Status report
   */
  static async generateApprovalStatusReport(
    startDate?: Date,
    endDate?: Date
  ): Promise<ApprovalStatusReport[]> {
    const cacheKey = cacheKeys.approvalStatus(
      startDate?.toISOString(),
      endDate?.toISOString()
    )

    // Check cache first
    const cached = cacheManager.get<ApprovalStatusReport[]>(cacheKey)
    if (cached) {
      return cached
    }

    const start = startDate || new Date(new Date().getFullYear(), 0, 1)
    const end = endDate || new Date()

    const requisitions = await prisma.requisition.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        status: true,
      },
    })

    // Group by status
    const statusMap = new Map<string, number>()
    requisitions.forEach(req => {
      statusMap.set(req.status, (statusMap.get(req.status) || 0) + 1)
    })

    const total = requisitions.length
    const statuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID', 'CLOSED']

    const result = statuses
      .map(status => ({
        status,
        count: statusMap.get(status) || 0,
        percentage: total > 0 ? ((statusMap.get(status) || 0) / total) * 100 : 0,
      }))
      .filter(item => item.count > 0)

    // Cache the result
    cacheManager.set(cacheKey, result, cacheTTL.LONG)

    return result
  }

  /**
   * Generate pending liabilities report with caching
   * Requirement 8.6: Pending Liabilities report
   */
  static async generatePendingLiabilities(): Promise<PendingLiability[]> {
    const cacheKey = cacheKeys.pendingLiabilities()

    // Check cache first
    const cached = cacheManager.get<PendingLiability[]>(cacheKey)
    if (cached) {
      return cached
    }

    const requisitions = await prisma.requisition.findMany({
      where: {
        status: 'APPROVED',
        actualCostPaid: null,
      },
      select: {
        id: true,
        title: true,
        departmentId: true,
        department: {
          select: {
            name: true,
          },
        },
        approvedCost: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    const result = requisitions.map(req => ({
      requisitionId: req.id,
      title: req.title,
      departmentId: req.departmentId,
      departmentName: req.department.name,
      approvedCost: req.approvedCost || new Decimal(0),
      submittedDate: req.createdAt,
    }))

    // Cache the result
    cacheManager.set(cacheKey, result, cacheTTL.MEDIUM)

    return result
  }

  /**
   * Generate yearly summary report with caching
   * Requirement 8.7: Yearly Summary report
   */
  static async generateYearlySummary(year?: number): Promise<YearlySummary> {
    const targetYear = year || new Date().getFullYear()
    const cacheKey = cacheKeys.yearlySummary(targetYear)

    // Check cache first
    const cached = cacheManager.get<YearlySummary>(cacheKey)
    if (cached) {
      return cached
    }

    const startDate = new Date(targetYear, 0, 1)
    const endDate = new Date(targetYear, 11, 31, 23, 59, 59)

    const [monthly, categories, statuses] = await Promise.all([
      this.generateMonthlySpendings(startDate, endDate),
      this.generateCategorySpendings(startDate, endDate),
      this.generateApprovalStatusReport(startDate, endDate),
    ])

    // Calculate totals
    const estimatedTotal = monthly.reduce((sum, m) => sum.plus(m.estimatedTotal), new Decimal(0))
    const approvedTotal = monthly.reduce((sum, m) => sum.plus(m.approvedTotal), new Decimal(0))
    const actualTotal = monthly.reduce((sum, m) => sum.plus(m.actualTotal), new Decimal(0))

    const result = {
      year: targetYear,
      estimatedTotal,
      approvedTotal,
      actualTotal,
      monthlyBreakdown: monthly,
      categoryBreakdown: categories,
      statusBreakdown: statuses,
    }

    // Cache the result
    cacheManager.set(cacheKey, result, cacheTTL.VERY_LONG)

    return result
  }

  /**
   * Get total spending for a specific period with caching
   */
  static async getTotalSpending(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    estimatedTotal: Decimal
    approvedTotal: Decimal
    actualTotal: Decimal
    count: number
  }> {
    const cacheKey = cacheKeys.totalSpending(
      startDate?.toISOString(),
      endDate?.toISOString()
    )

    // Check cache first
    const cached = cacheManager.get<{
      estimatedTotal: Decimal
      approvedTotal: Decimal
      actualTotal: Decimal
      count: number
    }>(cacheKey)
    if (cached) {
      return cached
    }

    const start = startDate || new Date(new Date().getFullYear(), 0, 1)
    const end = endDate || new Date()

    const result = await prisma.requisition.aggregate({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      _sum: {
        estimatedCost: true,
        approvedCost: true,
        actualCostPaid: true,
      },
      _count: true,
    })

    const response = {
      estimatedTotal: result._sum.estimatedCost || new Decimal(0),
      approvedTotal: result._sum.approvedCost || new Decimal(0),
      actualTotal: result._sum.actualCostPaid || new Decimal(0),
      count: result._count,
    }

    // Cache the result
    cacheManager.set(cacheKey, response, cacheTTL.LONG)

    return response
  }

  /**
   * Invalidate all report caches
   * Call this when a requisition is created, updated, or payment is recorded
   */
  static invalidateReportCache(): void {
    cacheManager.deletePattern(/^report:/)
  }

  /**
   * Invalidate specific report cache
   */
  static invalidateReportCacheByType(reportType: string): void {
    cacheManager.deletePattern(new RegExp(`^report:${reportType}:`))
  }
}
