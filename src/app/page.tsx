import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  BellRing,
  CheckCircle2,
  Clock,
  FilePlus2,
  FileSearch,
  Lock,
  ShieldCheck,
  UserPlus,
  Wallet,
  Workflow,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Logo } from '@/components/shared/logo'
import { ThemeToggle } from '@/components/shared/theme-toggle'

const FEATURES = [
  { icon: Workflow, title: 'Rule-based approvals', text: 'Amount thresholds route each request through the right managers and finance approvers.' },
  { icon: ShieldCheck, title: 'Immutable audit trail', text: 'Every edit, approval and payment is recorded and can never be altered.' },
  { icon: Wallet, title: 'Payment tracking', text: 'Record payments against approved budgets and flag variances instantly.' },
  { icon: BarChart3, title: 'Spending reports', text: 'Monthly, category and department breakdowns with one-click export.' },
  { icon: BellRing, title: 'Real-time notifications', text: 'In-app, email and push alerts keep requesters and approvers in sync.' },
  { icon: Lock, title: 'Role-based access', text: 'Staff, managers, finance and admins each see exactly what they need.' },
]

const STEPS = [
  { icon: UserPlus, title: 'Request access', text: 'Staff sign up and an admin approves the account.' },
  { icon: FilePlus2, title: 'Raise a requisition', text: 'Describe the need, cost and urgency, then attach quotes.' },
  { icon: CheckCircle2, title: 'Get it approved', text: 'Approvers review, comment and sign off step by step.' },
  { icon: Wallet, title: 'Pay & close', text: 'Finance records payment and the trail is complete.' },
]

const PREVIEW_ROWS = [
  { title: 'Laptops for design team', amount: '₦4.2M', status: 'Under Review', variant: 'warning' as const },
  { title: 'Cloud hosting renewal', amount: '₦1.8M', status: 'Approved', variant: 'success' as const },
  { title: 'Team offsite logistics', amount: '₦950K', status: 'Paid', variant: 'violet' as const },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo subtitle="by Techvaults" />
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="/auth/register">Request access</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/login">Sign in</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
          <div className="absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
            <div className="space-y-6">
              <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1 font-normal">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Internal Requisition Management System
              </Badge>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                Spend requests, <span className="text-primary">approved</span> without the chase.
              </h1>
              <p className="max-w-lg text-lg text-muted-foreground">
                IRMS takes every requisition from request to payment with clear approvals, live status and a complete audit trail.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/auth/login">
                    Sign in to IRMS <ArrowRight />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/auth/register">
                    <UserPlus /> Request an account
                  </Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">New staff accounts are reviewed by an administrator before access is granted.</p>
            </div>

            <Card className="relative shadow-2xl shadow-primary/10">
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Dashboard preview</p>
                    <p className="text-xs text-muted-foreground">Sample data</p>
                  </div>
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" /> On budget
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Pending', value: '12', icon: Clock },
                    { label: 'Approved', value: '38', icon: CheckCircle2 },
                    { label: 'Paid', value: '₦18.4M', icon: Wallet },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-lg border bg-muted/30 p-3">
                      <stat.icon className="mb-2 h-4 w-4 text-muted-foreground" />
                      <p className="text-lg font-semibold tabular-nums">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div className="divide-y rounded-lg border">
                  {PREVIEW_ROWS.map(row => (
                    <div key={row.title} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileSearch className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{row.title}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="tabular-nums text-muted-foreground">{row.amount}</span>
                        <Badge variant={row.variant}>{row.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight">Everything a requisition needs</h2>
              <p className="mt-3 text-muted-foreground">Built for Techvaults teams, from the first request to the final payment.</p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(feature => (
                <Card key={feature.title} className="bg-background">
                  <CardContent className="space-y-3 p-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative space-y-3 rounded-xl border p-6">
                <span className="absolute right-5 top-5 font-mono text-xs text-muted-foreground">0{index + 1}</span>
                <step.icon className="h-6 w-6 text-primary" />
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-14 flex flex-col items-center gap-4 rounded-2xl bg-zinc-950 px-6 py-12 text-center text-white">
            <h3 className="text-2xl font-semibold tracking-tight">Ready to get started?</h3>
            <p className="max-w-md text-white/70">Sign in with your work account, or request access if you&apos;re new to the team.</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link href="/auth/register">Request access</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} Techvaults</span>
          <a href="https://techvaults.com/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
            techvaults.com
          </a>
        </div>
      </footer>
    </div>
  )
}
