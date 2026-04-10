import type { SystemRole } from "@prisma/client";

export type CompatibleSystemRole = SystemRole | "PLATFORM_ADMIN";

export function normalizeSystemRole(
  role: SystemRole | "PLATFORM_ADMIN" | null | undefined,
): CompatibleSystemRole {
  if (role === "SYSTEM_ADMIN" || role === "PLATFORM_ADMIN") {
    return "PLATFORM_ADMIN";
  }

  return "USER";
}

export function isPlatformAdminRole(
  role: SystemRole | "PLATFORM_ADMIN" | null | undefined,
): boolean {
  return normalizeSystemRole(role) === "PLATFORM_ADMIN";
}

interface LegacyRoleCompatibilityExitCriteria {
  hasLegacyRoleObservations: boolean;
  ttlBufferElapsed: boolean;
}

export function canRemoveLegacyRoleCompatibility({
  hasLegacyRoleObservations,
  ttlBufferElapsed,
}: LegacyRoleCompatibilityExitCriteria): boolean {
  return !hasLegacyRoleObservations && ttlBufferElapsed;
}
