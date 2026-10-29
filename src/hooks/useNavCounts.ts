'use client'

import { useCallback, useEffect, useState } from 'react'

export interface NavCounts {
  approvals: number
  pendingUsers: number
}

/**
 * Badge counts for the sidebar. Polls every minute and refreshes when a page
 * dispatches the `irms:counts-changed` event (e.g. after approving a user).
 */
export function useNavCounts(role?: string) {
  const [counts, setCounts] = useState<NavCounts>({ approvals: 0, pendingUsers: 0 })

  const refresh = useCallback(async () => {
    if (!role) return
    const next: NavCounts = { approvals: 0, pendingUsers: 0 }

    const requests: Promise<void>[] = []
    if (role === 'MANAGER' || role === 'FINANCE' || role === 'ADMIN') {
      requests.push(
        fetch('/api/requisitions?status=UNDER_REVIEW&take=1')
          .then(r => (r.ok ? r.json() : null))
          .then(data => {
            next.approvals = data?.pagination?.total ?? 0
          })
          .catch(() => {})
      )
    }
    if (role === 'ADMIN') {
      requests.push(
        fetch('/api/users/stats')
          .then(r => (r.ok ? r.json() : null))
          .then(data => {
            next.pendingUsers = data?.pending ?? 0
          })
          .catch(() => {})
      )
    }

    await Promise.all(requests)
    setCounts(next)
  }, [role])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 60000)
    window.addEventListener('irms:counts-changed', refresh)
    return () => {
      clearInterval(interval)
      window.removeEventListener('irms:counts-changed', refresh)
    }
  }, [refresh])

  return counts
}

export function notifyCountsChanged() {
  window.dispatchEvent(new Event('irms:counts-changed'))
}
