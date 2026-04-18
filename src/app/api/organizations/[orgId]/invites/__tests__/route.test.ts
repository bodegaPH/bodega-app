import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  prismaMembershipFindUnique: vi.fn(),
  listPendingInvitations: vi.fn(),
  createInvitation: vi.fn(),
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
  listPendingInvitations: mocks.listPendingInvitations,
  createInvitation: mocks.createInvitation,
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
    mocks.acquireInviteIdempotency.mockResolvedValue({ state: "acquired" });
    mocks.finalizeInviteIdempotency.mockResolvedValue(undefined);
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
    expect(payload.error?.requestId).toBeTypeOf("string");
    expect(payload.error?.supportCode).toBe("INVITE_CREATE_INVITE_CONFLICT");
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
      requestId: expect.any(String),
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

  it("replays create invite response for same idempotency key", async () => {
    const firstBody = {
      invite: { id: "inv_1", invitedEmail: "new.user@example.com" },
      delivery: { status: "simulated", provider: "dev-console" },
    };

    mocks.createInvitation.mockResolvedValue({
      invitation: firstBody.invite,
      delivery: firstBody.delivery,
    });

    mocks.acquireInviteIdempotency
      .mockResolvedValueOnce({ state: "acquired" })
      .mockResolvedValueOnce({
        state: "replay",
        response: { responseStatus: 201, responseBody: firstBody },
      });

    const req = () =>
      POST(
        new Request("http://localhost", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": "idem-1",
            "x-request-id": "req-123",
          },
          body: JSON.stringify({ email: "new.user@example.com", role: "ORG_USER" }),
        }) as any,
        {
          params: Promise.resolve({ orgId: "org_2" }),
        },
      );

    const first = await req();
    const second = await req();

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(mocks.createInvitation).toHaveBeenCalledTimes(1);
    expect(mocks.finalizeInviteIdempotency).toHaveBeenCalledTimes(1);
  });

  it("returns 409 when idempotent request is in progress", async () => {
    mocks.acquireInviteIdempotency.mockResolvedValueOnce({
      state: "in-progress",
      retryAfterSeconds: 4,
    });

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "idem-busy-1",
        },
        body: JSON.stringify({ email: "new.user@example.com", role: "ORG_USER" }),
      }) as any,
      {
        params: Promise.resolve({ orgId: "org_1" }),
      },
    );

    expect(response.status).toBe(409);
    expect(response.headers.get("retry-after")).toBe("4");
    await expect(response.json()).resolves.toEqual({
      error: {
        message: "Request with this idempotency key is already in progress",
        code: "IDEMPOTENCY_IN_PROGRESS",
        supportCode: "INVITE_CREATE_IDEMPOTENCY_IN_PROGRESS",
        requestId: expect.any(String),
        retryAfterSeconds: 4,
      },
    });
    expect(mocks.createInvitation).not.toHaveBeenCalled();
  });

  it("finalizes mapped invite errors for idempotent replay consistency", async () => {
    const InviteErr = (await import("@/features/organizations/server")).InvitationsApiError;
    mocks.createInvitation.mockRejectedValue(
      new InviteErr("Invite rate limited", 429, "INVITE_RATE_LIMITED", { retryAfterSeconds: 30 }),
    );

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "idem-fail-1",
          "x-request-id": "req-invite-1",
        },
        body: JSON.stringify({ email: "new.user@example.com", role: "ORG_USER" }),
      }) as any,
      {
        params: Promise.resolve({ orgId: "org_1" }),
      },
    );

    expect(response.status).toBe(429);
    expect(mocks.finalizeInviteIdempotency).toHaveBeenCalledWith(
      expect.objectContaining({
        responseStatus: 429,
      }),
    );
  });

  it("returns standardized auth error metadata", async () => {
    mocks.requireAuth.mockResolvedValueOnce({
      success: false,
      response: { status: 401 },
    });

    const response = await POST(new Request("http://localhost", {
      method: "POST",
      headers: { "x-request-id": "bad id!!" },
      body: JSON.stringify({ email: "new.user@example.com", role: "ORG_USER" }),
    }) as any, {
      params: Promise.resolve({ orgId: "org_1" }),
    });

    expect(response.status).toBe(401);
    const payload = await response.json();
    expect(payload.error.supportCode).toBe("INVITE_CREATE_UNAUTHORIZED");
    expect(payload.error.requestId).not.toBe("bad id!!");
  });

  it("includes request metadata in rate limit errors", async () => {
    const InviteErr = (await import("@/features/organizations/server")).InvitationsApiError;
    mocks.createInvitation.mockRejectedValue(
      new InviteErr("Invite rate limited", 429, "INVITE_RATE_LIMITED", { retryAfterSeconds: 30 }),
    );

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-request-id": "req-invite-1",
        },
        body: JSON.stringify({ email: "new.user@example.com", role: "ORG_USER" }),
      }) as any,
      {
        params: Promise.resolve({ orgId: "org_1" }),
      },
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("30");
    await expect(response.json()).resolves.toEqual({
      error: {
        message: "Invite rate limited",
        code: "INVITE_RATE_LIMITED",
        details: { retryAfterSeconds: 30 },
        supportCode: "INVITE_CREATE_INVITE_RATE_LIMITED",
        requestId: "req-invite-1",
        retryAfterSeconds: 30,
      },
    });
  });
});
