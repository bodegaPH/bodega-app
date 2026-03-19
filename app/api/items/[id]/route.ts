import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAuthWithOrg } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function isUniqueError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function validateRequiredText(value: unknown, fieldLabel: string, maxLength: number) {
  if (typeof value !== "string") {
    return { ok: false as const, error: `${fieldLabel} is required` };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false as const, error: `${fieldLabel} is required` };
  }

  if (trimmed.length > maxLength) {
    return {
      ok: false as const,
      error: `${fieldLabel} must be ${maxLength} characters or fewer`,
    };
  }

  return { ok: true as const, value: trimmed };
}

function validateOptionalText(value: unknown, fieldLabel: string, maxLength: number) {
  if (value === undefined || value === null || value === "") {
    return { ok: true as const, value: null as string | null };
  }

  if (typeof value !== "string") {
    return { ok: false as const, error: `${fieldLabel} must be a string` };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true as const, value: null as string | null };
  }

  if (trimmed.length > maxLength) {
    return {
      ok: false as const,
      error: `${fieldLabel} must be ${maxLength} characters or fewer`,
    };
  }

  return { ok: true as const, value: trimmed };
}

function validateOptionalPositiveDecimal(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return { ok: true as const, value: null as string | null };
  }

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return {
      ok: false as const,
      error: "Low stock threshold must be a positive number",
    };
  }

  return { ok: true as const, value: numberValue.toFixed(2) };
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAuthWithOrg();
  if (!auth.success) {
    return auth.response;
  }

  const { id } = await context.params;

  let body: {
    name?: unknown;
    sku?: unknown;
    unit?: unknown;
    category?: unknown;
    lowStockThreshold?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (Object.prototype.hasOwnProperty.call(body, "sku")) {
    return NextResponse.json(
      { error: "SKU cannot be edited after item creation" },
      { status: 400 }
    );
  }

  const hasName = Object.prototype.hasOwnProperty.call(body, "name");
  const hasUnit = Object.prototype.hasOwnProperty.call(body, "unit");
  const hasCategory = Object.prototype.hasOwnProperty.call(body, "category");
  const hasThreshold = Object.prototype.hasOwnProperty.call(body, "lowStockThreshold");

  if (!hasName && !hasUnit && !hasCategory && !hasThreshold) {
    return NextResponse.json(
      { error: "No valid fields provided for update" },
      { status: 400 }
    );
  }

  const existing = await prisma.item.findFirst({
    where: { id, orgId: auth.orgId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const updateData: {
    name?: string;
    unit?: string;
    category?: string | null;
    lowStockThreshold?: string | null;
  } = {};

  if (hasName) {
    const nameResult = validateRequiredText(body.name, "Name", 120);
    if (!nameResult.ok) {
      return NextResponse.json({ error: nameResult.error }, { status: 400 });
    }
    updateData.name = nameResult.value;
  }

  if (hasUnit) {
    const unitResult = validateRequiredText(body.unit, "Unit", 32);
    if (!unitResult.ok) {
      return NextResponse.json({ error: unitResult.error }, { status: 400 });
    }
    updateData.unit = unitResult.value;
  }

  if (hasCategory) {
    const categoryResult = validateOptionalText(body.category, "Category", 80);
    if (!categoryResult.ok) {
      return NextResponse.json({ error: categoryResult.error }, { status: 400 });
    }
    updateData.category = categoryResult.value;
  }

  if (hasThreshold) {
    const thresholdResult = validateOptionalPositiveDecimal(body.lowStockThreshold);
    if (!thresholdResult.ok) {
      return NextResponse.json({ error: thresholdResult.error }, { status: 400 });
    }
    updateData.lowStockThreshold = thresholdResult.value;
  }

  try {
    const item = await prisma.item.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        category: true,
        isActive: true,
        lowStockThreshold: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      item: {
        ...item,
        lowStockThreshold: item.lowStockThreshold?.toString() ?? null,
      },
    });
  } catch (error) {
    if (isUniqueError(error)) {
      return NextResponse.json(
        { error: "An item with this SKU already exists" },
        { status: 409 }
      );
    }

    throw error;
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAuthWithOrg();
  if (!auth.success) {
    return auth.response;
  }

  const { id } = await context.params;

  const existing = await prisma.item.findFirst({
    where: { id, orgId: auth.orgId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  await prisma.item.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
