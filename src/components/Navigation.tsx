'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Menu, X, LogOut, Settings, Home, FileText, CheckCircle, BarChart3, Users, Lock } from 'lucide-react'

interface NavigationProps {
  userRole: string
  userName: string
  userEmail: string
}

export function Navigation({ userRole, userName, userEmail }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push('/auth/login')
  }

  const getNavItems = () => {
    const commonItems = [
      { label: 'Dashboard', href: '/dashboard', icon: Home },
    ]

    const roleItems: Record<string, Array<{ label: string; href: string; icon: any }>> = {
      STAFF: [
        { label: 'Create Requisition', href: '/requisitions/new', icon: FileText },
        { label: 'My Requisitions', href: '/requisitions', icon: FileText },
      ],
      MANAGER: [
        { label: 'Approval Queue', href: '/approvals', icon: CheckCircle },
        { label: 'My Requisitions', href: '/requisitions', icon: FileText },
        { label: 'Reports', href: '/reports', icon: BarChart3 },
      ],
      FINANCE: [
        { label: 'Requisitions', href: '/requisitions', icon: FileText },
        { label: 'Record Payment', href: '/requisitions?status=APPROVED', icon: CheckCircle },
        { label: 'Reports', href: '/reports', icon: BarChart3 },
        { label: 'Audit Trail', href: '/audit-trail', icon: Lock },
      ],
      ADMIN: [
        { label: 'Users', href: '/users', icon: Users },
        { label: 'Approval Rules', href: '/approval-rules', icon: Settings },
        { label: 'Reports', href: '/reports', icon: BarChart3 },
        { label: 'Audit Trail', href: '/audit-trail', icon: Lock },
      ],
    }

    return [...commonItems, ...(roleItems[userRole] || [])]
  }

  const navItems = getNavItems()

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800'
      case 'FINANCE':
        return 'bg-green-100 text-green-800'
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800'
      case 'STAFF':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrator'
      case 'FINANCE':
        return 'Finance Officer'
      case 'MANAGER':
        return 'Manager'
      case 'STAFF':
        return 'Staff'
      default:
        return role
    }
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">📋</span>
              </div>
              <span className="text-lg font-bold text-gray-900">IRMS</span>
            </div>

            {/* Nav Items */}
            <div className="flex items-center gap-1">
              {navItems.map(item => {
                const Icon = item.icon
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </a>
                )
              })}
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{userName}</p>
                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getRoleColor(userRole)}`}>
                  {getRoleLabel(userRole)}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">📋</span>
            </div>
            <span className="text-lg font-bold text-gray-900">IRMS</span>
          </div>

          {/* Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="border-t border-gray-200 bg-gray-50">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">{userName}</p>
              <p className="text-xs text-gray-600">{userEmail}</p>
              <span className={`inline-block px-2 py-1 rounded text-xs font-semibold mt-2 ${getRoleColor(userRole)}`}>
                {getRoleLabel(userRole)}
              </span>
            </div>

            {/* Nav Items */}
            <div className="space-y-1 p-2">
              {navItems.map(item => {
                const Icon = item.icon
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </a>
                )
              })}
            </div>

            {/* Logout */}
            <div className="border-t border-gray-200 p-2">
              <button
                onClick={() => {
                  setIsOpen(false)
                  handleLogout()
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  )
}
