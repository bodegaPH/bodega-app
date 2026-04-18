import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  prismaMembershipFindUnique: vi.fn(),
  resendInvitation: vi.fn(),
  revokeInvitation: vi.fn(),
  acquireInviteIdempotency: vi.fn(),
  finalizeInviteIdempotency: vi.fn(),
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
    status: number;
    code: string;
    details: unknown;

    constructor(message: string, status = 400, code = "INVITE_CONFLICT", details?: unknown) {
      super(message);
      this.status = status;
      this.code = code;
      this.details = details;
    }
  },
}));

vi.mock("@/modules/invitations/idempotency", () => ({
  acquireInviteIdempotency: mocks.acquireInviteIdempotency,
  finalizeInviteIdempotency: mocks.finalizeInviteIdempotency,
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
    mocks.acquireInviteIdempotency.mockResolvedValue({ state: "acquired" });
    mocks.finalizeInviteIdempotency.mockResolvedValue(undefined);
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
    expect(mocks.resendInvitation).toHaveBeenCalledWith("org_2", "inv_1", expect.any(String));

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

  it("replays resend response for same idempotency key", async () => {
    const replayBody = {
      invite: { id: "inv_1" },
      delivery: { status: "simulated", provider: "dev-console" },
    };
    mocks.resendInvitation.mockResolvedValue({
      invitation: replayBody.invite,
      delivery: replayBody.delivery,
    });
    mocks.acquireInviteIdempotency
      .mockResolvedValueOnce({ state: "acquired" })
      .mockResolvedValueOnce({
        state: "replay",
        response: { responseStatus: 200, responseBody: replayBody },
      });

    const req = () =>
      POST(
        new Request("http://localhost", {
          headers: {
            "Idempotency-Key": "idem-r-1",
            "x-request-id": "req-321",
          },
        }) as any,
        {
          params: Promise.resolve({ orgId: "org_2", inviteId: "inv_1" }),
        },
      );

    const first = await req();
    const second = await req();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(mocks.resendInvitation).toHaveBeenCalledTimes(1);
    expect(mocks.finalizeInviteIdempotency).toHaveBeenCalledTimes(1);
  });

  it("returns 409 when resend idempotency key is in-progress", async () => {
    mocks.acquireInviteIdempotency.mockResolvedValueOnce({
      state: "in-progress",
      retryAfterSeconds: 5,
    });

    const response = await POST(
      new Request("http://localhost", {
        headers: {
          "Idempotency-Key": "idem-r-busy",
        },
      }) as any,
      {
        params: Promise.resolve({ orgId: "org_2", inviteId: "inv_1" }),
      },
    );

    expect(response.status).toBe(409);
    expect(response.headers.get("retry-after")).toBe("5");
    await expect(response.json()).resolves.toEqual({
      error: {
        message: "Request with this idempotency key is already in progress",
        code: "IDEMPOTENCY_IN_PROGRESS",
        supportCode: "INVITE_RESEND_IDEMPOTENCY_IN_PROGRESS",
        requestId: expect.any(String),
        retryAfterSeconds: 5,
      },
    });
    expect(mocks.resendInvitation).not.toHaveBeenCalled();
  });

  it("finalizes mapped resend errors for idempotent replay consistency", async () => {
    const InviteErr = (await import("@/features/organizations/server")).InvitationsApiError;
    mocks.resendInvitation.mockRejectedValue(
      new InviteErr("Invite rate limited", 429, "INVITE_RATE_LIMITED", { retryAfterSeconds: 10 }),
    );

    const response = await POST(
      new Request("http://localhost", {
        headers: {
          "x-request-id": "req-r-1",
          "Idempotency-Key": "idem-r-fail",
        },
      }) as any,
      {
        params: Promise.resolve({ orgId: "org_2", inviteId: "inv_1" }),
      },
    );

    expect(response.status).toBe(429);
    expect(mocks.finalizeInviteIdempotency).toHaveBeenCalledWith(
      expect.objectContaining({ responseStatus: 429 }),
    );
  });

  it("returns standardized auth error metadata", async () => {
    mocks.requireAuth.mockResolvedValueOnce({
      success: false,
      response: { status: 401 },
    });

    const response = await POST(new Request("http://localhost", {
      headers: { "x-request-id": "bad id!!" },
    }) as any, {
      params: Promise.resolve({ orgId: "org_2", inviteId: "inv_1" }),
    });

    expect(response.status).toBe(401);
    const payload = await response.json();
    expect(payload.error.supportCode).toBe("INVITE_RESEND_UNAUTHORIZED");
    expect(payload.error.requestId).not.toBe("bad id!!");
  });

  it("includes request metadata for rate limited resend", async () => {
    const InviteErr = (await import("@/features/organizations/server")).InvitationsApiError;
    mocks.resendInvitation.mockRejectedValue(
      new InviteErr("Invite rate limited", 429, "INVITE_RATE_LIMITED", { retryAfterSeconds: 10 }),
    );

    const response = await POST(
      new Request("http://localhost", {
        headers: {
          "x-request-id": "req-r-1",
        },
      }) as any,
      {
        params: Promise.resolve({ orgId: "org_2", inviteId: "inv_1" }),
      },
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("10");
    await expect(response.json()).resolves.toEqual({
      error: {
        message: "Invite rate limited",
        code: "INVITE_RATE_LIMITED",
        details: { retryAfterSeconds: 10 },
        supportCode: "INVITE_RESEND_INVITE_RATE_LIMITED",
        requestId: "req-r-1",
        retryAfterSeconds: 10,
      },
    });
  });

  it("returns support metadata for non-member resend access", async () => {
    mocks.prismaMembershipFindUnique.mockResolvedValueOnce(null);

    const response = await POST(new Request("http://localhost", {
      headers: { "x-request-id": "req-r-404" },
    }) as any, {
      params: Promise.resolve({ orgId: "org_2", inviteId: "inv_1" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        message: "Not found",
        supportCode: "INVITE_RESEND_NOT_FOUND",
        requestId: "req-r-404",
      },
    });
  });
});
