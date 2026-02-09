'use client'

import { useAuth } from '@/hooks/useAuth'
import EnhancedDashboardLayout from '@/components/EnhancedDashboardLayout'
import { useEffect, useState } from 'react'
import { FileText, CheckCircle, Clock, AlertCircle, TrendingUp, Plus } from 'lucide-react'
import Link from 'next/link'
import { AnimatedStatCard } from '@/components/AnimatedStatCard'
import { PageTransition } from '@/components/PageTransition'
import { AnimatedButton } from '@/components/AnimatedButton'
import { motion } from 'framer-motion'
import { formatCurrency } from '@/lib/utils'

interface DashboardStats {
  totalRequisitions: number
  pendingApprovals: number
  approvedRequisitions: number
  draftRequisitions: number
  totalSpent: number
  pendingAmount: number
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true)
        const response = await fetch('/api/dashboard/stats')
        if (!response.ok) throw new Error('Failed to fetch stats')
        const data = await response.json()

        setStats({
          totalRequisitions: data.totalRequisitions,
          pendingApprovals: data.submittedCount,
          approvedRequisitions: data.approvedCount,
          draftRequisitions: data.draftCount,
          totalSpent: data.totalSpent,
          pendingAmount: Math.max(0, data.totalApproved - (data.totalSpent || 0)),
        })
      } catch (err) {
        console.error('Failed to load stats:', err)
      } finally {
        setStatsLoading(false)
      }
    }

    if (!isLoading && user) {
      fetchStats()
    }
  }, [user, isLoading])

  return (
    <EnhancedDashboardLayout>
      <PageTransition>
        <div className="space-y-8">
          {/* Header Section */}
          <motion.div
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-2">Welcome back, {user?.name}! Here&apos;s your overview.</p>
            </div>

            {/* Quick Action Button */}
            <Link href="/requisitions/new">
              <AnimatedButton
                variant="primary"
                size="lg"
                icon={<Plus size={20} />}
              >
                New Requisition
              </AnimatedButton>
            </Link>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statsLoading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="h-32 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg"
                  animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  style={{ backgroundSize: '200% 100%' }}
                />
              ))
            ) : (
              <>
                <AnimatedStatCard
                  title="Total Requisitions"
                  value={stats?.totalRequisitions || 0}
                  icon={FileText}
                  color="blue"
                  delay={0}
                />
                <AnimatedStatCard
                  title="Pending Approvals"
                  value={stats?.pendingApprovals || 0}
                  icon={Clock}
                  color="yellow"
                  delay={0.1}
                />
                <AnimatedStatCard
                  title="Approved"
                  value={stats?.approvedRequisitions || 0}
                  icon={CheckCircle}
                  color="green"
                  delay={0.2}
                />
                <AnimatedStatCard
                  title="Drafts"
                  value={stats?.draftRequisitions || 0}
                  icon={AlertCircle}
                  color="purple"
                  delay={0.3}
                />
                <AnimatedStatCard
                  title="Total Spent"
                  value={formatCurrency(stats?.totalSpent || 0)}
                  icon={TrendingUp}
                  color="red"
                  delay={0.4}
                />
                <AnimatedStatCard
                  title="Pending Amount"
                  value={formatCurrency(stats?.pendingAmount || 0)}
                  icon={AlertCircle}
                  color="blue"
                  delay={0.5}
                />
              </>
            )}
          </div>

          {/* Quick Actions Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Create Requisition', href: '/requisitions/new', icon: Plus, color: 'from-red-500 to-red-600' },
                { label: 'View Approvals', href: '/approvals', icon: CheckCircle, color: 'from-green-500 to-green-600' },
                { label: 'Generate Report', href: '/reports', icon: TrendingUp, color: 'from-blue-500 to-blue-600' },
                { label: 'View Requisitions', href: '/requisitions', icon: FileText, color: 'from-purple-500 to-purple-600' },
              ].map((action, i) => {
                const Icon = action.icon
                return (
                  <Link key={action.href} href={action.href}>
                    <motion.div
                      className={`bg-gradient-to-br ${action.color} rounded-lg p-6 text-white cursor-pointer group`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7 + i * 0.1, duration: 0.3 }}
                      whileHover={{ scale: 1.05, y: -4 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.div
                        className="flex items-center gap-3"
                        whileHover={{ x: 4 }}
                      >
                        <motion.div
                          whileHover={{ scale: 1.2, rotate: 10 }}
                          transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                        >
                          <Icon size={24} />
                        </motion.div>
                        <span className="font-semibold">{action.label}</span>
                      </motion.div>
                    </motion.div>
                  </Link>
                )
              })}
            </div>
          </motion.div>

          {/* Info Section */}
          <motion.div
            className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.4 }}
            whileHover={{ boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
          >
            <h3 className="text-lg font-semibold text-blue-900 mb-2">💡 Pro Tip</h3>
            <p className="text-blue-800">
              Use the quick actions above to navigate faster. Your recent requisitions and approvals are always just a click away!
            </p>
          </motion.div>
        </div>
      </PageTransition>
    </EnhancedDashboardLayout>
  )
}
