/**
 * Movements Service - Public API for the movements module
 * Imports from items and locations modules for validation
 */
import * as repo from "./repository";
import {
  MovementApiError,
  InsufficientStockError,
  InvalidMovementExportFiltersError,
  MovementExportCapExceededError,
  MovementExportRateLimitedError,
  MovementExportServerError,
  MovementExportTimeoutError,
} from "./errors";
import { validateForMovement as validateItem } from "@/modules/items";
import { validateForMovement as validateLocation } from "@/modules/locations";
import { generateMovementCsv } from "./csv-generator";
import {
  checkDurableMovementExportRateLimit,
  checkMovementExportRateLimit,
} from "./export-rate-limiter";
import { MOVEMENT_EXPORT_SYNC_ROW_CAP, MOVEMENT_EXPORT_TIMEOUT_MS } from "./constants";
import type {
  MovementDTO,
  CreateMovementInput,
  GetMovementsFilters,
  ListMovementsResponse,
  MovementType,
  MovementExportRequest,
  MovementExportSuccess,
  MovementExportFilters,
} from "./types";
import { MovementType as MT } from "./types";

export {
  MovementApiError,
  InsufficientStockError,
  InvalidMovementExportFiltersError,
  MovementExportCapExceededError,
  MovementExportTimeoutError,
  MovementExportRateLimitedError,
  MovementExportServerError,
} from "./errors";
export { MovementType } from "./types";
export type {
  MovementDTO,
  CreateMovementInput,
  GetMovementsFilters,
  ListMovementsResponse,
  MovementExportRequest,
  MovementExportSuccess,
} from "./types";

function ensureObject(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new MovementApiError("Invalid JSON body", 400);
  }
  return payload as Record<string, unknown>;
}

