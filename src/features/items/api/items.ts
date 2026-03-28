import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { ItemValidationResult, ItemReference } from "@/features/items/types";

type ItemRecord = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  category: string | null;
  isActive: boolean;
  lowStockThreshold: Prisma.Decimal | null;
  createdAt: Date;
  updatedAt: Date;
};

const itemSelect = {
  id: true,
  name: true,
  sku: true,
  unit: true,
  category: true,
  isActive: true,
  lowStockThreshold: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class ItemApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ItemApiError";
    this.status = status;
  }
}

function isUniqueError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function validateRequiredText(value: unknown, fieldLabel: string, maxLength: number) {
  if (typeof value !== "string") {
    throw new ItemApiError(`${fieldLabel} is required`, 400);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ItemApiError(`${fieldLabel} is required`, 400);
  }

  if (trimmed.length > maxLength) {
    throw new ItemApiError(`${fieldLabel} must be ${maxLength} characters or fewer`, 400);
  }

  return trimmed;
}

function validateOptionalText(value: unknown, fieldLabel: string, maxLength: number) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new ItemApiError(`${fieldLabel} must be a string`, 400);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.length > maxLength) {
    throw new ItemApiError(`${fieldLabel} must be ${maxLength} characters or fewer`, 400);
  }

  return trimmed;
}

function validateOptionalPositiveDecimal(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new ItemApiError("Low stock threshold must be a positive number", 400);
  }

  return numberValue.toFixed(2);
}

function asItemResponse(item: ItemRecord) {
  return {
    ...item,
    lowStockThreshold: item.lowStockThreshold?.toString() ?? null,
  };
}

function ensureObject(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ItemApiError("Invalid JSON body", 400);
  }

  return payload as Record<string, unknown>;
}

async function ensureItemExists(orgId: string, id: string) {
  const existing = await prisma.item.findFirst({
    where: { id, orgId },
    select: { id: true },
  });

  if (!existing) {
    throw new ItemApiError("Item not found", 404);
  }
}

export async function getItems(orgId: string, options?: { includeInactive?: boolean }) {
  const includeInactive = options?.includeInactive ?? false;

  const items = await prisma.item.findMany({
    where: {
      orgId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    select: itemSelect,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return items.map(asItemResponse);
}

export async function createItem(orgId: string, payload: unknown) {
  const body = ensureObject(payload);

  const name = validateRequiredText(body.name, "Name", 120);
  const sku = validateRequiredText(body.sku, "SKU", 64).toUpperCase();
  const unit = validateRequiredText(body.unit, "Unit", 32);
  const category = validateOptionalText(body.category, "Category", 80);
  const lowStockThreshold = validateOptionalPositiveDecimal(body.lowStockThreshold);

  try {
    const item = await prisma.item.create({
      data: {
        orgId,
        name,
        sku,
        unit,
        category,
        lowStockThreshold,
      },
      select: itemSelect,
    });

    return asItemResponse(item);
  } catch (error) {
    if (isUniqueError(error)) {
      throw new ItemApiError("An item with this SKU already exists", 409);
    }

    throw error;
  }
}

export async function updateItem(orgId: string, id: string, payload: unknown) {
  const body = ensureObject(payload);

  if (Object.prototype.hasOwnProperty.call(body, "sku")) {
    throw new ItemApiError("SKU cannot be edited after item creation", 400);
  }

  const hasName = Object.prototype.hasOwnProperty.call(body, "name");
  const hasUnit = Object.prototype.hasOwnProperty.call(body, "unit");
  const hasCategory = Object.prototype.hasOwnProperty.call(body, "category");
  const hasThreshold = Object.prototype.hasOwnProperty.call(body, "lowStockThreshold");

  if (!hasName && !hasUnit && !hasCategory && !hasThreshold) {
    throw new ItemApiError("No valid fields provided for update", 400);
  }

  await ensureItemExists(orgId, id);

  const updateData: {
    name?: string;
    unit?: string;
    category?: string | null;
    lowStockThreshold?: string | null;
  } = {};

  if (hasName) {
    updateData.name = validateRequiredText(body.name, "Name", 120);
  }

  if (hasUnit) {
    updateData.unit = validateRequiredText(body.unit, "Unit", 32);
  }

  if (hasCategory) {
    updateData.category = validateOptionalText(body.category, "Category", 80);
  }

  if (hasThreshold) {
    updateData.lowStockThreshold = validateOptionalPositiveDecimal(body.lowStockThreshold);
  }

  try {
    const item = await prisma.item.update({
      where: { id },
      data: updateData,
      select: itemSelect,
    });

    return asItemResponse(item);
  } catch (error) {
    if (isUniqueError(error)) {
      throw new ItemApiError("An item with this SKU already exists", 409);
    }

    throw error;
  }
}

export async function deleteItem(orgId: string, id: string) {
  await ensureItemExists(orgId, id);

  await prisma.item.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function reactivateItem(orgId: string, id: string) {
  await ensureItemExists(orgId, id);

  await prisma.item.update({
    where: { id },
    data: { isActive: true },
  });
}

/**
 * Validate an item exists and is active for use in movements.
 * This is the cross-feature service function - movements should call this
 * instead of querying prisma.item directly.
 */
export async function validateItemForMovement(
  orgId: string,
  itemId: string
): Promise<ItemValidationResult> {
  const item = await prisma.item.findFirst({
    where: { id: itemId, orgId },
    select: { id: true, name: true, sku: true, unit: true, isActive: true },
  });

  if (!item) {
    return { valid: false, reason: "Item not found" };
  }

  if (!item.isActive) {
    return { valid: false, reason: "Cannot record movement for an inactive item" };
  }

  const reference: ItemReference = {
    id: item.id,
    name: item.name,
    sku: item.sku,
    unit: item.unit,
  };

  return { valid: true, item: reference };
}

/**
 * Get items for dropdown/select components (active items only, minimal fields).
 * This is a cross-feature service function for inventory/movements forms.
 */
export async function getItemsForSelect(
  orgId: string
): Promise<ItemReference[]> {
  const items = await prisma.item.findMany({
    where: { orgId, isActive: true },
    select: { id: true, name: true, sku: true, unit: true },
    orderBy: { name: "asc" },
  });

  return items;
}
