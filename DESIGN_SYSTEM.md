# Design System

IRMS uses [shadcn/ui](https://ui.shadcn.com) (Radix primitives + Tailwind) with
[lucide](https://lucide.dev) icons. Components live in `src/components/ui` and are
owned by this repo — edit them directly.

## Adding components

```bash
npx shadcn@2.3.0 add <component>
```

The CLI rewrites `globals.css` theme variables when adding some components. After
running it, check the `--sidebar-*` tokens still use the brand red (see below).

## Theme tokens

Colors are HSL CSS variables in `src/app/globals.css`, with a `.dark` override.
Dark mode is handled by `next-themes` (light / dark / system).

| Token | Use |
|---|---|
| `primary` | Techvaults red `#bc0004` — primary actions, active nav, focus rings |
| `success` / `warning` / `info` / `destructive` | Status meaning only (approved, pending, informational, rejected/danger) |
| `muted`, `accent`, `border` | Surfaces and chrome |
| `chart-1` … `chart-5` | Categorical chart colors, in this fixed order (validated for color-blind separation in both modes) |

Never use a status color to mean "series 4" in a chart, and never rely on color
alone — status badges always carry an icon and a label.

## Shared building blocks

| Component | Path |
|---|---|
| App shell (sidebar, header, breadcrumbs, ⌘K menu) | `src/components/layout/` |
| `PageHeader`, `StatCard`, `EmptyState`, `ConfirmDialog`, `RoleGate`, `PaginationBar`, `UserAvatar` | `src/components/shared/` |
| `StatusBadge` (requisition, urgency, step, account, role) | `src/components/shared/status-badge.tsx` |
| Status/role labels, icons and badge variants | `src/lib/status.ts` |
| Charts | `src/components/charts/` |

Badge variants: `default`, `secondary`, `outline`, `muted`, `success`, `warning`,
`info`, `danger`, `violet`. Button adds a `success` variant.

## Conventions

- Feedback goes through toasts (`sonner`): `toast.success(...)`, `toast.error(...)`.
- Destructive actions use `ConfirmDialog`, never `window.confirm`.
- Money: `formatMoney(amount, currencyCode)`; dates: `formatDate` / `formatRelative` (`src/lib/utils.ts`).
- API errors: `apiFetch` throws an `Error` carrying the API's message (handles both
  `{ error: "..." }` and Zod validation error shapes).

## Payment reference format

`PAY-YYYYMMDD-HHMMSS-XXXX`, auto-generated on the payment form.
