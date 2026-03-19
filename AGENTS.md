# Bodega — Project Agent Rules

## Architecture

Single Next.js 16 App Router app. Two route groups:
- `app/(marketing)/` — public pages, no auth required
- `app/(app)/` — protected pages, auth checked in layout via `getServerSession()`

Auth pages live at `app/auth/` outside both groups (own layout).

---

## Critical Rules

### Prisma
- **Always run `npx prisma generate` after any schema change** before building or type-checking
- Always scope every query with `orgId` — no exceptions, no cross-org leakage
- Use `$transaction` for any movement that touches `CurrentStock`
- Never update or delete `Movement` rows — immutable ledger only

### Auth
- API routes must validate auth via `lib/api-auth.ts` — never trust client input
- `(app)` layout handles redirect for unauthenticated users — don't add duplicate checks in page components
- Session contains `id`, `email`, `name`, `role` (SystemRole) — org role is NOT in session, must be queried from `Membership`

### Components
- Default to **server components** — only add `"use client"` when hooks or event handlers are needed
- Imports always use `@/` alias — never relative paths across directories
- Component locations:
  - `app/components/ui/` — shared primitives (Button, Input, Card)
  - `app/components/marketing/` — marketing page components
  - `app/components/app/` — app shell components (Sidebar, Header)
  - `app/components/auth/` — auth forms and providers

### Styling
- Dark mode only — never add light mode variants
- Always follow Cinematic Prism: `bg-zinc-950` base, `bg-zinc-900/40 backdrop-blur-3xl` surfaces, `border-white/5` borders
- Reference `app/auth/layout.tsx` as the canonical design system example
- Primary actions: `bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)]`
- Errors: `bg-rose-500/10 text-rose-200 border-rose-500/20`

---

## Stock Movement Rules (Domain Logic)

1. Validate auth + org membership
2. Lock `CurrentStock` row (`SELECT ... FOR UPDATE`)
3. Compute new quantity based on `MovementType`
4. Reject if resulting quantity < 0
5. Insert `Movement` (immutable)
6. Update `CurrentStock` — same transaction

`ADJUSTMENT` type always requires a `reason` field.

---

## What's Built vs Not

| Area | Status |
|------|--------|
| Auth (signin/signup) | ✅ Done |
| Marketing homepage | ✅ Done (scaffold) |
| App shell (sidebar/header) | ✅ Done (scaffold) |
| Dashboard | ✅ Scaffold only |
| Organization switching | ❌ Not built |
| Item CRUD | ❌ Not built |
| Stock movements | ❌ Not built |
| Inventory views | ❌ Not built |
| Admin dashboard | ❌ Not built |
| CSV export | ❌ Not built |

---

## OpenSpec Workflow

Use before any non-trivial feature:
- `/opsx-propose` — create proposal + design + specs + tasks
- `/opsx-apply` — implement tasks
- `/opsx-archive` — archive when done

Active changes: `openspec/changes/<name>/`
Archived: `openspec/changes/archive/YYYY-MM-DD-<name>/`
Specs (source of truth): `openspec/specs/`
