/**
 * Inventory Service - Public API for the inventory module
 * Imports from items and locations modules for select data
 */
import * as repo from "./repository";
import { getItemsForSelect } from "@/modules/items";
import { getLocationsForSelect } from "@/modules/locations";
import { getOrganizationName } from "@/modules/organizations";
import { generateInventoryCsv, type CsvExportResult } from "./csv-generator";
import type { InventoryPageData, InventoryRow } from "./types";

export type { InventoryPageData, InventoryRow } from "./types";

export async function getInventory(orgId: string): Promise<InventoryPageData> {
  const [rawInventory, items, locations] = await Promise.all([
    repo.listCurrentStock(orgId),
    getItemsForSelect(orgId),
    getLocationsForSelect(orgId),
  ]);

  const inventory: InventoryRow[] = rawInventory.map((row) => ({
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

/**
 * Get count of stock rows in organization.
 * Cross-module service function for aggregation.
 */
export async function getDataCount(orgId: string): Promise<number> {
  return repo.countStock(orgId);
}

/**
 * Get low stock items for dashboard display.
 */
export async function getLowStockItems(orgId: string): Promise<InventoryRow[]> {
  const stock = await repo.listCurrentStock(orgId);

  return stock
    .filter((row) => {
      const qty = Number(row.quantity);
      const threshold = row.item.lowStockThreshold ? Number(row.item.lowStockThreshold) : 0;
      return qty <= threshold;
    })
    .map((row) => ({
      id: row.id,
      quantity: row.quantity.toString(),
      item: {
        ...row.item,
        lowStockThreshold: row.item.lowStockThreshold?.toString() ?? null,
      },
      location: row.location,
    }));
}

/**
 * Generate CSV export of inventory
 */
export async function generateInventoryCsvExport(
  orgId: string,
  limit?: number
): Promise<CsvExportResult> {
  const [rows, orgName] = await Promise.all([
    repo.getInventoryForExport(orgId, limit),
    getOrganizationName(orgId),
  ]);

  return generateInventoryCsv(rows, orgName ?? "inventory");
}
