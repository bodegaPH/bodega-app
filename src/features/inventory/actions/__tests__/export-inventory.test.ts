import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  generateInventoryCsvExport: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    membership: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/modules/inventory/service", () => ({
  generateInventoryCsvExport: mocks.generateInventoryCsvExport,
}));

import { exportInventoryCsv } from "../export-inventory";
import { prisma } from "@/lib/db";

describe("exportInventoryCsv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    await expect(exportInventoryCsv("org_123")).resolves.toEqual({
      success: false,
      error: "Unauthorized",
    });
  });

  it("rejects missing organization ids", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user_1" } });

    await expect(exportInventoryCsv("   ")).resolves.toEqual({
      success: false,
      error: "Organization is required",
    });
  });

  it("rejects users who are not members", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user_1" } });
    (prisma.membership.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(exportInventoryCsv("org_123")).resolves.toEqual({
      success: false,
      error: "Not a member of this organization",
    });
  });

  it("rejects users with insufficient permissions", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user_1" } });
    (prisma.membership.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      role: "ORG_VIEWER",
    });

    await expect(exportInventoryCsv("org_123")).resolves.toEqual({
      success: false,
      error: "Insufficient permissions",
    });
  });

  it("exports inventory csv for authorized members", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user_1" } });
    (prisma.membership.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      role: "ORG_ADMIN",
    });
    mocks.generateInventoryCsvExport.mockResolvedValue({
      filename: "inventory-acme-co-2026-03-31.csv",
      content: "csv-content",
      rowCount: 2,
    });

    await expect(exportInventoryCsv("  org_123  ")).resolves.toEqual({
      success: true,
      data: {
        filename: "inventory-acme-co-2026-03-31.csv",
        content: "csv-content",
        rowCount: 2,
      },
    });

    expect(prisma.membership.findUnique).toHaveBeenCalledWith({
      where: {
        userId_orgId: {
          userId: "user_1",
          orgId: "org_123",
        },
      },
      select: { role: true },
    });
    expect(mocks.generateInventoryCsvExport).toHaveBeenCalledWith("org_123");
  });

  it("returns a generic failure when export generation throws", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user_1" } });
    (prisma.membership.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      role: "ORG_USER",
    });
    mocks.generateInventoryCsvExport.mockRejectedValue(new Error("boom"));

    await expect(exportInventoryCsv("org_123")).resolves.toEqual({
      success: false,
      error: "Failed to generate CSV export. Please try again.",
    });
  });
});
