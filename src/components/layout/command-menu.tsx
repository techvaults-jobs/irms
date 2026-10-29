'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, LogOut, Moon, Search, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { visibleSections } from './nav-config'
import { useAuth } from '@/hooks/useAuth'
import { useLogout } from '@/hooks/useLogout'

interface RequisitionHit {
  id: string
  title: string
  status: string
}

export function CommandMenu() {
  const router = useRouter()
  const { user } = useAuth()
  const { logout } = useLogout()
  const { resolvedTheme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [recent, setRecent] = useState<RequisitionHit[]>([])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen(current => !current)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!open) return
    fetch('/api/requisitions?take=20')
      .then(r => (r.ok ? r.json() : null))
      .then(data => setRecent(data?.data ?? []))
      .catch(() => {})
  }, [open])

  const run = (action: () => void) => {
    setOpen(false)
    action()
  }

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start rounded-md bg-muted/40 px-3 text-sm font-normal text-muted-foreground shadow-none sm:w-56 lg:w-72"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-1" />
        <span className="hidden sm:inline">Search or jump to…</span>
        <span className="sm:hidden">Search…</span>
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden h-5 -translate-y-1/2 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages and requisitions…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {visibleSections(user?.role).map(section => (
            <CommandGroup key={section.label} heading={section.label}>
              {section.items.map(item => (
                <CommandItem
                  key={item.href}
                  value={`${item.title} ${item.keywords?.join(' ') ?? ''}`}
                  onSelect={() => run(() => router.push(item.href))}
                >
                  <item.icon />
                  {item.title}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          {recent.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Requisitions">
                {recent.map(req => (
                  <CommandItem
                    key={req.id}
                    value={`${req.title} ${req.id}`}
                    onSelect={() => run(() => router.push(`/requisitions/${req.id}`))}
                  >
                    <FileText />
                    <span className="truncate">{req.title}</span>
                    <StatusBadge value={req.status} className="ml-auto" hideIcon />
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
          <CommandSeparator />
          <CommandGroup heading="Preferences">
            <CommandItem onSelect={() => run(() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'))}>
              {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
              Toggle theme
            </CommandItem>
            <CommandItem onSelect={() => run(logout)}>
              <LogOut />
              Sign out
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
