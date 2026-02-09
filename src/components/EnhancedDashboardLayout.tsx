'use client'

import { useAuth } from '@/hooks/useAuth'
import { signOut } from 'next-auth/react'
import { useState } from 'react'
import { Menu, X, LogOut, Home, FileText, CheckCircle, BarChart3, Settings, Users, ChevronDown, Bell } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatedNavigation } from './AnimatedNavigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotifications } from '@/hooks/useNotifications'

interface EnhancedDashboardLayoutProps {
  children: React.ReactNode
}

export default function EnhancedDashboardLayout({ children }: EnhancedDashboardLayoutProps) {
  const { user, isLoading } = useAuth()
  const { unreadCount } = useNotifications()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const pathname = usePathname()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-gray-light">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="inline-block rounded-full h-12 w-12 border-4 border-brand-primary border-opacity-20 border-t-brand-primary"
          />
          <motion.p
            className="mt-4 text-brand-gray"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Loading...
          </motion.p>
        </motion.div>
      </div>
    )
  }

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Requisitions', href: '/requisitions', icon: FileText },
    { name: 'Approvals', href: '/approvals', icon: CheckCircle },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    ...(user?.role === 'ADMIN' ? [{ name: 'Users', href: '/users', icon: Users }] : []),
    ...(user?.role === 'ADMIN' ? [{ name: 'Settings', href: '/settings', icon: Settings }] : []),
  ]

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/auth/login' })
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Animated Sidebar */}
      <AnimatedNavigation
        items={navigationItems}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation Bar */}
        <motion.div
          className="bg-brand-light border-b border-brand-gray-border shadow-sm sticky top-0 z-40"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between px-6 py-4">
            {/* Left side - Toggle and Title */}
            <div className="flex items-center gap-4">
              <motion.button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-brand-gray-light rounded-lg transition-colors text-brand-dark"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </motion.button>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h1 className="text-xl font-semibold text-brand-dark">IRMS</h1>
                <p className="text-xs text-brand-gray">Integrated Requisition Management System</p>
              </motion.div>
            </div>

            {/* Right side - User Menu */}
            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <Link
                href="/notifications"
                className="relative p-2 text-brand-dark hover:text-brand-primary hover:bg-brand-gray-light rounded-lg transition-colors"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-brand-primary rounded-full">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* User Info */}
              <motion.div
                className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-brand-gray-light cursor-pointer"
                whileHover={{ backgroundColor: '#f5f5f5' }}
              >
                <div className="text-right">
                  <p className="text-sm font-medium text-brand-dark">{user?.name || 'User'}</p>
                  <p className="text-xs text-brand-gray capitalize">{user?.role?.toLowerCase()}</p>
                </div>
              </motion.div>

              {/* User Menu Dropdown */}
              <div className="relative">
                <motion.button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-brand-gray-light transition-colors text-brand-dark"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-brand-primary to-brand-primary rounded-full flex items-center justify-center text-brand-light text-sm font-semibold">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <motion.div
                    animate={{ rotate: userMenuOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={16} />
                  </motion.div>
                </motion.button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-48 bg-brand-light rounded-lg shadow-lg border border-brand-gray-border overflow-hidden z-50"
                    >
                      <motion.button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-brand-primary hover:bg-brand-gray-light transition-colors text-sm font-medium"
                        whileHover={{ backgroundColor: '#f5f5f5' }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <LogOut size={16} />
                        Logout
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Page Content */}
        <motion.main
          className="flex-1 overflow-auto bg-brand-gray-light"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="p-6 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </motion.main>
      </div>
    </div>
  )
}
