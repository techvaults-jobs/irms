'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronsUpDown, KeyRound, LogOut, Moon, Settings, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogoMark } from '@/components/shared/logo'
import { UserAvatar } from '@/components/shared/user-avatar'
import { StatusBadge } from '@/components/shared/status-badge'
import { visibleSections } from './nav-config'
import { useAuth } from '@/hooks/useAuth'
import { useLogout } from '@/hooks/useLogout'

interface AppSidebarProps {
  counts: Record<string, number>
}

export function AppSidebar({ counts }: AppSidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const { logout } = useLogout()
  const { resolvedTheme, setTheme } = useTheme()
  const sections = visibleSections(user?.role)

  const isActive = (href: string) =>
    href === '/requisitions'
      ? pathname === href || (pathname.startsWith('/requisitions/') && !pathname.startsWith('/requisitions/new'))
      : pathname === href || pathname.startsWith(href + '/')

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <LogoMark className="h-8 w-8" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">IRMS</span>
                  <span className="truncate text-xs text-muted-foreground">Techvaults</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {sections.map(section => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarMenu>
              {section.items.map(item => {
                const count = item.badgeKey ? counts[item.badgeKey] ?? 0 : 0
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.title}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {count > 0 && (
                      <SidebarMenuBadge className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground peer-hover/menu-button:text-primary-foreground peer-data-[active=true]/menu-button:text-primary-foreground">
                        {count > 99 ? '99+' : count}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <UserAvatar name={user?.name} className="rounded-lg" />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60" side="top" align="start" sideOffset={6}>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-2">
                    <UserAvatar name={user?.name} />
                    <div className="grid flex-1 leading-tight">
                      <span className="truncate text-sm font-semibold">{user?.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                    </div>
                  </div>
                  <StatusBadge kind="role" value={user?.role} className="mt-2" />
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings?tab=security">
                    <KeyRound /> Change password
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
                  {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
                  {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
