import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateOrganization: vi.fn(),
  findOrganizationName: vi.fn(),
  createOrganization: vi.fn(),
  getUserMemberships: vi.fn(),
  deleteOrganizationCascade: vi.fn(),
  listMembers: vi.fn(),
  findUserByEmail: vi.fn(),
  findMembership: vi.fn(),
  findMembershipWithUser: vi.fn(),
  findMembershipForSwitch: vi.fn(),
  createMembership: vi.fn(),
  deleteMembership: vi.fn(),
  countAdmins: vi.fn(),
  updateMembershipRole: vi.fn(),
  findOrganizationGovernance: vi.fn(),
  transferOwnership: vi.fn(),
  isPrismaNotFoundError: vi.fn(),
  getItemCount: vi.fn(),
  getLocationCount: vi.fn(),
  getMovementCount: vi.fn(),
  getStockCount: vi.fn(),
}));

vi.mock("../repository", () => ({
  updateOrganization: mocks.updateOrganization,
  findOrganizationName: mocks.findOrganizationName,
  createOrganization: mocks.createOrganization,
  getUserMemberships: mocks.getUserMemberships,
  deleteOrganizationCascade: mocks.deleteOrganizationCascade,
  listMembers: mocks.listMembers,
  findUserByEmail: mocks.findUserByEmail,
  findMembership: mocks.findMembership,
  findMembershipWithUser: mocks.findMembershipWithUser,
  findMembershipForSwitch: mocks.findMembershipForSwitch,
  createMembership: mocks.createMembership,
  deleteMembership: mocks.deleteMembership,
  countAdmins: mocks.countAdmins,
  updateMembershipRole: mocks.updateMembershipRole,
  findOrganizationGovernance: mocks.findOrganizationGovernance,
  transferOwnership: mocks.transferOwnership,
  isPrismaNotFoundError: mocks.isPrismaNotFoundError,
}));

vi.mock("@/modules/items", () => ({ getDataCount: mocks.getItemCount }));
vi.mock("@/modules/locations", () => ({ getDataCount: mocks.getLocationCount }));
vi.mock("@/modules/movements", () => ({ getDataCount: mocks.getMovementCount }));
vi.mock("@/modules/inventory", () => ({ getDataCount: mocks.getStockCount }));

import {
  deleteOrganization,
  getMembers,
  removeMember,
  transferOwnership,
  updateMemberRole,
} from "../service";

describe("organizations governance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getItemCount.mockResolvedValue(1);
    mocks.getLocationCount.mockResolvedValue(1);
    mocks.getMovementCount.mockResolvedValue(1);
    mocks.getStockCount.mockResolvedValue(1);
  });

  it("denies destructive delete for non-owner", async () => {
    mocks.getUserMemberships.mockResolvedValue([{ orgId: "org_1" }, { orgId: "org_2" }]);
    mocks.findOrganizationGovernance.mockResolvedValue({ ownerId: "owner_1" });
    mocks.findMembership.mockResolvedValue({ userId: "owner_1", role: "ORG_ADMIN" });

    await expect(
      deleteOrganization("org_1", { requesterUserId: "admin_2", ownerConfirmation: "DELETE" })
    ).rejects.toMatchObject({ status: 403 });

    expect(mocks.getItemCount).not.toHaveBeenCalled();
    expect(mocks.getLocationCount).not.toHaveBeenCalled();
    expect(mocks.getMovementCount).not.toHaveBeenCalled();
    expect(mocks.getStockCount).not.toHaveBeenCalled();
  });

  it("requires owner confirmation payload for orgs with data", async () => {
    mocks.getUserMemberships.mockResolvedValue([{ orgId: "org_1" }, { orgId: "org_2" }]);
    mocks.findOrganizationGovernance.mockResolvedValue({ ownerId: "owner_1" });
    mocks.findMembership.mockResolvedValue({ userId: "owner_1", role: "ORG_ADMIN" });

    await expect(
      deleteOrganization("org_1", { requesterUserId: "owner_1" })
    ).resolves.toMatchObject({ deleted: false, requiresConfirmation: true });
  });

  it("blocks removing owner via member removal path", async () => {
    mocks.findMembership.mockResolvedValueOnce({ userId: "owner_1", role: "ORG_ADMIN" });
    mocks.findOrganizationGovernance.mockResolvedValue({ ownerId: "owner_1" });
    mocks.findMembership.mockResolvedValueOnce({ userId: "owner_1", role: "ORG_ADMIN" });

    await expect(removeMember("org_1", "owner_1")).rejects.toMatchObject({ status: 400 });
  });

  it("blocks demoting owner away from admin role", async () => {
    mocks.findMembershipWithUser.mockResolvedValue({
      userId: "owner_1",
      role: "ORG_ADMIN",
      user: { id: "owner_1", name: "Owner", email: "o@example.com" },
    });
    mocks.findOrganizationGovernance.mockResolvedValue({ ownerId: "owner_1" });
    mocks.findMembership.mockResolvedValue({ userId: "owner_1", role: "ORG_ADMIN" });

    await expect(updateMemberRole("org_1", "owner_1", "ORG_USER")).rejects.toMatchObject({
      status: 400,
    });
  });

  it("transfers ownership for valid owner actor and member target", async () => {
    mocks.transferOwnership.mockResolvedValue({
      denied: false,
      invalidTarget: false,
      organization: {
        id: "org_1",
        ownerId: "member_2",
        owner: { id: "member_2", name: "Member", email: "m@example.com" },
      },
    });

    const result = await transferOwnership("org_1", {
      actorUserId: "owner_1",
      targetUserId: "member_2",
    });

    expect(result).toEqual({
      organizationId: "org_1",
      owner: { id: "member_2", name: "Member", email: "m@example.com" },
    });
  });

  it("denies ownership transfer when actor is not owner", async () => {
    mocks.transferOwnership.mockResolvedValue({ denied: true });

    await expect(
      transferOwnership("org_1", { actorUserId: "admin_2", targetUserId: "member_3" })
    ).rejects.toMatchObject({ status: 403 });
  });

  it("denies ownership transfer when target is not a member", async () => {
    mocks.transferOwnership.mockResolvedValue({ invalidTarget: true });

    await expect(
      transferOwnership("org_1", { actorUserId: "owner_1", targetUserId: "outsider_1" })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("marks owner correctly in members list using strict owner mapping", async () => {
    mocks.listMembers.mockResolvedValue([
      {
        role: "ORG_ADMIN",
        user: { id: "owner_1", name: "Owner", email: "owner@example.com" },
      },
      {
        role: "ORG_USER",
        user: { id: "user_2", name: "User", email: "user@example.com" },
      },
    ]);
    mocks.findOrganizationGovernance.mockResolvedValue({ ownerId: "owner_1" });

    const result = await getMembers("org_1");

    expect(result).toEqual([
      {
        id: "owner_1",
        name: "Owner",
        email: "owner@example.com",
        role: "ORG_ADMIN",
        isOwner: true,
      },
      {
        id: "user_2",
        name: "User",
        email: "user@example.com",
        role: "ORG_USER",
        isOwner: false,
      },
    ]);
  });
});
