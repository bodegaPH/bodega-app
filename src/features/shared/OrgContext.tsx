"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Organization context for org-scoped pages.
 * Provides orgId and userId to deeply nested client components
 * without prop drilling.
 *
 * Use cases:
 * - Real-time collaboration features
 * - Client-side org-scoped state management
 * - Deeply nested forms that need org context
 *
 * Usage:
 * - Provider is added in app/(app)/[orgId]/layout.tsx
 * - Client components can access via useOrg() hook
 * - Server components should continue using params directly
 */
interface OrgContextValue {
  orgId: string;
  userId: string;
}

const OrgContext = createContext<OrgContextValue | null>(null);

interface OrgProviderProps {
  orgId: string;
  userId: string;
  children: ReactNode;
}

export function OrgProvider({ orgId, userId, children }: OrgProviderProps) {
  return (
    <OrgContext.Provider value={{ orgId, userId }}>
      {children}
    </OrgContext.Provider>
  );
}

/**
 * Hook to access organization context in client components.
 *
 * @throws Error if used outside OrgProvider (e.g., in non-org-scoped routes)
 *
 * @example
 * ```tsx
 * "use client";
 * function MyComponent() {
 *   const { orgId, userId } = useOrg();
 *   // ...
 * }
 * ```
 */
export function useOrg(): OrgContextValue {
  const context = useContext(OrgContext);
  
  if (!context) {
    throw new Error(
      "useOrg must be used within OrgProvider. " +
      "This hook only works in routes under app/(app)/[orgId]/"
    );
  }
  
  return context;
}
