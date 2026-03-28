import type { LocationReference } from "@/features/shared/types";

export interface LocationDTO {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Re-export shared reference type for convenience
 */
export type { LocationReference };

/**
 * Result of validating a location for use in movements
 */
export type LocationValidationResult =
  | { valid: true; location: LocationReference }
  | { valid: false; reason: string };

export interface CreateLocationInput {
  name?: unknown;
  isDefault?: unknown;
}

export interface UpdateLocationInput {
  name?: unknown;
  isDefault?: unknown;
}
