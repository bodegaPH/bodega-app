import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  prismaMembershipFindUnique: vi.fn(),
  resendInvitation: vi.fn(),
  revokeInvitation: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  requireAuth: mocks.requireAuth,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    membership: {
      findUnique: mocks.prismaMembershipFindUnique,
    },
  },
}));

vi.mock("@/features/organizations/server", () => ({
  resendInvitation: mocks.resendInvitation,
  revokeInvitation: mocks.revokeInvitation,
  InvitationsApiError: class extends Error {
    status = 400;
    code = "INVITE_CONFLICT";
    details = undefined;
  },
}));

import { DELETE, POST } from "../route";

describe("org invite by id route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      success: true,
      session: { user: { id: "admin_1" } },
    });
    mocks.prismaMembershipFindUnique.mockResolvedValue({ role: "ORG_ADMIN" });
  });

  it("allows resend when user is admin in requested org", async () => {
    mocks.resendInvitation.mockResolvedValue({
      invitation: { id: "inv_1" },
      delivery: { status: "simulated", provider: "dev-console" },
    });

    const response = await POST(new Request("http://localhost") as any, {
      params: Promise.resolve({ orgId: "org_2", inviteId: "inv_1" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.prismaMembershipFindUnique).toHaveBeenCalledWith({
      where: {
        userId_orgId: {
          userId: "admin_1",
          orgId: "org_2",
        },
      },
      select: {
        role: true,
      },
    });
    expect(mocks.resendInvitation).toHaveBeenCalledWith("org_2", "inv_1");

    const payload = await response.json();
    expect(payload.token).toBeUndefined();
    expect(payload.delivery).toMatchObject({ provider: "dev-console" });
  });

  it("allows revoke when user is admin in requested org", async () => {
    const response = await DELETE(new Request("http://localhost") as any, {
      params: Promise.resolve({ orgId: "org_2", inviteId: "inv_1" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.revokeInvitation).toHaveBeenCalledWith("org_2", "inv_1");
  });
});
