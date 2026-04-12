import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  countInvitesByInviterSince: vi.fn(),
  countInvitesByOrgSince: vi.fn(),
  findLatestInviteByEmail: vi.fn(),
  findPendingInviteByEmail: vi.fn(),
  findUserById: vi.fn(),
  findMembershipByEmail: vi.fn(),
  createInvitation: vi.fn(),
  findInviteById: vi.fn(),
  rotateInvitationToken: vi.fn(),
  restoreInvitationToken: vi.fn(),
  revokeInvitation: vi.fn(),
  findInvitationByTokenHash: vi.fn(),
  updateInvitationStatus: vi.fn(),
  findMembership: vi.fn(),
  createMembership: vi.fn(),
  transaction: vi.fn(),
  isPrismaKnownError: vi.fn(),
  listActiveInvitesByOrg: vi.fn(),
  expireStalePendingInvites: vi.fn(),
  notifyInvitation: vi.fn(),
}));

vi.mock("../repository", () => ({
  countInvitesByInviterSince: mocks.countInvitesByInviterSince,
  countInvitesByOrgSince: mocks.countInvitesByOrgSince,
  findLatestInviteByEmail: mocks.findLatestInviteByEmail,
  findPendingInviteByEmail: mocks.findPendingInviteByEmail,
  findUserById: mocks.findUserById,
  findMembershipByEmail: mocks.findMembershipByEmail,
  createInvitation: mocks.createInvitation,
  findInviteById: mocks.findInviteById,
  rotateInvitationToken: mocks.rotateInvitationToken,
  restoreInvitationToken: mocks.restoreInvitationToken,
  revokeInvitation: mocks.revokeInvitation,
  findInvitationByTokenHash: mocks.findInvitationByTokenHash,
  updateInvitationStatus: mocks.updateInvitationStatus,
  findMembership: mocks.findMembership,
  createMembership: mocks.createMembership,
  transaction: mocks.transaction,
  isPrismaKnownError: mocks.isPrismaKnownError,
  listActiveInvitesByOrg: mocks.listActiveInvitesByOrg,
  expireStalePendingInvites: mocks.expireStalePendingInvites,
}));

vi.mock("../notifier", () => ({
  getInvitationNotifier: () => ({
    notifyInvitation: mocks.notifyInvitation,
  }),
}));

import {
  acceptInvitationByToken,
  createInvitation,
  hashInvitationToken,
  resendInvitation,
  revokeInvitation,
} from "../service";

