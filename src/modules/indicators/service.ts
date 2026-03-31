/**
 * Indicators Module - Business Logic
 */

import type { IndicatorsRepository } from "./repository";
import type { InventoryIndicators } from "./types";

export class IndicatorsService {
  constructor(private repo: IndicatorsRepository) {}

  async getInventoryIndicators(orgId: string): Promise<InventoryIndicators> {
    const [lowStock, largeOutbound, frequentAdjustments] = await Promise.all([
      this.repo.getLowStockItems(orgId),
      this.repo.getLargeOutboundItems(orgId, 7),
      this.repo.getFrequentAdjustmentItems(orgId, 7, 3),
    ]);

    return {
      lowStock,
      largeOutbound,
      frequentAdjustments,
    };
  }
}
