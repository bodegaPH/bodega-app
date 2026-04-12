import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  acceptInvitationByToken: vi.fn(),
  InvitationsApiError: class extends Error {
    status: number;
    code: string;
    details?: unknown;

    constructor(message: string, status: number, code: string, details?: unknown) {
      super(message);
      this.status = status;
      this.code = code;
      this.details = details;
    }
  },
}));

vi.mock("@/lib/api-auth", () => ({
  requireAuth: mocks.requireAuth,
}));

vi.mock("@/modules/invitations", () => ({
  acceptInvitationByToken: mocks.acceptInvitationByToken,
  InvitationsApiError: mocks.InvitationsApiError,
}));

import { POST } from "../route";

describe("invite accept route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      success: true,
      session: { user: { id: "user_1", email: "member@example.com" } },
    });
  });

  it("returns 403 INVITE_FORBIDDEN for mismatched authenticated email", async () => {
    mocks.acceptInvitationByToken.mockRejectedValue(
      new mocks.InvitationsApiError("Invitation is not for this account", 403, "INVITE_FORBIDDEN"),
    );

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "token_1" }),
      }),
    );

    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload.error?.code).toBe("INVITE_FORBIDDEN");
  });

  it("accepts invite with matching authenticated email", async () => {
    mocks.acceptInvitationByToken.mockResolvedValue({
      invitationId: "inv_1",
      orgId: "org_1",
      role: "ORG_USER",
      alreadyMember: false,
    });

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "token_1" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.acceptInvitationByToken).toHaveBeenCalledWith(
      "token_1",
      "user_1",
      "member@example.com",
    );
    const payload = await response.json();
    expect(payload).toMatchObject({
      orgId: "org_1",
      role: "ORG_USER",
      alreadyMember: false,
    });
  });
});
