import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  prismaMembershipFindUnique: vi.fn(),
  listPendingInvitations: vi.fn(),
  createInvitation: vi.fn(),
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
  listPendingInvitations: mocks.listPendingInvitations,
  createInvitation: mocks.createInvitation,
  InvitationsApiError: class extends Error {
    status = 400;
    code = "INVITE_CONFLICT";
    details = undefined;
  },
}));

import { GET } from "../route";
import { POST } from "../route";

describe("org invites route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      success: true,
      session: { user: { id: "admin_1" } },
    });
    mocks.prismaMembershipFindUnique.mockResolvedValue({ role: "ORG_ADMIN" });
  });

  it("returns 404 for cross-org list attempts", async () => {
    mocks.prismaMembershipFindUnique.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost") as any, {
      params: Promise.resolve({ orgId: "org_2" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 400 for invalid create body", async () => {
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "ORG_USER" }),
      }) as any,
      {
        params: Promise.resolve({ orgId: "org_1" }),
      },
    );

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error?.message).toBe("Invalid request body");
  });

  it("returns 400 for invalid JSON create body", async () => {
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{\"email\":",
      }) as any,
      {
        params: Promise.resolve({ orgId: "org_1" }),
      },
    );

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error?.message).toBe("Invalid JSON body");
  });

  it("allows admin invite creation when requested org differs from active org", async () => {
    mocks.createInvitation.mockResolvedValue({
      invitation: { id: "inv_1", invitedEmail: "new.user@example.com" },
      delivery: { status: "simulated", provider: "dev-console" },
    });

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "new.user@example.com", role: "ORG_USER" }),
      }) as any,
      {
        params: Promise.resolve({ orgId: "org_2" }),
      },
    );

    expect(response.status).toBe(201);
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
    expect(mocks.createInvitation).toHaveBeenCalledWith({
      orgId: "org_2",
      inviterUserId: "admin_1",
      invitedEmail: "new.user@example.com",
      role: "ORG_USER",
    });

    const payload = await response.json();
    expect(payload.token).toBeUndefined();
    expect(payload.delivery).toMatchObject({ provider: "dev-console" });
  });

  it("returns 400 for invalid role", async () => {
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "new.user@example.com", role: "OWNER" }),
      }) as any,
      {
        params: Promise.resolve({ orgId: "org_1" }),
      },
    );

    expect(response.status).toBe(400);
    expect(mocks.createInvitation).not.toHaveBeenCalled();
  });
});
