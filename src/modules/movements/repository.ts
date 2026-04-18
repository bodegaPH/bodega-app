/**
 * Movements Repository - Prisma data access layer
 * INTERNAL: Only import from service.ts within this module
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { MOVEMENT_EXPORT_RATE_LIMITS } from "./constants";
import type { CreateMovementInput, GetMovementsFilters } from "./types";

type MovementExportQueryFilters = {
  itemId?: string;
  locationId?: string;
  from?: Date;
  to?: Date;
};

function buildMovementWhere(orgId: string, filters: MovementExportQueryFilters): Prisma.MovementWhereInput {
  return {
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
}

export async function listMovements(orgId: string, filters: GetMovementsFilters) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;
  const skip = (page - 1) * limit;

  const where = buildMovementWhere(orgId, filters);

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

  return { movements, total, page, limit };
}

export async function createMovementWithStockUpdate(
  orgId: string,
  input: CreateMovementInput,
  delta: number
) {
  return prisma.$transaction(async (tx) => {
    // 1. Acquire row lock and get current quantity
    const [currentStock] = await tx.$queryRaw<[{ quantity: number } | undefined]>`
      SELECT quantity::float as quantity
      FROM "CurrentStock"
      WHERE "orgId" = ${orgId}
        AND "itemId" = ${input.itemId}
        AND "locationId" = ${input.locationId}
      FOR UPDATE
    `;

    const currentQty = currentStock?.quantity ?? 0;
    const newQty = currentQty + delta;

    // 2. Validate BEFORE updating
    if (newQty < 0) {
      throw new Error("INSUFFICIENT_STOCK");
    }

    // 3. Upsert with validated quantity
    await tx.$executeRaw`
      INSERT INTO "CurrentStock" ("id", "orgId", "itemId", "locationId", "quantity", "updatedAt")
      VALUES (gen_random_uuid(), ${orgId}, ${input.itemId}, ${input.locationId}, ${newQty}, NOW())
      ON CONFLICT ("orgId", "itemId", "locationId")
      DO UPDATE SET 
        quantity = ${newQty},
        "updatedAt" = NOW()
    `;

    // 4. Insert immutable movement
    const movement = await tx.movement.create({
      data: {
        orgId,
        itemId: input.itemId,
        locationId: input.locationId,
        createdById: input.createdById,
        type: input.type,
        quantity: Math.abs(input.quantity),
        reason: input.reason,
      },
      select: { id: true, type: true, quantity: true, reason: true, createdAt: true },
    });

    return { movement, newStockQuantity: newQty };
  });
}

export async function countMovements(orgId: string): Promise<number> {
  return prisma.movement.count({ where: { orgId } });
}

export async function listMovementsForExport(
  orgId: string,
  filters: MovementExportQueryFilters,
  take: number,
) {
  return prisma.movement.findMany({
    where: buildMovementWhere(orgId, filters),
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
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
  });
}

export async function countMovementsForExport(orgId: string, filters: MovementExportQueryFilters) {
  return prisma.movement.count({
    where: buildMovementWhere(orgId, filters),
  });
}

const MOVEMENT_EXPORT_THROTTLE_PRUNE_INTERVAL_MS = 60_000;
const MOVEMENT_EXPORT_THROTTLE_RETENTION_MS =
  Math.max(MOVEMENT_EXPORT_RATE_LIMITS.perUserPerOrg.windowMs, MOVEMENT_EXPORT_RATE_LIMITS.perOrg.windowMs) *
  10;
let lastMovementExportThrottlePruneAt = 0;

function advisoryLockKey(input: string) {
  return `movement_export_throttle:${input}`;
}

function computeRetryAfterSeconds(windowMs: number, oldestCreatedAt: Date | null, now: Date) {
  if (!oldestCreatedAt) {
    return Math.ceil(windowMs / 1000);
  }

  const resetAtMs = oldestCreatedAt.getTime() + windowMs;
  return Math.max(1, Math.ceil((resetAtMs - now.getTime()) / 1000));
}

export async function checkAndRecordMovementExportThrottleEventAtomic(orgId: string, userId: string) {
  const now = new Date();
  const perUserWindowStart = new Date(
    now.getTime() - MOVEMENT_EXPORT_RATE_LIMITS.perUserPerOrg.windowMs,
  );
  const perOrgWindowStart = new Date(now.getTime() - MOVEMENT_EXPORT_RATE_LIMITS.perOrg.windowMs);

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT pg_advisory_xact_lock(hashtext(${advisoryLockKey(`org:${orgId}`)}));
    `;
    await tx.$queryRaw`
      SELECT pg_advisory_xact_lock(hashtext(${advisoryLockKey(`org:${orgId}:user:${userId}`)}));
    `;

    if (now.getTime() - lastMovementExportThrottlePruneAt >= MOVEMENT_EXPORT_THROTTLE_PRUNE_INTERVAL_MS) {
      lastMovementExportThrottlePruneAt = now.getTime();
      const pruneBefore = new Date(now.getTime() - MOVEMENT_EXPORT_THROTTLE_RETENTION_MS);
      await tx.movementExportThrottleEvent.deleteMany({
        where: {
          createdAt: { lt: pruneBefore },
        },
      });
    }

    const [userAgg, orgAgg] = await Promise.all([
      tx.movementExportThrottleEvent.aggregate({
        where: {
          orgId,
          userId,
          createdAt: { gte: perUserWindowStart },
        },
        _count: { _all: true },
        _min: { createdAt: true },
      }),
      tx.movementExportThrottleEvent.aggregate({
        where: {
          orgId,
          createdAt: { gte: perOrgWindowStart },
        },
        _count: { _all: true },
        _min: { createdAt: true },
      }),
    ]);

    const userCount = userAgg._count._all;
    if (userCount >= MOVEMENT_EXPORT_RATE_LIMITS.perUserPerOrg.maxRequests) {
      return {
        allowed: false as const,
        retryAfterSeconds: computeRetryAfterSeconds(
          MOVEMENT_EXPORT_RATE_LIMITS.perUserPerOrg.windowMs,
          userAgg._min.createdAt,
          now,
        ),
      };
    }

    const orgCount = orgAgg._count._all;
    if (orgCount >= MOVEMENT_EXPORT_RATE_LIMITS.perOrg.maxRequests) {
      return {
        allowed: false as const,
        retryAfterSeconds: computeRetryAfterSeconds(
          MOVEMENT_EXPORT_RATE_LIMITS.perOrg.windowMs,
          orgAgg._min.createdAt,
          now,
        ),
      };
    }

    await tx.movementExportThrottleEvent.create({
      data: {
        orgId,
        userId,
      },
    });

    return {
      allowed: true as const,
      retryAfterSeconds: 0,
    };
  });
}

export async function countMovementExportThrottleEventsByUser(
  orgId: string,
  userId: string,
  since: Date,
) {
  return prisma.movementExportThrottleEvent.count({
    where: {
      orgId,
      userId,
      createdAt: { gte: since },
    },
  });
}

export async function countMovementExportThrottleEventsByOrg(orgId: string, since: Date) {
  return prisma.movementExportThrottleEvent.count({
    where: {
      orgId,
      createdAt: { gte: since },
    },
  });
}

export async function recordMovementExportThrottleEvent(orgId: string, userId: string) {
  return prisma.movementExportThrottleEvent.create({
    data: {
      orgId,
      userId,
    },
  });
}
