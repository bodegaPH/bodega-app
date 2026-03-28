/**
 * Shared types used across multiple feature modules.
 *
 * Guidelines:
 * - Only add types here if they are imported by 2+ features
 * - Keep DTOs minimal - only shared fields needed for cross-feature communication
 * - Feature-specific types should remain in their own types.ts files
 */

/**
 * Minimal item reference for cross-feature use (e.g., movements, inventory)
 */
export interface ItemReference {
  id: string;
  name: string;
  sku: string;
  unit: string;
}

/**
 * Minimal location reference for cross-feature use (e.g., movements, inventory)
 */
export interface LocationReference {
  id: string;
  name: string;
}

/**
 * Minimal user reference for audit trails across features
 */
export interface UserReference {
  id: string;
  name: string | null;
  email: string | null;
}

/**
 * Standard pagination structure used across list endpoints
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Discriminated union for server action results
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Discriminated union for void server action results
 */
export type ActionVoidResult =
  | { success: true }
  | { success: false; error: string };
