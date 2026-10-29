# IRMS — Internal Requisition Management System

Next.js 14 (App Router) · NextAuth v5 · Prisma/PostgreSQL · shadcn/ui

## Getting started

```bash
npm install
cp .env.example .env          # set DATABASE_URL and NEXTAUTH_SECRET
npx prisma migrate deploy
npx ts-node --compiler-options '{"module":"commonjs"}' dev-scripts/setup-db.ts   # optional seed data
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`RESEND_API_KEY` must be set for `next build` to succeed (the email service
creates its client at import time).

## Staff self-registration

Staff can request an account at `/auth/register`. New accounts are created as
`PENDING` and cannot sign in until an admin reviews them.

1. The applicant submits name, work email, department, optional job title/phone, and a password.
2. Active admins get an email (when an email provider is configured).
3. Admins review requests under **Users → Requests** and either:
   - **Approve**, choosing the role and department, which activates the account, or
   - **Reject** with a reason, which the applicant receives by email.
4. On sign-in, pending, rejected and deactivated users see a specific message
   (only after their password is verified, so account existence isn't revealed).

Rejected applicants may submit a new request with the same email. Accounts
created directly by an admin are approved immediately.

API: `POST /api/auth/register` (public, rate-limited), `GET /api/users?status=PENDING`,
`GET /api/users/stats`, `POST /api/users/:id/approve`, `POST /api/users/:id/reject`.

## Deploying

Vercel deploys `main` to production automatically. On production builds the
`vercel-build` script runs `prisma migrate deploy` before `next build`, because
production secrets are marked Sensitive in Vercel and can't be pulled locally to
run migrations by hand. If a migration fails, the build fails and the previous
deployment stays live.

## UI

See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).
