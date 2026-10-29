import Image from 'next/image'
import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-border', className)}>
      <Image src="/logo-sm.png" alt="IRMS" width={28} height={28} className="h-[70%] w-[70%] object-contain" />
    </div>
  )
}

export function Logo({ className, subtitle = 'Requisition Management' }: { className?: string; subtitle?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <div className="grid leading-tight">
        <span className="font-semibold tracking-tight">IRMS</span>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </div>
    </div>
  )
}
