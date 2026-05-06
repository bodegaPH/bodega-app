<div align="center">
  <img src="public/bodega-logo-white.svg" alt="Bodega Logo" width="200" />

  <br />
  <br />

# Bodega Platform

  <p>
    <strong>A tactical, brutalist-inspired multi-tenant inventory management system.</strong>
  </p>

  <!-- Badges -->
  <p>
    <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
    <img src="https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  </p>

</div>

---

## 🪐 Overview

Bodega is an enterprise-grade, highly structured inventory and supply chain tracking application. Built around strict role-based access control and immutable transaction logs, it is designed for precision, auditability, and speed.

## 🛠️ Architecture & Core Concepts

Bodega strictly enforces a clean, layered architecture separating business logic from presentation:

- **Modules Layer (`src/modules`)**: Contains the core domain logic, independent of Next.js features. Includes strictly separated Repository and Service layers. Cross-module database queries are forbidden.
- **Features Layer (`src/features`)**: Contains the presentation logic, React components, hooks, and Next.js server actions.

### Key Principles

- **Multi-Tenancy**: Data is rigidly scoped by `orgId` across the entire database schema to prevent leakage.
- **Immutable Ledger**: Inventory levels (`CurrentStock`) are calculated via transactions, but the `Movement` rows themselves are an immutable append-only ledger. They cannot be updated or deleted.
- **Idempotency**: Critical operations (like creating movements or exports) enforce idempotency to prevent duplicate operations during network failures.
- **Role-Based Security**: Differentiated access between `PLATFORM_ADMIN` (global oversight) and `ORG_ADMIN`/`USER` (tenant-scoped).

---

## 🚀 Tech Stack

- **[Next.js](https://nextjs.org/)**: The core React framework for production, providing SSR, API routes, and App Router organization.
- **[Prisma](https://www.prisma.io/)**: Type-safe ORM for database modeling and automated migrations.
- **[PostgreSQL](https://www.postgresql.org/)**: The relational foundation for our multi-tenant data structures.
- **[NextAuth.js](https://next-auth.js.org/)**: Secure authentication handling with multi-role support.
- **[Tailwind CSS](https://tailwindcss.com/)**: Utility-first CSS configured for our monochromatic, brutalist identity.
- **[TypeScript](https://www.typescriptlang.org/)**: Ensures robust, type-checked code across the entire stack.

---

## 📂 Project Structure

```text
├── prisma/
│   ├── schema.prisma       # Database schema definition
│   └── migrations/         # SQL migration history
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── (app)/          # Authenticated routes group
│   │   ├── admin/          # Platform Admin dashboard
│   │   ├── api/            # Route handlers (REST endpoints)
│   │   └── auth/           # Login/authentication pages
│   ├── components/         # Global shared UI components
│   │   ├── layout/         # AppHeader, Sidebars
│   │   └── ui/             # Reusable base primitives
│   ├── features/           # Feature-scoped presentation
│   │   └── [domain]/       # E.g., `movements`, `items`, `admin`
│   │       ├── components/ # React UI components
│   │       ├── actions/    # Next.js server actions ("use server")
│   │       └── server.ts   # Re-exports from `src/modules`
│   ├── lib/                # Cross-cutting utilities (auth, errors, formatters)
│   └── modules/            # Core business domain logic
│       └── [domain]/       # E.g., `movements`, `inventory`, `invitations`
│           ├── repository.ts # Direct Prisma queries (Private)
│           ├── service.ts    # Business logic & validation (Public API)
│           └── types.ts      # DTOs and internal types
└── .env.example            # Environment variables template
```

---

## 🛠️ Development

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18.17.0 or higher)
- [PostgreSQL](https://www.postgresql.org/) database instance

### Quick Start

1. **Clone the repository:**

   ```bash
   git clone https://github.com/mamaw-coders/bodega-app.git
   cd bodega-app
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Environment Setup:**
   Copy `.env.example` to `.env` and configure your `DATABASE_URL` and `NEXTAUTH_SECRET`.

4. **Database Setup:**

   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

---

## 📜 Legal & License

© 2026 Bodega Logistics. All Rights Reserved. Not for public distribution.
