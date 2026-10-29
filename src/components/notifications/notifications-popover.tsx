'use client'

import Link from 'next/link'
import { Bell, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn, formatRelative } from '@/lib/utils'
import { notificationMeta } from './notification-meta'
import type { useNotifications } from '@/hooks/useNotifications'

type NotificationsState = ReturnType<typeof useNotifications>

export function NotificationsPopover({ state }: { state: NotificationsState }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = state
  const latest = notifications.slice(0, 8)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications (${unreadCount} unread)`}>
          <Bell />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <CheckCheck /> Mark all read
            </Button>
          )}
        </div>
        <Separator />
        {latest.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Bell className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <ul className="divide-y">
              {latest.map(n => {
                const meta = notificationMeta(n.type)
                return (
                  <li key={n.id}>
                    <Link
                      href={`/requisitions/${n.requisitionId}`}
                      onClick={() => !n.isRead && markAsRead(n.id)}
                      className={cn('flex gap-3 px-4 py-3 transition-colors hover:bg-accent', !n.isRead && 'bg-primary/[0.03]')}
                    >
                      <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', meta.tone)}>
                        <meta.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="truncate text-sm font-medium">{n.requisition?.title ?? 'Requisition'}</p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                        <p className="text-[11px] text-muted-foreground">{formatRelative(n.createdAt)}</p>
                      </div>
                      {!n.isRead && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </ScrollArea>
        )}
        <Separator />
        <div className="p-2">
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link href="/notifications">View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
