import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn, getInitials } from '@/lib/utils'

const PALETTE = [
  'bg-primary/15 text-primary',
  'bg-info/15 text-info',
  'bg-success/15 text-success',
  'bg-warning/15 text-warning',
  'bg-violet-500/15 text-violet-600 dark:text-violet-400',
]

function toneFor(seed: string) {
  let hash = 0
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

export function UserAvatar({ name, className }: { name?: string | null; className?: string }) {
  return (
    <Avatar className={cn('h-8 w-8', className)}>
      <AvatarFallback className={cn('text-xs font-semibold', toneFor(name || 'user'))}>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
