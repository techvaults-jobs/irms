import { ReactNode } from 'react'
import Link from 'next/link'
import { CheckCircle2, FileCheck2, ShieldCheck, Workflow } from 'lucide-react'
import { Logo, LogoMark } from '@/components/shared/logo'
import { ThemeToggle } from '@/components/shared/theme-toggle'

const HIGHLIGHTS = [
  { icon: Workflow, title: 'Multi-step approvals', text: 'Rules route every request to the right approvers automatically.' },
  { icon: ShieldCheck, title: 'Immutable audit trail', text: 'Every change is recorded with who, what and when.' },
  { icon: FileCheck2, title: 'Payment tracking', text: 'Follow spend from estimate to approval to payment.' },
]

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-zinc-950 p-10 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(188,0,4,0.55),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(188,0,4,0.25),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:40px_40px]" />

        <Link href="/" className="relative z-10 flex items-center gap-3">
          <LogoMark />
          <div className="leading-tight">
            <p className="font-semibold">IRMS</p>
            <p className="text-xs text-white/60">by Techvaults</p>
          </div>
        </Link>

        <div className="relative z-10 mt-auto max-w-md space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold leading-tight tracking-tight">
              Requisitions, approvals and payments — in one place.
            </h2>
            <p className="text-white/70">
              The internal requisition management system for Techvaults teams.
            </p>
          </div>
          <ul className="space-y-5">
            {HIGHLIGHTS.map(item => (
              <li key={item.title} className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <item.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-white/60">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 text-xs text-white/50">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Access is granted by your administrator.
          </div>
        </div>
      </aside>

      <main className="flex flex-col bg-background">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <Link href="/" className="lg:invisible">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-12 sm:px-6">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <p className="pb-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Techvaults. All rights reserved.
        </p>
      </main>
    </div>
  )
}
