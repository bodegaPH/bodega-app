# Bodega — Project Agent Rules

## Architecture & Code Organization
- Single Next.js 16 App Router app. Route groups:
  - `app/(app)/` — protected pages, auth checked via `getServerSession()`.
  - Marketing site extracted to separate `bodega-marketing` repository (Astro).
- Auth pages live at `app/auth/` outside route groups (own layout).
- **Feature-Driven Architecture**: Domain logic, actions, types, and components should be encapsulated in `src/features/<domain>/`.
- Do not place shared feature logic in `app/` routes. `app/` should mostly contain route handlers and page layouts wrapping feature components.

### Feature Module Convention

Each feature module in `src/features/<domain>/` follows this structure:

```
src/features/<domain>/
├── api/            # Data access layer (server-only, can use Prisma)
├── actions/        # Server actions with "use server"
├── components/     # Domain-specific React components
├── hooks/          # Client-side hooks (if needed)
├── types.ts        # Domain types and DTOs
├── index.ts        # Client-safe exports (components, hooks, types)
└── server.ts       # Server-only exports (API functions, actions)
```

**Server/Client Boundary Rules:**
- `index.ts` — Client-safe: components, hooks, types. **Never import Prisma here.**
- `server.ts` — Server-only: API functions, actions. **Can use Prisma.**
- Never import `server.ts` from client components — Next.js will error on Prisma in browser bundle.
- Cross-feature imports should go through barrel exports, not reach into internal files.

**Cross-Feature Dependencies:**
- Features should expose service functions for validation/lookup that other features need.
- Avoid direct Prisma queries across feature boundaries — use the owning feature's API instead.
- Shared types used by multiple features belong in `src/features/shared/types.ts`.

## Build, Lint & Test Commands
- **Type Checking:** Run `npx tsc --noEmit` to verify TypeScript types (CRITICAL: Always run this before committing or concluding a task).
- **Linting:** Run `npm run lint` to check for ESLint warnings/errors.
- **Build:** Run `npm run build` to create a production build and verify complete compilation.
- **Testing:** (When testing is added, Vitest/Jest is preferred).
  - To run all tests: `npm test` or `npx vitest run`
  - To run a single test: `npx vitest run path/to/file.test.ts` (or `npx jest path/to/file.test.ts`).

## Code Style & Conventions

### Imports
- Always use the `@/` alias for absolute paths (e.g., `@/features/organizations`, `@/lib/db`). 
- Never use relative paths (like `../../lib`) across major directory boundaries.
- Grouping: React/Next.js native -> Third-party -> `@/features` -> `@/lib` -> Local relative.

### Types & Naming Conventions
- Prefer explicit interface definitions for component props and domain models. Export them from `src/features/<domain>/types.ts`.
- **Naming**: 
  - `PascalCase` for React components, Types, and Interfaces (e.g., `AppSidebar.tsx`, `OrganizationMember`).
  - `camelCase` for functions, hooks (`use...`), and variables.
  - `kebab-case` for standard project folders.
- Avoid `any`. Use `unknown` if the type is truly dynamic, and validate at runtime.

### Error Handling
- **Server Actions**: Always return discriminated unions. Avoid throwing unhandled exceptions to the client.
  ```ts
  type ActionResult = { success: true; data: T } | { success: false; error: string };
  ```
- **API Routes**: Catch domain errors (e.g., `OrganizationsApiError`) and return structured JSON with appropriate HTTP status codes. Never leak raw database/Prisma errors to the client.

### Components
- Default to **server components** in Next.js 16. Only add `"use client"` when React hooks (`useState`, `useEffect`) or DOM event handlers are strictly needed.
- Keep components small. Extract and delegate complex business logic to `api/` or `actions/` files.
- Component locations:
  - `src/components/ui/` — shared primitives (Button, Input, Card).
  - `src/components/layout/` — app shell components (AppSidebar, AppHeader).
  - `src/features/<domain>/components/` — domain-specific components.

### Organization Context
- **OrgProvider** is available in all `app/(app)/[orgId]/**` routes via layout.
- **Server components**: Continue using `params` directly — don't use context.
- **Client components**: Use `useOrg()` hook when you need `orgId` or `userId` without prop drilling.
  ```tsx
  "use client";
  import { useOrg } from "@/features/shared/OrgContext";
  
  function MyComponent() {
    const { orgId, userId } = useOrg();
    // ...
  }
  ```
- **When to use context**: Real-time features, deeply nested client forms, client-side org-scoped state.
- **When to use params**: Server components, single-level prop passing (current pattern for most pages).

### Styling
- Dark mode only — never add light mode variants.
- Always follow Cinematic Prism: `bg-zinc-950` base, `bg-zinc-900/40 backdrop-blur-3xl` surfaces, `border-white/5` borders.
- Reference `app/auth/layout.tsx` as the canonical design system example.
- Primary actions: `bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)]`.
- Errors: `bg-rose-500/10 text-rose-200 border-rose-500/20`.

---

## Critical Rules

### Prisma Database
- **Always run `npx prisma generate` after any schema change** before building or type-checking.
- Always scope every query with `orgId` — no exceptions, no cross-org leakage.
- Use `$transaction` for any data movement that touches `CurrentStock`.
- Never update or delete `Movement` rows — immutable ledger only.

### Authentication
- API routes must validate auth via `lib/api-auth.ts` — never trust client input.
- The `(app)` layout handles redirects for unauthenticated users — don't add duplicate checks in page components.
- Session contains `id`, `email`, `name`, `role` (SystemRole). **Organization role is NOT in session**, it must be queried from the `Membership` table using `orgId`.

---

## Stock Movement Rules (Domain Logic)

1. Validate auth + org membership for the user.
2. Lock `CurrentStock` row (`SELECT ... FOR UPDATE`) in a transaction.
3. Compute new quantity based on `MovementType` (RECEIVE, ISSUE, ADJUSTMENT).
4. Reject transaction if resulting quantity < 0.
5. Insert `Movement` (immutable).
6. Update `CurrentStock` — in the same transaction.

`ADJUSTMENT` type always requires a `reason` field.

---

## OpenSpec Workflow

Use before any non-trivial feature:
- `/opsx-propose` — create proposal + design + specs + tasks
- `/opsx-apply` — implement tasks
- `/opsx-archive` — archive when done

Active changes: `openspec/changes/<name>/`
Archived: `openspec/changes/archive/YYYY-MM-DD-<name>/`
Specs (source of truth): `openspec/specs/`
