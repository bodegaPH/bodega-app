import type { ItemReference } from "@/features/shared/types";

/**
 * Full item DTO returned from API endpoints
 */
export interface ItemDTO {
  id: string;
  name: string;
  sku: string;
  unit: string;
  category: string | null;
  isActive: boolean;
  lowStockThreshold: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Re-export shared reference type for convenience
 */
export type { ItemReference };

/**
 * Result of validating an item for use in movements
 */
export type ItemValidationResult =
  | { valid: true; item: ItemReference }
  | { valid: false; reason: string };
