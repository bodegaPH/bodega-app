import { beforeEach, describe, expect, it, vi } from "vitest";
import { IndicatorsRepository } from "../repository";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $queryRaw: vi.fn(),
    currentStock: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    movement: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    item: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    membership: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

describe("IndicatorsRepository", () => {
  const orgId = "org_123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("gets low stock items scoped by orgId and urgency", async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      {
        itemId: "item-1",
        quantity: "2",
        name: "Alpha",
        sku: "SKU-1",
        lowStockThreshold: "10",
        locationName: "Main",
      },
      {
        itemId: "item-2",
        quantity: "5",
        name: "Beta",
        sku: "SKU-2",
        lowStockThreshold: "10",
        locationName: null,
      },
    ]);

    const repo = new IndicatorsRepository(prismaMock as never);
    const result = await repo.getLowStockItems(orgId);

    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        itemId: "item-1",
        currentQty: 2,
        threshold: 10,
        itemName: "Alpha",
        itemSku: "SKU-1",
        locationName: "Main",
      },
      {
        itemId: "item-2",
        currentQty: 5,
        threshold: 10,
        itemName: "Beta",
        itemSku: "SKU-2",
        locationName: "Unknown",
      },
    ]);
  });

  it("gets large outbound items scoped by orgId and day window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-31T12:00:00Z"));

    prismaMock.movement.findMany.mockResolvedValue([
      {
        itemId: "item-1",
        quantity: 60,
        createdAt: new Date("2026-03-30T10:00:00Z"),
        item: {
          sku: "SKU-1",
          name: "Alpha",
          currentStock: [{ quantity: 40 }],
        },
      },
      {
        itemId: "item-2",
        quantity: 10,
        createdAt: new Date("2026-03-30T11:00:00Z"),
        item: {
          sku: "SKU-2",
          name: "Beta",
          currentStock: [{ quantity: 80 }],
        },
      },
    ]);

    const repo = new IndicatorsRepository(prismaMock as never);
    const result = await repo.getLargeOutboundItems(orgId, 7);

    expect(prismaMock.movement.findMany).toHaveBeenCalledWith({
      where: {
        orgId,
        type: "ISSUE",
        createdAt: {
          gte: new Date("2026-03-24T12:00:00.000Z"),
        },
      },
      select: expect.any(Object),
      orderBy: {
        createdAt: "desc",
      },
    });
    expect(result).toEqual([
      {
        itemId: "item-1",
        itemName: "Alpha",
        itemSku: "SKU-1",
        locationName: "Unknown",
        issuedQty: 60,
        currentQty: 40,
        issuedAt: new Date("2026-03-30T10:00:00Z"),
        percentOfStock: 150,
      },
    ]);
  });

  it("gets frequent adjustment items scoped by orgId and minimum count", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-31T12:00:00Z"));

    prismaMock.movement.groupBy.mockResolvedValue([
      {
        itemId: "item-1",
        _count: { id: 4 },
      },
    ]);
    prismaMock.item.findMany.mockResolvedValue([
      {
        id: "item-1",
        sku: "SKU-1",
        name: "Alpha",
      },
    ]);
    prismaMock.movement.findMany.mockResolvedValue([
      { itemId: "item-1", createdAt: new Date("2026-03-29T10:00:00Z") },
      { itemId: "item-1", createdAt: new Date("2026-03-30T15:00:00Z") },
    ]);

    const repo = new IndicatorsRepository(prismaMock as never);
    const result = await repo.getFrequentAdjustmentItems(orgId, 7, 3);

    expect(prismaMock.movement.groupBy).toHaveBeenCalledWith({
      by: ["itemId"],
      where: {
        orgId,
        type: "ADJUSTMENT",
        createdAt: {
          gte: new Date("2026-03-24T12:00:00.000Z"),
        },
      },
      _count: {
        id: true,
      },
      having: {
        id: {
          _count: {
            gt: 3,
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
    expect(result).toEqual([
      {
        itemId: "item-1",
        sku: "SKU-1",
        name: "Alpha",
        adjustmentCount: 4,
        firstAdjustment: new Date("2026-03-29T10:00:00Z"),
        lastAdjustment: new Date("2026-03-30T15:00:00Z"),
      },
    ]);
  });
});
