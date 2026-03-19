import { NextResponse } from "next/server";
import { requireAuthWithOrg } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const auth = await requireAuthWithOrg();
  if (!auth.success) return auth.response;
  const { orgId } = auth;

  const inventory = await prisma.currentStock.findMany({
    where: { orgId },
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
  });

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
  });
}
