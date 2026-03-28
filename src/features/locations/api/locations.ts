import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type {
  CreateLocationInput,
  LocationDTO,
  LocationReference,
  LocationValidationResult,
  UpdateLocationInput,
} from "@/features/locations/types";

const locationSelect = {
  id: true,
  name: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class LocationApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "LocationApiError";
    this.status = status;
  }
}

function isUniqueError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function validateName(name: unknown) {
  if (typeof name !== "string") {
    throw new LocationApiError("Location name is required", 400);
  }

  const trimmed = name.trim();
  if (!trimmed) {
    throw new LocationApiError("Location name is required", 400);
  }

  if (trimmed.length > 100) {
    throw new LocationApiError("Location name must be 100 characters or fewer", 400);
  }

  return trimmed;
}

function ensureObject(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new LocationApiError("Invalid JSON body", 400);
  }

  return payload as Record<string, unknown>;
}

async function ensureLocationExists(orgId: string, id: string) {
  const location = await prisma.location.findFirst({
    where: { id, orgId },
    select: { id: true, name: true, isDefault: true },
  });

  if (!location) {
    throw new LocationApiError("Location not found", 404);
  }

  return location;
}

export async function getLocations(orgId: string): Promise<LocationDTO[]> {
  return prisma.location.findMany({
    where: { orgId },
    select: locationSelect,
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function createLocation(orgId: string, payload: CreateLocationInput): Promise<LocationDTO> {
  const body = ensureObject(payload);

  const name = validateName(body.name);
  const desiredDefault = Boolean(body.isDefault);

  const existingByName = await prisma.location.findFirst({
    where: {
      orgId,
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (existingByName) {
    throw new LocationApiError("A location with this name already exists", 409);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const currentDefault = await tx.location.findFirst({
        where: { orgId, isDefault: true },
        select: { id: true },
      });

      const makeDefault = desiredDefault || !currentDefault;

      if (makeDefault) {
        await tx.location.updateMany({
          where: { orgId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.location.create({
        data: {
          orgId,
          name,
          isDefault: makeDefault,
        },
        select: locationSelect,
      });
    });
  } catch (error) {
    if (isUniqueError(error)) {
      throw new LocationApiError("A location with this name already exists", 409);
    }

    throw error;
  }
}

export async function updateLocation(
  orgId: string,
  id: string,
  payload: UpdateLocationInput
): Promise<LocationDTO> {
  const body = ensureObject(payload);

  const hasName = Object.prototype.hasOwnProperty.call(body, "name");
  const hasIsDefault = Object.prototype.hasOwnProperty.call(body, "isDefault");

  if (!hasName && !hasIsDefault) {
    throw new LocationApiError("No valid fields provided for update", 400);
  }

  const location = await ensureLocationExists(orgId, id);

  let nextName: string | undefined;
  if (hasName) {
    nextName = validateName(body.name);

    const duplicate = await prisma.location.findFirst({
      where: {
        orgId,
        id: { not: id },
        name: { equals: nextName, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new LocationApiError("A location with this name already exists", 409);
    }
  }

  if (hasIsDefault && typeof body.isDefault !== "boolean") {
    throw new LocationApiError("isDefault must be a boolean", 400);
  }

  if (body.isDefault === false && location.isDefault) {
    throw new LocationApiError("A default location is required", 409);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      if (body.isDefault === true) {
        await tx.location.updateMany({
          where: { orgId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.location.update({
        where: { id },
        data: {
          ...(nextName !== undefined ? { name: nextName } : {}),
          ...(body.isDefault === true ? { isDefault: true } : {}),
        },
        select: locationSelect,
      });
    });
  } catch (error) {
    if (isUniqueError(error)) {
      throw new LocationApiError("A location with this name already exists", 409);
    }

    throw error;
  }
}

export async function deleteLocation(orgId: string, id: string) {
  const location = await ensureLocationExists(orgId, id);

  if (location.isDefault) {
    throw new LocationApiError("Default location cannot be deleted", 409);
  }

  const stockCount = await prisma.currentStock.count({
    where: {
      orgId,
      locationId: id,
    },
  });

  if (stockCount > 0) {
    throw new LocationApiError("Location cannot be deleted because stock exists", 409);
  }

  await prisma.location.delete({ where: { id } });
}

/**
 * Validate a location exists for use in movements.
 * This is the cross-feature service function - movements should call this
 * instead of querying prisma.location directly.
 */
export async function validateLocationForMovement(
  orgId: string,
  locationId: string
): Promise<LocationValidationResult> {
  const location = await prisma.location.findFirst({
    where: { id: locationId, orgId },
    select: { id: true, name: true },
  });

  if (!location) {
    return { valid: false, reason: "Location not found" };
  }

  const reference: LocationReference = {
    id: location.id,
    name: location.name,
  };

  return { valid: true, location: reference };
}

/**
 * Get locations for dropdown/select components (minimal fields).
 * This is a cross-feature service function for inventory/movements forms.
 */
export async function getLocationsForSelect(
  orgId: string
): Promise<(LocationReference & { isDefault: boolean })[]> {
  const locations = await prisma.location.findMany({
    where: { orgId },
    select: { id: true, name: true, isDefault: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return locations;
}
