/**
 * Indicators Module - Data Access Layer
 */

import type { PrismaClient } from "@prisma/client";
import type {
  LowStockItem,
  LargeOutboundItem,
  FrequentAdjustmentItem,
} from "./types";

export class IndicatorsRepository {
  constructor(private db: PrismaClient) {}

  async getLowStockItems(orgId: string): Promise<LowStockItem[]> {
    const items = await this.db.$queryRaw<
      Array<{
        itemId: string;
        quantity: string;
        name: string;
        sku: string;
        lowStockThreshold: string;
        locationName: string | null;
      }>
    >`
    SELECT 
      cs."itemId",
      cs."quantity",
      i."name",
      i."sku",
      i."lowStockThreshold",
      l."name" as "locationName"
    FROM "CurrentStock" cs
    JOIN "Item" i ON cs."itemId" = i.id
    LEFT JOIN "Location" l ON cs."locationId" = l.id
    WHERE cs."orgId" = ${orgId}
      AND i."lowStockThreshold" IS NOT NULL
      AND i."lowStockThreshold" > 0
      AND cs."quantity" <= i."lowStockThreshold"
    ORDER BY (cs."quantity"::float / i."lowStockThreshold"::float) ASC
    LIMIT 50
  `;

    return items.map((item) => ({
      itemId: item.itemId,
      currentQty: Number(item.quantity),
      threshold: Number(item.lowStockThreshold),
      itemName: item.name,
      itemSku: item.sku,
      locationName: item.locationName ?? "Unknown",
    }));
  }

  async getLargeOutboundItems(
    orgId: string,
    days: number
  ): Promise<LargeOutboundItem[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentIssues = await this.db.movement.findMany({
      where: {
        orgId,
        type: "ISSUE",
        createdAt: {
          gte: cutoffDate,
        },
      },
      select: {
        itemId: true,
        quantity: true,
        createdAt: true,
        location: {
          select: {
            name: true,
          },
        },
        item: {
          select: {
            sku: true,
            name: true,
            currentStock: {
              where: { orgId },
              select: {
                quantity: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const largeOutbounds: LargeOutboundItem[] = [];

    for (const issue of recentIssues) {
      // Note: Calculates percentage against CURRENT stock, not stock at time of issue.
      // This is an approximation since we don't store historical stock levels.
      // A 100% result means the issue quantity equals or exceeds current stock.
      const currentQty = issue.item.currentStock.reduce(
        (sum, stock) => sum + Number(stock.quantity),
        0
      );
      const issuedQty = Number(issue.quantity);
      const percentOfStock = currentQty > 0 ? (issuedQty / currentQty) * 100 : 100;

      if (percentOfStock >= 50) {
        largeOutbounds.push({
          itemId: issue.itemId,
          itemName: issue.item.name,
          itemSku: issue.item.sku,
          locationName: issue.location?.name ?? "Unknown",
          issuedQty,
          currentQty,
          issuedAt: issue.createdAt,
          percentOfStock: Math.round(percentOfStock),
        });

        if (largeOutbounds.length >= 50) break;
      }
    }

    return largeOutbounds;
  }

  async getFrequentAdjustmentItems(
    orgId: string,
    days: number = 7,
    minCount: number = 3
  ): Promise<FrequentAdjustmentItem[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const adjustments = await this.db.movement.groupBy({
      by: ["itemId"],
      where: {
        orgId,
        type: "ADJUSTMENT",
        createdAt: {
          gte: cutoffDate,
        },
      },
      _count: {
        id: true,
      },
      having: {
        id: {
          _count: {
            gt: minCount,
          },
        },
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 50,
    });

    if (adjustments.length === 0) return [];

    const itemIds = adjustments.map((g) => g.itemId);
    const [items, movements] = await Promise.all([
      this.db.item.findMany({
        where: {
          id: { in: itemIds },
          orgId,
        },
        select: { id: true, sku: true, name: true },
      }),
      this.db.movement.findMany({
        where: {
          itemId: { in: itemIds },
          orgId,
          type: "ADJUSTMENT",
          createdAt: { gte: cutoffDate },
        },
        select: { itemId: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const itemMap = new Map(items.map((item) => [item.id, item]));
    const groupedMovements = new Map<
      string,
      { firstAdjustment: Date; lastAdjustment: Date }
    >();

    for (const movement of movements) {
      const existing = groupedMovements.get(movement.itemId);
      if (!existing) {
        groupedMovements.set(movement.itemId, {
          firstAdjustment: movement.createdAt,
          lastAdjustment: movement.createdAt,
        });
        continue;
      }

      existing.lastAdjustment = movement.createdAt;
    }

    return adjustments
      .map((group) => {
        const item = itemMap.get(group.itemId);
        const movementRange = groupedMovements.get(group.itemId);

        if (!item || !movementRange) return null;

        return {
          itemId: group.itemId,
          sku: item.sku,
          name: item.name,
          adjustmentCount: group._count.id,
          firstAdjustment: movementRange.firstAdjustment,
          lastAdjustment: movementRange.lastAdjustment,
        };
      })
      .filter((item): item is FrequentAdjustmentItem => item !== null);
  }
}
