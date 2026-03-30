import { NextResponse } from "next/server";
import { requireAuthWithOrg } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

function parsePaginationParam(value: string | null, fallback: number, min: number, max: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

export async function GET(request: Request) {
  const auth = await requireAuthWithOrg();
  if (!auth.success) return auth.response;
  const { orgId } = auth;
  const { searchParams } = new URL(request.url);

  const page = parsePaginationParam(searchParams.get("page"), 1, 1, Number.MAX_SAFE_INTEGER);
  const limit = parsePaginationParam(searchParams.get("limit"), 50, 1, 100);
  const skip = (page - 1) * limit;

  const where = { orgId };

  const [inventory, total] = await Promise.all([
    prisma.currentStock.findMany({
      where,
      select: {
        id: true,
        quantity: true,
        updatedAt: true,
        item: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            category: true,
            lowStockThreshold: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        item: { name: "asc" },
      },
      skip,
      take: limit,
    }),
    prisma.currentStock.count({ where }),
  ]);

  return NextResponse.json({
    inventory: inventory.map((row) => ({
      id: row.id,
      quantity: row.quantity.toString(),
      updatedAt: row.updatedAt,
      item: {
        ...row.item,
        lowStockThreshold: row.item.lowStockThreshold?.toString() ?? null,
      },
      location: row.location,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
