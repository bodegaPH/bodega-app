# Bodega — Project Agent Rules

## Architecture & Code Organization

### Layered Architecture
Bodega uses a **clean layered architecture** separating business logic from presentation:

```
┌─────────────────────────────────────────────────────┐
│  src/features/          (Presentation Layer)        │
│  └── Components, Actions, Hooks, Server re-exports  │
└─────────────────────────────────────────────────────┘
                        ↓ imports from
┌─────────────────────────────────────────────────────┐
│  src/modules/           (Domain/Business Layer)     │
│  └── Service, Repository, Types, Errors, Tests      │
└─────────────────────────────────────────────────────┘
                        ↓ queries
┌─────────────────────────────────────────────────────┐
│  Prisma → PostgreSQL                                │
└─────────────────────────────────────────────────────┘
```

### Module Convention (Domain Layer)

**Location:** `src/modules/<domain>/`

**Purpose:** Encapsulates all business logic, data access, and domain rules.

**Structure:**
```
src/modules/<domain>/
├── __tests__/          # Integration tests
├── repository.ts       # Prisma data access (INTERNAL to module)
├── service.ts          # Public API (validation + business logic)
├── types.ts            # Domain types and DTOs
├── errors.ts           # Domain-specific error classes
└── index.ts            # Public exports barrel
```

**Rules:**
- **Repository layer** (`repository.ts`) — Direct Prisma queries. **NEVER import outside the module.**
- **Service layer** (`service.ts`) — Validates input, orchestrates business logic, calls repository.
- **Public API** — Only `index.ts` and `service.ts` exports are importable from outside.
- **No cross-module Prisma queries** — Modules call each other through service APIs only.
- **Error handling** — Throw domain-specific errors (e.g., `ItemApiError`) from service layer.

**Example:**
```ts
// ❌ BAD: Don't import repository from features
import { findItemById } from "@/modules/items/repository";

// ✅ GOOD: Import from module barrel (service API)
import { getItems, validateForMovement } from "@/modules/items";
```

### Feature Convention (Presentation Layer)

**Location:** `src/features/<domain>/`

**Purpose:** UI components, server actions, and React hooks for user-facing functionality.

**Structure:**
```
src/features/<domain>/
├── actions/            # Server actions with "use server"
├── components/         # React components (server or client)
├── hooks/              # Client-side hooks (if needed)
├── types.ts            # Feature-specific types (often re-exports)
├── index.ts            # Client-safe exports (components, hooks)
└── server.ts           # Re-exports from @/modules/<domain>
```

**Rules:**
- **Features call modules** — Import from `@/modules/<domain>`, never from Prisma directly.
- **server.ts** — Re-exports module APIs for use in server components/actions.
- **index.ts** — Client-safe exports only (no module imports with Prisma).
- **Components** — Default to server components. Use `"use client"` only when needed.

**Example:**
```ts
// src/features/items/server.ts
export { getItems, createItem, deleteItem } from "@/modules/items";

// src/features/items/actions/create-item.ts
import { createItem } from "@/modules/items"; // Direct module import OK in actions
```

### Cross-Layer Dependencies
- **Modules → Modules:** Call through service APIs (exported from `index.ts`)
- **Features → Modules:** Import from `@/modules/<domain>`
- **Features → Features:** Rare, but import from `@/features/<domain>` barrel exports
- **Shared types:** `src/features/shared/types.ts` for cross-feature DTOs

### Route Organization
- Single Next.js 16 App Router app. Route groups:
  - `src/app/(app)/` — protected pages, auth checked via `getServerSession()`.
  - Marketing site extracted to separate `bodega-marketing` repository (Astro).
- Auth pages live at `src/app/auth/` outside route groups (own layout).
- `src/app/` should mostly contain route handlers and page layouts wrapping feature components.

## Build, Lint & Test Commands

### Type Checking
- **Run type check:** `npx tsc --noEmit`
- **CRITICAL:** Always run this before committing or concluding a task.

### Linting
- **Lint entire project:** `npm run lint`
- **Lint specific files:** `npm run lint -- src/features/items/**/*.ts`
- **Lint with auto-fix:** `npm run lint -- --fix`
- Uses Next.js ESLint config (core-web-vitals + TypeScript)

### Build & Development
- **Dev server:** `npm run dev` (http://localhost:3000)
- **Production build:** `npm run build`
- **Production start:** `npm start`

### Database (Prisma)
- **Generate client:** `npx prisma generate` (run after schema changes)
- **Create migration:** `npx prisma migrate dev --name <migration_name>`
- **Apply migrations:** `npx prisma migrate deploy` (production)
- **Reset database:** `npx prisma migrate reset` (development only)
- **Open Studio:** `npx prisma studio`

### Testing
- **Framework:** Vitest with jsdom environment
- **Config:** `vitest.config.ts`
- **Test location:** `src/modules/<domain>/__tests__/`
- **Run all tests:** `npm test` or `npx vitest run`
- **Run single test:** `npx vitest run path/to/file.test.ts`
- **Watch mode:** `npm run test:watch` or `npx vitest`
- **Coverage:** `npm run test:coverage`
- **Integration tests:** Test files can conditionally skip if `DATABASE_URL` not set

## Code Style & Conventions

### Formatting
- **Semicolons:** Required (enforced by ESLint)
- **Quotes:** Double quotes for strings, single quotes for JSX attributes
- **Indentation:** 2 spaces (no tabs)
- **Line length:** Soft limit at 100 characters

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

## Environment Variables

**Required variables** (in `.env`):
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — Session encryption key (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` — App URL (e.g., `http://localhost:3000` for dev)

**Optional variables:**
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth (if not set, credential auth only)
- `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` — Set to `"true"` to show Google sign-in button

**Validation:** Environment variables are validated at startup via `src/lib/validate-env.ts`. Missing critical vars will throw errors with helpful messages.

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
