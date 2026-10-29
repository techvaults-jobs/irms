import {
  Bell,
  CheckSquare,
  FilePlus2,
  FileText,
  LayoutDashboard,
  LucideIcon,
  PieChart,
  Settings,
  Users,
} from 'lucide-react'

export type Role = 'STAFF' | 'MANAGER' | 'FINANCE' | 'ADMIN'

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  roles?: Role[]
  badgeKey?: 'approvals' | 'pendingUsers' | 'notifications'
  keywords?: string[]
}

export interface NavSection {
  label: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Workspace',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, keywords: ['home', 'overview'] },
      { title: 'Requisitions', href: '/requisitions', icon: FileText, keywords: ['requests', 'list'] },
      { title: 'New requisition', href: '/requisitions/new', icon: FilePlus2, keywords: ['create', 'request'] },
      {
        title: 'Approvals',
        href: '/approvals',
        icon: CheckSquare,
        roles: ['MANAGER', 'FINANCE', 'ADMIN'],
        badgeKey: 'approvals',
        keywords: ['queue', 'review'],
      },
      {
        title: 'Reports',
        href: '/reports',
        icon: PieChart,
        roles: ['MANAGER', 'FINANCE', 'ADMIN'],
        keywords: ['analytics', 'spending', 'export'],
      },
    ],
  },
  {
    label: 'Account',
    items: [
      { title: 'Notifications', href: '/notifications', icon: Bell, badgeKey: 'notifications', keywords: ['inbox', 'alerts'] },
      { title: 'Settings', href: '/settings', icon: Settings, keywords: ['preferences', 'profile', 'rules'] },
    ],
  },
  {
    label: 'Administration',
    items: [
      {
        title: 'Users',
        href: '/users',
        icon: Users,
        roles: ['ADMIN'],
        badgeKey: 'pendingUsers',
        keywords: ['accounts', 'approve', 'registration', 'staff'],
      },
    ],
  },
]

export function visibleSections(role?: string): NavSection[] {
  return NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => !item.roles || (role && item.roles.includes(role as Role))),
  })).filter(section => section.items.length > 0)
}

const TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  requisitions: 'Requisitions',
  new: 'New',
  edit: 'Edit',
  approvals: 'Approvals',
  reports: 'Reports',
  notifications: 'Notifications',
  settings: 'Settings',
  users: 'Users',
}

export function breadcrumbsFor(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  return parts.map((part, index) => ({
    href: '/' + parts.slice(0, index + 1).join('/'),
    label: TITLES[part] ?? (part.length > 12 ? `#${part.slice(-6).toUpperCase()}` : part),
  }))
}
