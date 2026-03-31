import { describe, expect, it, vi } from "vitest";
import { IndicatorsService } from "../service";

describe("IndicatorsService", () => {
  it("aggregates all indicators with the expected parameters", async () => {
    const repo = {
      getLowStockItems: vi.fn().mockResolvedValue(["low"]),
      getLargeOutboundItems: vi.fn().mockResolvedValue(["large"]),
      getFrequentAdjustmentItems: vi.fn().mockResolvedValue(["adjust"]),
    };

    const service = new IndicatorsService(repo as never);
    const result = await service.getInventoryIndicators("org_123");

    expect(repo.getLowStockItems).toHaveBeenCalledWith("org_123");
    expect(repo.getLargeOutboundItems).toHaveBeenCalledWith("org_123", 7);
    expect(repo.getFrequentAdjustmentItems).toHaveBeenCalledWith("org_123", 7, 3);
    expect(result).toEqual({
      lowStock: ["low"],
      largeOutbound: ["large"],
      frequentAdjustments: ["adjust"],
    });
  });
});
