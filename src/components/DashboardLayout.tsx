'use client'

import { useAuth } from '@/hooks/useAuth'
import { signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { Menu, X, LogOut, Home, FileText, CheckCircle, BarChart3, Settings, Users, Bell } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch unread notifications count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/notifications')
        if (response.ok) {
          const data = await response.json()
          const notifications = data.data || []
          const unread = notifications.filter((n: any) => !n.read).length
          setUnreadCount(unread)
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      }
    }

    if (user) {
      fetchUnreadCount()
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
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

  const isActive = (href: string) => pathname === href

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? 'w-64' : 'w-20'
          } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col shadow-sm`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 bg-gradient-to-r from-white to-red-50">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 group">
              {/* Animated logo container */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-600 rounded-lg blur opacity-0 group-hover:opacity-75 transition-opacity duration-300" />
                <div className="relative bg-white rounded-lg p-1.5 shadow-sm group-hover:shadow-md transition-shadow">
                  <Image
                    src="/logo-sm.png"
                    alt="IRMS Logo"
                    width={40}
                    height={40}
                    className="w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">IRMS</span>
                <span className="text-xs text-gray-500 font-medium">Requisition System</span>
              </div>
            </div>
          ) : (
            <div className="relative mx-auto group">
              <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-600 rounded-lg blur opacity-0 group-hover:opacity-75 transition-opacity duration-300" />
              <div className="relative bg-white rounded-lg p-1.5 shadow-sm group-hover:shadow-md transition-shadow">
                <Image
                  src="/logo-sm.png"
                  alt="IRMS Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain group-hover:scale-110 transition-transform duration-300"
                />
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${active
                  ? 'bg-red-50 text-red-600 border-l-4 border-red-600'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <Icon size={20} />
                {sidebarOpen && <span className="text-sm font-medium">{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User Profile */}
        <div className="border-t border-gray-200 p-4">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.role}</p>
              </div>
            )}
          </div>
          <button
            onClick={() => signOut()}
            className={`w-full mt-3 flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors ${!sidebarOpen && 'justify-center'
              }`}
          >
            <LogOut size={18} />
            {sidebarOpen && <span>Sign out</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Welcome back, {user?.name}!</h2>
            <p className="text-sm text-gray-500">Manage your requisitions and approvals</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/notifications"
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                  {unreadCount}
                </span>
              )}
            </Link>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