function parseMovementType(value: unknown): MovementType {
  if (value === MT.RECEIVE || value === MT.ISSUE || value === MT.ADJUSTMENT) {
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

function validateRequiredId(value: unknown, fieldLabel: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new MovementApiError(`${fieldLabel} is required`, 400);
  }
  return value;
}

function validateCreateInput(payload: unknown): CreateMovementInput {
  const body = ensureObject(payload);

  const type = parseMovementType(body.type);
  const quantity = parseQuantity(body.quantity);

  if (type === MT.RECEIVE || type === MT.ISSUE) {
    if (quantity <= 0) {
      throw new MovementApiError("Quantity must be greater than zero", 400);
    }
  }

  let reason: string | null = null;
  if (type === MT.ADJUSTMENT) {
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

function sanitizePaginationNumber(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function parseOptionalDate(value: string | undefined, field: "from" | "to") {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new InvalidMovementExportFiltersError(`Invalid ${field} date filter`);
  }

  return parsed;
}

async function validateExportFilters(orgId: string, filters: MovementExportFilters | undefined) {
  const parsed = {
    itemId: filters?.itemId,
    locationId: filters?.locationId,
    from: parseOptionalDate(filters?.from, "from"),
    to: parseOptionalDate(filters?.to, "to"),
  };

  if (parsed.from && parsed.to && parsed.from > parsed.to) {
    throw new InvalidMovementExportFiltersError("Invalid date range: from must be before or equal to to");
  }

  if (parsed.itemId) {
    const itemValidation = await validateItem(orgId, parsed.itemId);
    if (!itemValidation.valid) {
      throw new InvalidMovementExportFiltersError(itemValidation.reason);
    }
  }

  if (parsed.locationId) {
    const locationValidation = await validateLocation(orgId, parsed.locationId);
    if (!locationValidation.valid) {
      throw new InvalidMovementExportFiltersError(locationValidation.reason);
    }
  }

  return parsed;
}

function createExportFilename(orgId: string, now: Date) {
  const date = now.toISOString().split("T")[0];
  return `movement-ledger-${orgId}-${date}.csv`;
}

async function runWithTimeout<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const controller = new AbortController();

  try {
    return await Promise.race([
      operation(controller.signal),
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => {
          // Prisma queries are not reliably cancellable once dispatched in this code path.
          // Abort is still used to stop downstream work and support future cancellable operations.
          controller.abort();
          reject(new MovementExportTimeoutError());
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function getMovements(
  orgId: string,
  filters: GetMovementsFilters = {},
): Promise<ListMovementsResponse> {
  const page = sanitizePaginationNumber(filters.page, 1, 1, 10000);
  const limit = sanitizePaginationNumber(filters.limit, 50, 1, 100);

  const result = await repo.listMovements(orgId, { ...filters, page, limit });

  const movements: MovementDTO[] = result.movements.map((m) => ({
    id: m.id,
    type: m.type as MovementType,
    quantity: m.quantity.toString(),
    reason: m.reason,
    createdAt: m.createdAt.toISOString(),
    item: m.item,
    location: m.location,
    createdBy: m.createdBy,
  }));

  return {
    movements,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit),
    },
  };
}

export async function createMovement(orgId: string, payload: unknown): Promise<MovementDTO> {
  const input = validateCreateInput(payload);

  // Validate via items module
  const itemValidation = await validateItem(orgId, input.itemId);
  if (!itemValidation.valid) {
    throw new MovementApiError(itemValidation.reason, itemValidation.reason === "Item not found" ? 404 : 400);
  }

  // Validate via locations module
  const locationValidation = await validateLocation(orgId, input.locationId);
  if (!locationValidation.valid) {
    throw new MovementApiError(locationValidation.reason, 404);
  }

  // Calculate delta
  const delta = (() => {
    switch (input.type) {
      case MT.ISSUE:
        return -Math.abs(input.quantity);
      case MT.RECEIVE:
        return Math.abs(input.quantity);
      case MT.ADJUSTMENT:
        return input.quantity;
    }
  })();

  try {
    const { movement } = await repo.createMovementWithStockUpdate(orgId, input, delta);

    return {
      id: movement.id,
      type: movement.type as MovementType,
      quantity: movement.quantity.toString(),
      reason: movement.reason,
      createdAt: movement.createdAt.toISOString(),
    };
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_STOCK") {
      throw new InsufficientStockError(
        input.type === MT.ISSUE
          ? "Insufficient stock — cannot issue more than available"
          : "Adjustment would produce negative inventory",
      );
    }
    throw err;
  }
}

export async function exportMovementsCsv(
  orgId: string,
  userId: string,
  payload: MovementExportRequest,
): Promise<MovementExportSuccess> {
  try {
    const mode = payload.mode;
    if (mode !== "filtered" && mode !== "all") {
      throw new InvalidMovementExportFiltersError("Invalid export mode");
    }

    if (mode === "all" && payload.confirmedAll !== true) {
      throw new InvalidMovementExportFiltersError("Broad export requires explicit confirmation");
    }

    const rateLimitResult = checkMovementExportRateLimit(orgId, userId);
    if (!rateLimitResult.allowed) {
      throw new MovementExportRateLimitedError(rateLimitResult.retryAfterSeconds);
    }

    const durableRateLimitResult = await checkDurableMovementExportRateLimit(orgId, userId);
    if (!durableRateLimitResult.allowed) {
      throw new MovementExportRateLimitedError(durableRateLimitResult.retryAfterSeconds);
    }

    const filters = await validateExportFilters(orgId, payload.filters);

    const matchingRows = await repo.countMovementsForExport(orgId, mode === "all" ? {} : filters);
    if (matchingRows > MOVEMENT_EXPORT_SYNC_ROW_CAP) {
      throw new MovementExportCapExceededError();
    }

    const movements = await runWithTimeout(
      async (signal) => {
        if (signal.aborted) {
          throw new MovementExportTimeoutError();
        }

        return repo.listMovementsForExport(
          orgId,
          mode === "all" ? {} : filters,
          MOVEMENT_EXPORT_SYNC_ROW_CAP + 1,
        );
      },
      MOVEMENT_EXPORT_TIMEOUT_MS,
    );

    if (movements.length > MOVEMENT_EXPORT_SYNC_ROW_CAP) {
      throw new MovementExportCapExceededError();
    }

    const content = generateMovementCsv(
      movements.map((m) => ({
        movementId: m.id,
        type: m.type as MovementType,
        quantity: m.quantity.toString(),
        unit: m.item?.unit ?? "",
        itemName: m.item?.name ?? "",
        sku: m.item?.sku ?? "",
        location: m.location?.name ?? "",
        reason: m.reason ?? "",
        createdByName: m.createdBy?.name ?? "",
        createdByEmail: m.createdBy?.email ?? "",
        createdAt: m.createdAt,
      })),
    );

    const generatedAt = new Date();

    return {
      filename: createExportFilename(orgId, generatedAt),
      content,
      rowCount: movements.length,
      generatedAt: generatedAt.toISOString(),
    };
  } catch (error) {
    if (
      error instanceof InvalidMovementExportFiltersError ||
      error instanceof MovementExportCapExceededError ||
      error instanceof MovementExportTimeoutError ||
      error instanceof MovementExportRateLimitedError
    ) {
      throw error;
    }

    if (error instanceof MovementApiError) {
      throw error;
    }

    throw new MovementExportServerError();
  }
}

/**
 * Get count of movements in organization.
 * Cross-module service function for aggregation.
 */
export async function getDataCount(orgId: string): Promise<number> {
  return repo.countMovements(orgId);
}