describe("invitations service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.countInvitesByInviterSince.mockResolvedValue(0);
    mocks.countInvitesByOrgSince.mockResolvedValue(0);
    mocks.findLatestInviteByEmail.mockResolvedValue(null);
    mocks.findPendingInviteByEmail.mockResolvedValue(null);
    mocks.findUserById.mockResolvedValue({ id: "admin_1", email: "admin@example.com" });
    mocks.findMembershipByEmail.mockResolvedValue(null);
    mocks.transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}));
    mocks.restoreInvitationToken.mockResolvedValue(undefined);
    mocks.notifyInvitation.mockResolvedValue({
      status: "simulated",
      provider: "dev-console",
      detail: "Delivery simulated in local/development mode",
    });
    delete process.env.EMAIL_PROVIDER;
  });

  it("creates invite with hashed token persistence", async () => {
    mocks.createInvitation.mockImplementation(async (input: { tokenHash: string }) => ({
      id: "inv_1",
      orgId: "org_1",
      inviterUserId: "admin_1",
      invitedEmail: "new@example.com",
      role: "ORG_USER",
      status: "PENDING",
      expiresAt: new Date(),
      acceptedAt: null,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      inviter: { id: "admin_1", name: "Admin", email: "admin@example.com" },
      tokenHash: input.tokenHash,
    }));

    const result = await createInvitation({
      orgId: "org_1",
      inviterUserId: "admin_1",
      invitedEmail: "new@example.com",
      role: "ORG_USER",
    });

    expect(result.token).toBeTypeOf("string");
    expect(result.token).not.toHaveLength(0);
    const hash = hashInvitationToken(result.token);
    expect(mocks.createInvitation).toHaveBeenCalledWith(expect.objectContaining({ tokenHash: hash }));
    expect(result.delivery).toMatchObject({ status: "simulated", provider: "dev-console" });
    expect(mocks.notifyInvitation).toHaveBeenCalledTimes(1);
  });

  it("rotates token on resend", async () => {
    mocks.findInviteById.mockResolvedValue({
      id: "inv_1",
      orgId: "org_1",
      inviterUserId: "admin_1",
      invitedEmail: "new@example.com",
      role: "ORG_USER",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 1000),
    });
    mocks.rotateInvitationToken.mockResolvedValue({
      id: "inv_1",
      orgId: "org_1",
      inviterUserId: "admin_1",
      invitedEmail: "new@example.com",
      role: "ORG_USER",
      status: "PENDING",
      expiresAt: new Date(),
      acceptedAt: null,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      inviter: { id: "admin_1", name: "Admin", email: "admin@example.com" },
    });

    const result = await resendInvitation("org_1", "inv_1");

    expect(result.token).toBeTypeOf("string");
    expect(mocks.rotateInvitationToken).toHaveBeenCalledTimes(1);
    expect(result.delivery).toMatchObject({ status: "simulated", provider: "dev-console" });
    expect(mocks.notifyInvitation).toHaveBeenCalledTimes(1);
  });

  it("throws explicit error when notifier fails during create", async () => {
    mocks.createInvitation.mockImplementation(async (input: { tokenHash: string }) => ({
      id: "inv_1",
      orgId: "org_1",
      inviterUserId: "admin_1",
      invitedEmail: "new@example.com",
      role: "ORG_USER",
      status: "PENDING",
      expiresAt: new Date(),
      acceptedAt: null,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      inviter: { id: "admin_1", name: "Admin", email: "admin@example.com" },
      tokenHash: input.tokenHash,
    }));
    mocks.notifyInvitation.mockRejectedValue(new Error("smtp down"));

    await expect(
      createInvitation({
        orgId: "org_1",
        inviterUserId: "admin_1",
        invitedEmail: "new@example.com",
        role: "ORG_USER",
      }),
    ).rejects.toMatchObject({ status: 503, code: "INVITE_DELIVERY_FAILED" });
    expect(mocks.revokeInvitation).toHaveBeenCalledWith("inv_1");
  });

  it("throws provider-not-configured when notifier reports provider setup missing", async () => {
    mocks.createInvitation.mockImplementation(async (input: { tokenHash: string }) => ({
      id: "inv_1",
      orgId: "org_1",
      inviterUserId: "admin_1",
      invitedEmail: "new@example.com",
      role: "ORG_USER",
      status: "PENDING",
      expiresAt: new Date(),
      acceptedAt: null,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      inviter: { id: "admin_1", name: "Admin", email: "admin@example.com" },
      tokenHash: input.tokenHash,
    }));
    mocks.notifyInvitation.mockRejectedValueOnce(new Error("Mailjet provider is not configured"));

    await expect(
      createInvitation({
        orgId: "org_1",
        inviterUserId: "admin_1",
        invitedEmail: "new@example.com",
        role: "ORG_USER",
      }),
    ).rejects.toMatchObject({ status: 503, code: "INVITE_PROVIDER_NOT_CONFIGURED" });
  });

  it("rejects revoked invite acceptance", async () => {
    const token = "abcd";
    mocks.findInvitationByTokenHash.mockResolvedValue({
      id: "inv_1",
      orgId: "org_1",
      tokenHash: hashInvitationToken(token),
      role: "ORG_USER",
      status: "REVOKED",
      expiresAt: new Date(Date.now() + 60_000),
      organization: { id: "org_1", name: "Org" },
      inviter: { id: "admin_1", name: "Admin", email: "admin@example.com" },
    });

    await expect(acceptInvitationByToken(token, "user_1", "user_1@example.com")).rejects.toMatchObject({
      status: 410,
    });
  });

  it("accept flow is replay-safe when already accepted", async () => {
    const token = "abcd";
    mocks.findInvitationByTokenHash.mockResolvedValue({
      id: "inv_1",
      orgId: "org_1",
      tokenHash: hashInvitationToken(token),
      role: "ORG_USER",
      status: "ACCEPTED",
      invitedEmail: "user_1@example.com",
      expiresAt: new Date(Date.now() + 60_000),
      organization: { id: "org_1", name: "Org" },
      inviter: { id: "admin_1", name: "Admin", email: "admin@example.com" },
    });
    mocks.findMembership.mockResolvedValue({ userId: "user_1", orgId: "org_1", role: "ORG_USER" });

    const result = await acceptInvitationByToken(token, "user_1", "user_1@example.com");
    expect(result).toMatchObject({ orgId: "org_1", alreadyMember: true });
  });

  it("rejects accept when authenticated email mismatches invite email", async () => {
    const token = "abcd";
    mocks.findInvitationByTokenHash.mockResolvedValue({
      id: "inv_1",
      orgId: "org_1",
      tokenHash: hashInvitationToken(token),
      invitedEmail: "invited@example.com",
      role: "ORG_USER",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60_000),
      organization: { id: "org_1", name: "Org" },
      inviter: { id: "admin_1", name: "Admin", email: "admin@example.com" },
    });

    await expect(acceptInvitationByToken(token, "user_1", "other@example.com")).rejects.toMatchObject({
      status: 403,
      code: "INVITE_FORBIDDEN",
    });
  });

  it("revokes pending invite", async () => {
    mocks.findInviteById.mockResolvedValue({ id: "inv_1", orgId: "org_1", status: "PENDING" });
    mocks.revokeInvitation.mockResolvedValue({ id: "inv_1" });

    await revokeInvitation("org_1", "inv_1");
    expect(mocks.revokeInvitation).toHaveBeenCalledWith("inv_1");
  });

  it("rejects self-invite by inviter email", async () => {
    await expect(
      createInvitation({
        orgId: "org_1",
        inviterUserId: "admin_1",
        invitedEmail: "admin@example.com",
        role: "ORG_USER",
      }),
    ).rejects.toMatchObject({ status: 400, code: "INVITE_CONFLICT" });
  });

  it("rejects invite when email already belongs to org member", async () => {
    mocks.findMembershipByEmail.mockResolvedValue({ userId: "user_2" });

    await expect(
      createInvitation({
        orgId: "org_1",
        inviterUserId: "admin_1",
        invitedEmail: "member@example.com",
        role: "ORG_USER",
      }),
    ).rejects.toMatchObject({ status: 409, code: "INVITE_CONFLICT" });
  });

  it("rejects invalid email format", async () => {
    await expect(
      createInvitation({
        orgId: "org_1",
        inviterUserId: "admin_1",
        invitedEmail: "not-an-email",
        role: "ORG_USER",
      }),
    ).rejects.toMatchObject({ status: 400, code: "INVITE_CONFLICT" });
  });

  it("restores previous token state when resend delivery fails", async () => {
    const priorExpiresAt = new Date(Date.now() + 60_000);
    mocks.findInviteById.mockResolvedValue({
      id: "inv_1",
      orgId: "org_1",
      inviterUserId: "admin_1",
      invitedEmail: "new@example.com",
      role: "ORG_USER",
      status: "PENDING",
      tokenHash: "old_hash",
      expiresAt: priorExpiresAt,
      acceptedAt: null,
      revokedAt: null,
    });
    mocks.rotateInvitationToken.mockResolvedValue({
      id: "inv_1",
      orgId: "org_1",
      inviterUserId: "admin_1",
      invitedEmail: "new@example.com",
      role: "ORG_USER",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 120_000),
      acceptedAt: null,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      inviter: { id: "admin_1", name: "Admin", email: "admin@example.com" },
    });
    mocks.notifyInvitation.mockRejectedValue(new Error("smtp down"));

    await expect(resendInvitation("org_1", "inv_1")).rejects.toMatchObject({
      status: 503,
      code: "INVITE_DELIVERY_FAILED",
    });

    expect(mocks.restoreInvitationToken).toHaveBeenCalledWith({
      inviteId: "inv_1",
      tokenHash: "old_hash",
      expiresAt: priorExpiresAt,
      status: "PENDING",
      acceptedAt: null,
      revokedAt: null,
    });
  });
});
