/**
 * Inventory Repository - Prisma data access layer
 * INTERNAL: Only import from service.ts within this module
 */
import { prisma } from "@/lib/db";
import type { InventoryExportRow } from "./csv-generator";

export async function listCurrentStock(orgId: string) {
  return prisma.currentStock.findMany({
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
}

export async function countStock(orgId: string): Promise<number> {
  return prisma.currentStock.count({ where: { orgId } });
}

/**
 * Get inventory for CSV export
 */
export async function getInventoryForExport(
  orgId: string,
  limit: number = 10000
): Promise<InventoryExportRow[]> {
  const items = await prisma.currentStock.findMany({
    where: { orgId },
    include: {
      item: {
        select: {
          sku: true,
          name: true,
          category: true,
          unit: true,
          lowStockThreshold: true,
        },
      },
      location: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      item: { name: "asc" },
    },
    take: limit,
  });

  if (items.length === limit) {
    console.warn(`[Export] Hit export limit (${limit}) for org ${orgId}`);
  }

  return items.map((item) => {
    const quantity = Number(item.quantity);
    const threshold = item.item.lowStockThreshold
      ? Number(item.item.lowStockThreshold)
      : null;

    return {
      sku: item.item.sku,
      itemName: item.item.name,
      category: item.item.category ?? "",
      unit: item.item.unit,
      location: item.location.name,
      quantity,
      lowStockThreshold: threshold,
      status:
        threshold && threshold > 0 && quantity <= threshold
          ? "Low Stock"
          : "In Stock",
      lastUpdated: item.updatedAt,
    };
  });
}
