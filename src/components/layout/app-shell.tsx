'use client'

import { createContext, Fragment, ReactNode, useContext } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { AuthGuard } from '@/components/AuthGuard'
import { LogoMark } from '@/components/shared/logo'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { NotificationsPopover } from '@/components/notifications/notifications-popover'
import { AppSidebar } from './app-sidebar'
import { CommandMenu } from './command-menu'
import { breadcrumbsFor } from './nav-config'
import { useAuth } from '@/hooks/useAuth'
import { useNavCounts } from '@/hooks/useNavCounts'
import { useNotifications } from '@/hooks/useNotifications'

type NotificationsState = ReturnType<typeof useNotifications>

const NotificationsContext = createContext<NotificationsState | null>(null)

export function useNotificationsContext() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotificationsContext must be used inside AppShell')
  return ctx
}

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <LogoMark className="h-12 w-12" />
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  )
}

function ShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const notifications = useNotifications()
  const navCounts = useNavCounts(user?.role)
  const crumbs = breadcrumbsFor(pathname)

  return (
    <NotificationsContext.Provider value={notifications}>
      <SidebarProvider>
        <AppSidebar counts={{ ...navCounts, notifications: notifications.unreadCount }} />
        <SidebarInset className="min-w-0">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:rounded-t-xl">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb className="hidden md:block">
              <BreadcrumbList>
                {crumbs.map((crumb, index) => (
                  <Fragment key={crumb.href}>
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {index === crumbs.length - 1 ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href={crumb.href}>{crumb.label}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <CommandMenu />
              <NotificationsPopover state={notifications} />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </NotificationsContext.Provider>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthGuard fallback={<FullScreenLoader />}>
      <ShellContent>{children}</ShellContent>
    </AuthGuard>
  )
}
