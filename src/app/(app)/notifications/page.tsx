'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, Check, CheckCheck, ExternalLink, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { useNotificationsContext } from '@/components/layout/app-shell'
import { NOTIFICATION_META, notificationMeta } from '@/components/notifications/notification-meta'
import { cn, formatDate, formatRelative } from '@/lib/utils'

export default function NotificationsPage() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } = useNotificationsContext()
  const [filter, setFilter] = useState('all')

  const visible = notifications.filter(n => {
    if (filter === 'all') return true
    if (filter === 'unread') return !n.isRead
    return n.type === filter
  })

  const firstLoad = isLoading && notifications.length === 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}.` : "You're all caught up."}
        actions={
          unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCheck /> Mark all as read
            </Button>
          )
        }
      />

      <Tabs value={filter} onValueChange={setFilter} className="overflow-x-auto">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread {unreadCount > 0 && `(${unreadCount})`}</TabsTrigger>
          {Object.entries(NOTIFICATION_META).map(([type, meta]) => (
            <TabsTrigger key={type} value={type} className="gap-1.5">
              <meta.icon className="h-3.5 w-3.5" />
              {meta.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {firstLoad ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === 'all' ? 'No notifications yet' : 'Nothing here'}
          description={filter === 'all' ? "We'll let you know when something needs your attention." : 'No notifications match this filter.'}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {visible.map(n => {
                const meta = notificationMeta(n.type)
                return (
                  <li key={n.id} className={cn('group flex gap-4 p-4 sm:p-5', !n.isRead && 'bg-primary/[0.03]')}>
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', meta.tone)}>
                      <meta.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/requisitions/${n.requisitionId}`}
                          onClick={() => !n.isRead && markAsRead(n.id)}
                          className="font-medium hover:underline"
                        >
                          {n.requisition?.title ?? 'Requisition'}
                        </Link>
                        {n.requisition?.status && <StatusBadge value={n.requisition.status} />}
                        {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unread" />}
                      </div>
                      <p className="text-sm text-muted-foreground">{n.message}</p>
                      <p className="text-xs text-muted-foreground" title={formatDate(n.createdAt, true)}>
                        {formatRelative(n.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-start gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/requisitions/${n.requisitionId}`} aria-label="Open requisition" onClick={() => !n.isRead && markAsRead(n.id)}>
                              <ExternalLink />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open requisition</TooltipContent>
                      </Tooltip>
                      {!n.isRead && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => markAsRead(n.id)} aria-label="Mark as read">
                              <Check />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Mark as read</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => deleteNotification(n.id)} aria-label="Delete" className="text-muted-foreground hover:text-destructive">
                            <Trash2 />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
