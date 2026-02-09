'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react'

interface DashboardStats {
  totalRequisitions: number
  draftRequisitions: number
  pendingApproval: number
  approvedRequisitions: number
  rejectedRequisitions: number
  paidRequisitions: number
  totalEstimatedCost: number
  totalApprovedCost: number
  totalActualCost: number
  pendingLiabilities: number
}

interface RecentActivity {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
  status: string
}

interface DashboardProps {
  userRole: string
  userName: string
}

export function Dashboard({ userRole, userName }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch stats
      const statsResponse = await fetch('/api/dashboard/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      // Fetch recent activity
      const activityResponse = await fetch('/api/dashboard/activity')
      if (activityResponse.ok) {
        const activityData = await activityResponse.json()
        setRecentActivity(activityData.data || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'CREATED':
        return '✨'
      case 'SUBMITTED':
        return '📤'
      case 'APPROVED':
        return '✅'
      case 'REJECTED':
        return '❌'
      case 'PAID':
        return '💰'
      default:
        return '📝'
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'CREATED':
        return 'bg-blue-100 text-blue-800'
      case 'SUBMITTED':
        return 'bg-purple-100 text-purple-800'
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      case 'PAID':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
        <p className="mt-4">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-sm p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {userName}!</h1>
        <p className="text-blue-100 mt-1">
          {userRole === 'ADMIN' && 'System Administrator'}
          {userRole === 'FINANCE' && 'Finance Officer'}
          {userRole === 'MANAGER' && 'Manager'}
          {userRole === 'STAFF' && 'Staff Member'}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Requisitions */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-600 uppercase">Total Requisitions</p>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalRequisitions}</p>
            <p className="text-xs text-gray-600 mt-2">
              {stats.draftRequisitions} draft, {stats.pendingApproval} pending
            </p>
          </div>

          {/* Pending Approval */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-600 uppercase">Pending Approval</p>
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingApproval}</p>
            <p className="text-xs text-gray-600 mt-2">Awaiting action</p>
          </div>

          {/* Approved Requisitions */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-600 uppercase">Approved</p>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.approvedRequisitions}</p>
            <p className="text-xs text-gray-600 mt-2">
              {stats.paidRequisitions} paid
            </p>
          </div>

          {/* Rejected Requisitions */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-600 uppercase">Rejected</p>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.rejectedRequisitions}</p>
            <p className="text-xs text-gray-600 mt-2">Requires resubmission</p>
          </div>
        </div>
      )}

      {/* Financial Summary */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Estimated Cost */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Estimated Cost</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalEstimatedCost)}</p>
            <p className="text-xs text-gray-600 mt-2">Total requested amount</p>
          </div>

          {/* Approved Cost */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Approved Cost</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalApprovedCost)}</p>
            <p className="text-xs text-gray-600 mt-2">Total approved amount</p>
          </div>

          {/* Actual Cost */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Actual Cost</p>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalActualCost)}</p>
            <p className="text-xs text-gray-600 mt-2">Total paid amount</p>
          </div>
        </div>
      )}

      {/* Pending Liabilities */}
      {stats && stats.pendingLiabilities > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-yellow-900">Pending Liabilities</p>
              <p className="text-sm text-yellow-800 mt-1">
                {formatCurrency(stats.pendingLiabilities)} in approved but unpaid requisitions
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        {recentActivity.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.slice(0, 5).map(activity => (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{activity.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-2">{formatDate(activity.timestamp)}</p>
                </div>

                {/* Status Badge */}
                <div className="flex-shrink-0">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getActivityColor(activity.status)}`}>
                    {activity.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {userRole === 'STAFF' && (
            <>
              <a
                href="/requisitions/new"
                className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-center hover:bg-blue-100 transition-colors"
              >
                <p className="font-medium text-blue-900">Create Requisition</p>
                <p className="text-xs text-blue-700 mt-1">Start a new request</p>
              </a>
              <a
                href="/requisitions"
                className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-center hover:bg-gray-100 transition-colors"
              >
                <p className="font-medium text-gray-900">My Requisitions</p>
                <p className="text-xs text-gray-600 mt-1">View your requests</p>
              </a>
            </>
          )}

          {userRole === 'MANAGER' && (
            <>
              <a
                href="/approvals"
                className="px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center hover:bg-yellow-100 transition-colors"
              >
                <p className="font-medium text-yellow-900">Approval Queue</p>
                <p className="text-xs text-yellow-700 mt-1">Review pending</p>
              </a>
              <a
                href="/reports"
                className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-center hover:bg-gray-100 transition-colors"
              >
                <p className="font-medium text-gray-900">Department Report</p>
                <p className="text-xs text-gray-600 mt-1">View spending</p>
              </a>
            </>
          )}

          {userRole === 'FINANCE' && (
            <>
              <a
                href="/requisitions?status=APPROVED"
                className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-center hover:bg-green-100 transition-colors"
              >
                <p className="font-medium text-green-900">Record Payment</p>
                <p className="text-xs text-green-700 mt-1">Process payments</p>
              </a>
              <a
                href="/reports"
                className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-center hover:bg-gray-100 transition-colors"
              >
                <p className="font-medium text-gray-900">Financial Reports</p>
                <p className="text-xs text-gray-600 mt-1">View analytics</p>
              </a>
            </>
          )}

          {userRole === 'ADMIN' && (
            <>
              <a
                href="/users"
                className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-center hover:bg-red-100 transition-colors"
              >
                <p className="font-medium text-red-900">User Management</p>
                <p className="text-xs text-red-700 mt-1">Manage users</p>
              </a>
              <a
                href="/approval-rules"
                className="px-4 py-3 bg-purple-50 border border-purple-200 rounded-lg text-center hover:bg-purple-100 transition-colors"
              >
                <p className="font-medium text-purple-900">Approval Rules</p>
                <p className="text-xs text-purple-700 mt-1">Configure workflows</p>
              </a>
              <a
                href="/reports"
                className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-center hover:bg-gray-100 transition-colors"
              >
                <p className="font-medium text-gray-900">System Reports</p>
                <p className="text-xs text-gray-600 mt-1">View all data</p>
              </a>
              <a
                href="/audit-trail"
                className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-center hover:bg-gray-100 transition-colors"
              >
                <p className="font-medium text-gray-900">Audit Trail</p>
                <p className="text-xs text-gray-600 mt-1">View logs</p>
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
