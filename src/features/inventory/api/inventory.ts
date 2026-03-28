import { prisma } from "@/lib/db";
import { getItemsForSelect } from "@/features/items/server";
import { getLocationsForSelect } from "@/features/locations/server";
import type { ItemReference, LocationReference } from "@/features/shared/types";

export type InventoryRow = {
  id: string;
  quantity: string;
  item: {
    id: string;
    name: string;
    sku: string;
    unit: string;
    category: string | null;
    lowStockThreshold: string | null;
  };
  location: {
    id: string;
    name: string;
  };
};

export type InventoryPageData = {
  inventory: InventoryRow[];
  items: ItemReference[];
  locations: (LocationReference & { isDefault: boolean })[];
};

export async function getInventory(orgId: string): Promise<InventoryPageData> {
  // Use cross-feature service functions for items and locations
  // Only CurrentStock query remains local (owned by inventory feature)
  const [rawInventory, items, locations] = await Promise.all([
    prisma.currentStock.findMany({
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
    }),
    getItemsForSelect(orgId),
    getLocationsForSelect(orgId),
  ]);

  const inventory = rawInventory.map((row) => ({
    id: row.id,
    quantity: row.quantity.toString(),
    item: {
      ...row.item,
      lowStockThreshold: row.item.lowStockThreshold?.toString() ?? null,
    },
    location: row.location,
  }));

  return { inventory, items, locations };
}
