import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthWithOrg: vi.fn(),
  removeMember: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  requireAuthWithOrg: mocks.requireAuthWithOrg,
}));

vi.mock("@/features/organizations/server", async () => {
  const actual = await vi.importActual<typeof import("@/features/organizations/server")>(
    "@/features/organizations/server",
  );
  return {
    ...actual,
    removeMember: mocks.removeMember,
  };
});

import { DELETE } from "../route";

describe("org members route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthWithOrg.mockResolvedValue({
      success: true,
      orgId: "org_1",
      session: { user: { id: "admin_1" } },
    });
  });

  it("returns 404 for cross-org member mutation", async () => {
    const req = new Request("http://localhost", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "u1" }),
    });

    const response = await DELETE(req as any, { params: Promise.resolve({ orgId: "org_2" }) });
    expect(response.status).toBe(404);
  });
});
