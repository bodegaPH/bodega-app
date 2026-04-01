# Bodega MVP — Software Architecture

**Status:** Aligned to PRD (Tech Stack Option A)

**Tech Stack**
- Frontend: Next.js (App Router) + TypeScript
- Backend: Next.js API routes (MVP)
- Styling: Tailwind CSS
- Database: PostgreSQL
- ORM: Prisma
- Auth: Auth.js (NextAuth v4) + Prisma adapter
- Hosting: Vercel (app) + managed Postgres (provider TBD)

---

**Technical Overview**
Bodega is a single full-stack Next.js application with an append-only inventory ledger and a derived current stock table to guarantee correctness and performance. All data is scoped to organizations. A platform-level System Admin has read-only cross-org visibility for monitoring, while organization roles control operational access.

---

**Architecture Diagram (textual)**
```
Browser
  ↓
Next.js App Router (src/app/)
  ↓
Features Layer (src/features/)
  - Components (UI)
  - Actions ("use server")
  - Hooks (client state)
  ↓
Modules Layer (src/modules/)
  - Service (business logic)
  - Repository (data access)
  - Types, Errors
  ↓
Prisma ORM
  ↓
PostgreSQL
  - Movement (ledger)
  - CurrentStock (derived)
  - Organizations, Items, Locations
```

---

**Folder Structure (textual)**
```
bodega-app/
  src/
    app/                    # Next.js App Router
      (app)/                # Protected routes (org-scoped)
        [orgId]/
          dashboard/
          inventory/
          items/
          locations/
          movements/
          settings/
      auth/                 # Public auth pages
      api/                  # API routes
      layout.tsx
      globals.css
    
    modules/                # Domain/Business Layer
      account/
      indicators/           # Dashboard alerts
      inventory/
      items/
      locations/
      movements/
      organizations/
        __tests__/          # Integration tests
        repository.ts       # Prisma queries (internal)
        service.ts          # Business logic (public API)
        types.ts            # Domain types
        errors.ts           # Domain errors
        index.ts            # Public exports
    
    features/               # Presentation Layer
      account/
      auth/
      dashboard/
      inventory/
      items/
      locations/
      movements/
      organizations/
      shared/               # Shared types and context
        actions/            # Server actions
        components/         # React components
        hooks/              # Client hooks
        server.ts           # Re-exports from modules
        index.ts            # Client-safe exports
    
    components/             # Shared UI components
      ui/                   # Primitives (Button, Input)
      layout/               # App shell (Sidebar, Header)
    
    lib/                    # Utilities
      auth.ts               # Auth configuration
      db.ts                 # Prisma client
      api-auth.ts           # API auth helpers
      validate-env.ts       # Env validation
    
    test-utils/             # Test utilities
      prisma-mock.ts
    
  prisma/
    schema.prisma
    migrations/
  
  docs/
    PRD.md
    ARCHITECTURE.md
  
  vitest.config.ts          # Test configuration
  AGENTS.md                 # Agent rules
  .env
  next.config.ts
  package.json
  tsconfig.json
```

---

**Key Technical Decisions**
- **Layered Architecture:** Clean separation between presentation (features) and business logic (modules).
- **Repository Pattern:** All Prisma queries encapsulated in module repositories, never accessed directly from features.
- **Service Layer:** Public module APIs validate inputs, enforce business rules, and orchestrate repository calls.
- **Feature/Module Split:** Features handle UI/UX and server actions; modules handle domain logic and data access.
- **Testing:** Integration tests in modules (`__tests__/`) with Vitest; tests can conditionally skip if no DB.
- Single Next.js app for UI + API to keep MVP delivery fast and consistent.
- Postgres as system of record with transactions for inventory correctness.
- Ledger-based movements with derived current stock for fast reads.
- Strict org scoping on every query to prevent cross-org leakage.
- System Admin is a global role with read-only cross-org monitoring.

---

**Layered Architecture Details**

**Modules Layer (Domain/Business Logic)**
- Location: `src/modules/<domain>/`
- Purpose: Encapsulates all business logic, validation, and data access
- Components:
  - `repository.ts` — Prisma queries (INTERNAL only, never import outside module)
  - `service.ts` — Public API with validation and business rules
  - `types.ts` — Domain types and DTOs
  - `errors.ts` — Domain-specific error classes
  - `index.ts` — Public exports barrel
  - `__tests__/` — Integration tests
- Example modules: items, locations, movements, inventory, organizations, account, indicators

**Features Layer (Presentation/UI)**
- Location: `src/features/<domain>/`
- Purpose: User-facing components, server actions, and client-side state
- Components:
  - `components/` — React components (default server, `"use client"` when needed)
  - `actions/` — Server actions with `"use server"` directive
  - `hooks/` — Client-side React hooks
  - `server.ts` — Re-exports from `@/modules/<domain>` for server components
  - `index.ts` — Client-safe exports (no Prisma imports)
  - `types.ts` — Feature-specific types (often re-exports from modules)

**Data Flow Example:**
```
Dashboard Page (src/app/(app)/[orgId]/dashboard/page.tsx)
  ↓ imports
Feature Server Export (src/features/dashboard/server.ts)
  ↓ imports
Module Service (src/modules/indicators/service.ts)
  ↓ calls
Module Repository (src/modules/indicators/repository.ts)
  ↓ queries
Prisma → PostgreSQL
```

---

**Frontend / Backend / Shared Responsibilities**

Presentation Layer (Features)
- React components (server and client)
- Server actions for form submissions
- Client hooks for interactive state
- UI/UX patterns and styling
- Re-exports module APIs via `server.ts`

Domain Layer (Modules)
- Business logic and validation
- Data access via Prisma (repository pattern)
- Domain types and error handling
- Cross-module service APIs
- Integration testing

App Router Layer (src/app/)
- Route definitions and layouts
- Auth middleware and guards
- API route handlers
- Page composition (wraps feature components)

---

**Core Data Model (Prisma)**
- User, Account, Session, VerificationToken (Auth.js)
- Organization, Membership (role per org)
- Location (single default per org, future multi-location)
- Item (SKU unique per org, soft-deactivate)
- Movement (immutable ledger: RECEIVE, ISSUE, ADJUSTMENT)
- CurrentStock (derived, unique per org/item/location)

---

**Inventory Transaction Flow**
1. Validate auth and org membership.
2. Lock current stock row for item+location.
3. Compute new quantity based on movement type.
4. Reject if new quantity < 0.
5. Insert Movement row (immutable).
6. Update CurrentStock row in same transaction.

---

**Logic Risks & Bug Prevention**
- Negative stock under concurrency: use row-level locks in the transaction.
- Duplicate submissions: require idempotency keys for movement API.
- Cross-org leakage: enforce `org_id` on all queries, plus tests.
- Deactivated items: block movements for inactive items.
- Adjustment misuse: require reason and surface in admin monitoring.

---

**Risks & Constraints**
- Prisma locking may require raw SQL for `SELECT ... FOR UPDATE`.
- Large CSV exports can exceed request timeouts.
- Auth provider configuration is a blocking dependency.
- Thresholds (low stock / large outbound) need explicit product rules.

---
