import { MovementType as PrismaMovementType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  type CreateMovementInput,
  type ListMovementsResponse,
  type MovementDTO,
  MovementType,
} from "@/features/movements/types";
import { validateItemForMovement } from "@/features/items/server";
import { validateLocationForMovement } from "@/features/locations/server";

type CreateMovementRecord = {
  id: string;
  type: PrismaMovementType;
  quantity: Prisma.Decimal;
  reason: string | null;
  createdAt: Date;
};

type MovementListRecord = {
  id: string;
  type: PrismaMovementType;
  quantity: Prisma.Decimal;
  reason: string | null;
  createdAt: Date;
  item: {
    id: string;
    name: string;
    sku: string;
    unit: string;
  };
  location: {
    id: string;
    name: string;
  };
  createdBy: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

export class MovementApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MovementApiError";
    this.status = status;
  }
}

export class InsufficientStockError extends MovementApiError {
  constructor(message: string) {
    super(message, 409);
    this.name = "InsufficientStockError";
  }
}

export interface GetMovementsFilters {
  itemId?: string;
  locationId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

function ensureObject(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new MovementApiError("Invalid JSON body", 400);
  }

  return payload as Record<string, unknown>;
}

function parseMovementType(value: unknown): MovementType {
  if (value === MovementType.RECEIVE || value === MovementType.ISSUE || value === MovementType.ADJUSTMENT) {
    return value;
  }

  throw new MovementApiError("type must be RECEIVE, ISSUE, or ADJUSTMENT", 400);
}

function parseQuantity(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new MovementApiError("Quantity must be a number", 400);
  }

  return n;
}

function validateRequiredId(value: unknown, fieldLabel: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new MovementApiError(`${fieldLabel} is required`, 400);
  }

  return value;
}

function validateCreateMovementInput(payload: unknown): CreateMovementInput {
  const body = ensureObject(payload);

  const type = parseMovementType(body.type);
  const quantity = parseQuantity(body.quantity);

  if (type === MovementType.RECEIVE || type === MovementType.ISSUE) {
    if (quantity <= 0) {
      throw new MovementApiError("Quantity must be greater than zero", 400);
    }
  }

  let reason: string | null = null;
  if (type === MovementType.ADJUSTMENT) {
    const rawReason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!rawReason) {
      throw new MovementApiError("Reason is required for adjustments", 400);
    }
    reason = rawReason;
  }

  return {
    itemId: validateRequiredId(body.itemId, "itemId"),
    locationId: validateRequiredId(body.locationId, "locationId"),
    createdById: validateRequiredId(body.createdById, "createdById"),
    type,
    quantity,
    reason,
  };
}

function asMovementDto(record: CreateMovementRecord): MovementDTO {
  return {
    id: record.id,
    type: record.type as MovementType,
    quantity: record.quantity.toString(),
    reason: record.reason,
    createdAt: record.createdAt.toISOString(),
  };
}

function asMovementListDto(record: MovementListRecord): MovementDTO {
  return {
    ...asMovementDto(record),
    item: record.item,
    location: record.location,
    createdBy: record.createdBy,
  };
}

function sanitizePaginationNumber(value: number | undefined, fallback: number, min: number, max: number) {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(value)));
}

export async function getMovements(orgId: string, filters: GetMovementsFilters = {}): Promise<ListMovementsResponse> {
  const page = sanitizePaginationNumber(filters.page, 1, 1, Number.MAX_SAFE_INTEGER);
  const limit = sanitizePaginationNumber(filters.limit, 50, 1, 100);
  const skip = (page - 1) * limit;

  const where: Prisma.MovementWhereInput = {
    orgId,
    ...(filters.itemId ? { itemId: filters.itemId } : {}),
    ...(filters.locationId ? { locationId: filters.locationId } : {}),
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };

  const [movements, total] = await Promise.all([
    prisma.movement.findMany({
      where,
      select: {
        id: true,
        type: true,
        quantity: true,
        reason: true,
        createdAt: true,
        item: { select: { id: true, name: true, sku: true, unit: true } },
        location: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.movement.count({ where }),
  ]);

  return {
    movements: movements.map(asMovementListDto),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function createMovement(orgId: string, payload: unknown): Promise<MovementDTO> {
  const input = validateCreateMovementInput(payload);

  // Use items feature service for validation instead of direct Prisma query
  const itemValidation = await validateItemForMovement(orgId, input.itemId);
  if (!itemValidation.valid) {
    throw new MovementApiError(itemValidation.reason, itemValidation.reason === "Item not found" ? 404 : 400);
  }

  // Use locations feature service for validation instead of direct Prisma query
  const locationValidation = await validateLocationForMovement(orgId, input.locationId);
  if (!locationValidation.valid) {
    throw new MovementApiError(locationValidation.reason, 404);
  }

  const movement = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT id FROM "CurrentStock"
      WHERE "orgId" = ${orgId}
        AND "itemId" = ${input.itemId}
        AND "locationId" = ${input.locationId}
      FOR UPDATE
    `;

    const existing = await tx.currentStock.findUnique({
      where: {
        orgId_itemId_locationId: {
          orgId,
          itemId: input.itemId,
          locationId: input.locationId,
        },
      },
      select: { quantity: true },
    });

    const currentQty = existing ? Number(existing.quantity) : 0;

    let newQty: number;
    if (input.type === MovementType.RECEIVE) {
      newQty = currentQty + input.quantity;
    } else if (input.type === MovementType.ISSUE) {
      newQty = currentQty - input.quantity;
    } else {
      newQty = currentQty + input.quantity;
    }

    if (newQty < 0) {
      throw new InsufficientStockError(
        input.type === MovementType.ISSUE
          ? "Insufficient stock — cannot issue more than available quantity"
          : "Insufficient stock — adjustment would produce negative inventory"
      );
    }

    const createdMovement = await tx.movement.create({
      data: {
        orgId,
        itemId: input.itemId,
        locationId: input.locationId,
        createdById: input.createdById,
        type: input.type,
        quantity: Math.abs(input.quantity),
        reason: input.reason,
      },
      select: {
        id: true,
        type: true,
        quantity: true,
        reason: true,
        createdAt: true,
      },
    });

    await tx.currentStock.upsert({
      where: {
        orgId_itemId_locationId: {
          orgId,
          itemId: input.itemId,
          locationId: input.locationId,
        },
      },
      create: {
        orgId,
        itemId: input.itemId,
        locationId: input.locationId,
        quantity: newQty,
      },
      update: { quantity: newQty },
    });

    return createdMovement;
  });

  return asMovementDto(movement);
}
