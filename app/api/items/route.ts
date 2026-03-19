import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAuthWithOrg } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

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

export async function GET(request: Request) {
  const auth = await requireAuthWithOrg();
  if (!auth.success) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get("includeInactive") === "true";

  const items = await prisma.item.findMany({
    where: {
      orgId: auth.orgId,
      ...(includeInactive ? {} : { isActive: true }),
    },
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
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({
    items: items.map((item) => ({
      ...item,
      lowStockThreshold: item.lowStockThreshold?.toString() ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthWithOrg();
  if (!auth.success) {
    return auth.response;
  }

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

  const nameResult = validateRequiredText(body.name, "Name", 120);
  if (!nameResult.ok) {
    return NextResponse.json({ error: nameResult.error }, { status: 400 });
  }

  const skuResult = validateRequiredText(body.sku, "SKU", 64);
  if (!skuResult.ok) {
    return NextResponse.json({ error: skuResult.error }, { status: 400 });
  }

  const unitResult = validateRequiredText(body.unit, "Unit", 32);
  if (!unitResult.ok) {
    return NextResponse.json({ error: unitResult.error }, { status: 400 });
  }

  const categoryResult = validateOptionalText(body.category, "Category", 80);
  if (!categoryResult.ok) {
    return NextResponse.json({ error: categoryResult.error }, { status: 400 });
  }

  const thresholdResult = validateOptionalPositiveDecimal(body.lowStockThreshold);
  if (!thresholdResult.ok) {
    return NextResponse.json({ error: thresholdResult.error }, { status: 400 });
  }

  try {
    const item = await prisma.item.create({
      data: {
        orgId: auth.orgId,
        name: nameResult.value,
        sku: skuResult.value.toUpperCase(),
        unit: unitResult.value,
        category: categoryResult.value,
        lowStockThreshold: thresholdResult.value,
      },
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

    return NextResponse.json(
      {
        item: {
          ...item,
          lowStockThreshold: item.lowStockThreshold?.toString() ?? null,
        },
      },
      { status: 201 }
    );
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
