import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    currentStock: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    movement: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    item: {
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

import { getInventoryForExport } from "../repository";

describe("inventory repository export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches inventory rows scoped by orgId and computes status", async () => {
    prismaMock.currentStock.findMany.mockResolvedValue([
      {
        quantity: 2,
        updatedAt: new Date("2026-03-31T08:00:00Z"),
        item: {
          sku: "SKU-1",
          name: "Alpha",
          category: "Cat A",
          unit: "pcs",
          lowStockThreshold: 5,
        },
        location: { name: "Main" },
      },
      {
        quantity: 20,
        updatedAt: new Date("2026-03-31T09:00:00Z"),
        item: {
          sku: "SKU-2",
          name: "Beta",
          category: null,
          unit: "box",
          lowStockThreshold: null,
        },
        location: { name: "Overflow" },
      },
    ]);

    const result = await getInventoryForExport("org_123");

    expect(prismaMock.currentStock.findMany).toHaveBeenCalledWith({
      where: { orgId: "org_123" },
      include: expect.any(Object),
      orderBy: { item: { name: "asc" } },
      take: 10000,
    });
    expect(result).toEqual([
      {
        sku: "SKU-1",
        itemName: "Alpha",
        category: "Cat A",
        unit: "pcs",
        location: "Main",
        quantity: 2,
        lowStockThreshold: 5,
        status: "Low Stock",
        lastUpdated: new Date("2026-03-31T08:00:00Z"),
      },
      {
        sku: "SKU-2",
        itemName: "Beta",
        category: "",
        unit: "box",
        location: "Overflow",
        quantity: 20,
        lowStockThreshold: null,
        status: "In Stock",
        lastUpdated: new Date("2026-03-31T09:00:00Z"),
      },
    ]);
  });
});
