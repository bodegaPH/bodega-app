import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getInventoryForExport: vi.fn(),
  getOrganizationName: vi.fn(),
  generateInventoryCsv: vi.fn(),
  getItemsForSelect: vi.fn(),
  getLocationsForSelect: vi.fn(),
}));

vi.mock("../repository", () => ({
  getInventoryForExport: mocks.getInventoryForExport,
  listCurrentStock: vi.fn(),
  countStock: vi.fn(),
}));

vi.mock("../csv-generator", () => ({
  generateInventoryCsv: mocks.generateInventoryCsv,
}));

vi.mock("@/modules/items", () => ({
  getItemsForSelect: mocks.getItemsForSelect,
}));

vi.mock("@/modules/locations", () => ({
  getLocationsForSelect: mocks.getLocationsForSelect,
}));

vi.mock("@/modules/organizations", () => ({
  getOrganizationName: mocks.getOrganizationName,
}));

import { generateInventoryCsvExport } from "../service";

describe("inventory service export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("orchestrates inventory export data and CSV generation", async () => {
    mocks.getInventoryForExport.mockResolvedValue([{ sku: "SKU-1" }]);
    mocks.getOrganizationName.mockResolvedValue("Acme Co");
    mocks.generateInventoryCsv.mockReturnValue({
      filename: "inventory-acme-co-2026-03-31.csv",
      content: "csv-content",
      rowCount: 1,
    });

    const result = await generateInventoryCsvExport("org_123");

    expect(mocks.getInventoryForExport).toHaveBeenCalledWith("org_123", undefined);
    expect(mocks.getOrganizationName).toHaveBeenCalledWith("org_123");
    expect(mocks.generateInventoryCsv).toHaveBeenCalledWith([
      { sku: "SKU-1" },
    ], "Acme Co");
    expect(result).toEqual({
      filename: "inventory-acme-co-2026-03-31.csv",
      content: "csv-content",
      rowCount: 1,
    });
  });

  it("falls back to inventory when organization name is missing", async () => {
    mocks.getInventoryForExport.mockResolvedValue([]);
    mocks.getOrganizationName.mockResolvedValue(null);
    mocks.generateInventoryCsv.mockReturnValue({
      filename: "inventory-inventory-2026-03-31.csv",
      content: "csv-content",
      rowCount: 0,
    });

    await generateInventoryCsvExport("org_123");

    expect(mocks.generateInventoryCsv).toHaveBeenCalledWith([], "inventory");
  });
});
