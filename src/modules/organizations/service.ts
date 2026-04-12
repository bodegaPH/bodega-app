/**
 * Organizations Service - Public API for the organizations module
 * Uses other modules for data counts instead of direct Prisma queries
 */
import * as repo from "./repository";
import { OrganizationsApiError } from "./errors";
import { getDataCount as getItemCount } from "@/modules/items";
import { getDataCount as getLocationCount } from "@/modules/locations";
import { getDataCount as getMovementCount } from "@/modules/movements";
import { getDataCount as getStockCount } from "@/modules/inventory";
import type {
  MembershipRole,
  OrganizationOwner,
  OrganizationMember,
  OrganizationDataCounts,
  UpdateOrganizationPayload,
  AddMemberPayload,
  DeleteOrganizationOptions,
  DeleteOrganizationResult,
  TransferOwnershipPayload,
  TransferOwnershipResult,
} from "./types";

export { OrganizationsApiError } from "./errors";
export type {
  OrganizationMember,
  OrganizationOwner,
  OrganizationDataCounts,
  UpdateOrganizationPayload,
  AddMemberPayload,
  DeleteOrganizationOptions,
  DeleteOrganizationResult,
  TransferOwnershipPayload,
  TransferOwnershipResult,
} from "./types";

function requireOrgId(orgId: string): string {
  const trimmed = orgId?.trim();
  if (!trimmed) {
    throw new OrganizationsApiError("Organization ID is required", 400);
  }
  return trimmed;
}

function validateOrganizationName(name: unknown): string {
  if (typeof name !== "string") {
    throw new OrganizationsApiError("Organization name is required", 400);
  }

  const trimmed = name.trim();
  if (!trimmed) {
    throw new OrganizationsApiError("Organization name is required", 400);
  }

  if (trimmed.length < 2) {
    throw new OrganizationsApiError("Organization name must be at least 2 characters", 400);
  }

  if (trimmed.length > 100) {
    throw new OrganizationsApiError("Organization name must be 100 characters or less", 400);
  }

  return trimmed;
}

function normalizeMemberEmail(email: unknown): string {
  if (typeof email !== "string") {
    throw new OrganizationsApiError("Email is required", 400);
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    throw new OrganizationsApiError("Email is required", 400);
  }

  return normalized;
}

function mapMembershipToMember(
  membership: {
    role: MembershipRole;
    user: { id: string; name: string | null; email: string | null };
  },
  ownerId: string
): OrganizationMember {
  return {
    id: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    role: membership.role,
    isOwner: membership.user.id === ownerId,
  };
}

export async function getOrganizationOwner(orgId: string): Promise<OrganizationOwner> {
  const validatedOrgId = requireOrgId(orgId);
  const organization = await repo.findOrganizationGovernance(validatedOrgId);

  if (!organization?.owner) {
    throw new OrganizationsApiError("Organization owner is not configured", 409);
  }

  const ownerMembership = await repo.findMembership(validatedOrgId, organization.ownerId);
  if (!ownerMembership) {
    throw new OrganizationsApiError("Organization owner must be a member", 409);
  }

  return organization.owner;
}

export async function updateOrganization(orgId: string, payload: UpdateOrganizationPayload) {
  const validatedOrgId = requireOrgId(orgId);
  const validatedName = validateOrganizationName(payload?.name);

  try {
    return await repo.updateOrganization(validatedOrgId, validatedName);
  } catch (error) {
    if (repo.isPrismaNotFoundError(error)) {
      throw new OrganizationsApiError("Not found", 404);
    }
    throw error;
  }
}

export async function getOrganizationName(orgId: string): Promise<string | null> {
  const validatedOrgId = requireOrgId(orgId);
  const organization = await repo.findOrganizationName(validatedOrgId);
  return organization?.name ?? null;
}

export async function createOrganization(input: { name: string; userId: string }) {
  const validatedName = validateOrganizationName(input?.name);
  const validatedUserId = typeof input?.userId === "string" ? input.userId.trim() : "";

  if (!validatedUserId) {
    throw new OrganizationsApiError("User ID is required", 400);
  }

  return repo.createOrganization(validatedName, validatedUserId);
}

async function assertSingleOwnerInvariant(orgId: string): Promise<{ ownerId: string }> {
  const organization = await repo.findOrganizationGovernance(orgId);
  if (!organization?.ownerId) {
    throw new OrganizationsApiError("Organization owner is not configured", 409);
  }

  const ownerMembership = await repo.findMembership(orgId, organization.ownerId);
  if (!ownerMembership) {
    throw new OrganizationsApiError("Organization owner must be a member", 409);
  }

  return { ownerId: organization.ownerId };
}

/**
 * Get organization data counts using other modules' service functions.
 * This is the proper modular monolith pattern - no direct Prisma queries.
 */
async function getOrganizationDataCounts(orgId: string): Promise<OrganizationDataCounts> {
  const [items, locations, movements, stock] = await Promise.all([
    getItemCount(orgId),
    getLocationCount(orgId),
    getMovementCount(orgId),
    getStockCount(orgId),
  ]);

  return { items, locations, movements, stock };
}

export async function deleteOrganization(
  orgId: string,
  options?: DeleteOrganizationOptions
): Promise<DeleteOrganizationResult> {
  const validatedOrgId = requireOrgId(orgId);

  if (!options?.requesterUserId) {
    throw new OrganizationsApiError("Requester user ID is required", 400);
  }

  const userMemberships = await repo.getUserMemberships(options.requesterUserId);

  if (userMemberships.length <= 1) {
    throw new OrganizationsApiError("Cannot delete your last organization", 400);
  }

  const nextOrgId = userMemberships.find((m) => m.orgId !== validatedOrgId)?.orgId;
  if (!nextOrgId) {
    throw new OrganizationsApiError("No valid organization to switch to", 400);
  }

  const { ownerId } = await assertSingleOwnerInvariant(validatedOrgId);
  if (ownerId !== options.requesterUserId) {
    throw new OrganizationsApiError("Only the organization owner can delete this organization", 403);
  }

  const details = await getOrganizationDataCounts(validatedOrgId);
  const hasData = details.items > 0 || details.locations > 0 || details.movements > 0 || details.stock > 0;

  if (hasData && options.ownerConfirmation !== "DELETE") {
    return { deleted: false, requiresConfirmation: true, details };
  }

  await repo.deleteOrganizationCascade(validatedOrgId);
  return { deleted: true, nextOrgId };
}

export async function validateMembershipForSwitch(input: { userId: string; orgId: string }) {
  const validatedUserId = typeof input?.userId === "string" ? input.userId.trim() : "";
  const validatedOrgId = requireOrgId(input?.orgId);

  if (!validatedUserId) {
    throw new OrganizationsApiError("User ID is required", 400);
  }

  const membership = await repo.findMembershipForSwitch(validatedUserId, validatedOrgId);

  if (!membership) {
    return { valid: false as const, reason: "You are not a member of this organization" };
  }

  if (!membership.organization.isActive) {
    return { valid: false as const, reason: "This organization is inactive" };
  }

  return {
    valid: true as const,
    membership: {
      userId: membership.userId,
      orgId: membership.orgId,
      role: membership.role,
      organization: membership.organization,
    },
  };
}

export async function getMembers(orgId: string): Promise<OrganizationMember[]> {
  const validatedOrgId = requireOrgId(orgId);
  const members = await repo.listMembers(validatedOrgId);
  const governance = await repo.findOrganizationGovernance(validatedOrgId);
  const ownerId = governance?.ownerId?.trim() ?? "";

  return members.map((membership) => mapMembershipToMember(membership, ownerId));
}

export async function addMember(orgId: string, payload: AddMemberPayload): Promise<OrganizationMember> {
  const validatedOrgId = requireOrgId(orgId);
  const email = normalizeMemberEmail(payload?.email);
  const role = payload?.role ?? "ORG_USER";

  if (role !== "ORG_ADMIN" && role !== "ORG_USER") {
    throw new OrganizationsApiError("Invalid membership role", 400);
  }

  const user = await repo.findUserByEmail(email);
  if (!user) {
    throw new OrganizationsApiError("User not found", 404);
  }

  const existingMembership = await repo.findMembership(validatedOrgId, user.id);
  if (existingMembership) {
    throw new OrganizationsApiError("User is already a member of this organization", 409);
  }

  const { ownerId } = await assertSingleOwnerInvariant(validatedOrgId);
  const createdMembership = await repo.createMembership(validatedOrgId, user.id, role);
  return mapMembershipToMember(createdMembership, ownerId);
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
  const validatedOrgId = requireOrgId(orgId);
  const validatedUserId = userId?.trim();

  if (!validatedUserId) {
    throw new OrganizationsApiError("User ID is required", 400);
  }

  const membership = await repo.findMembership(validatedOrgId, validatedUserId);
  if (!membership) {
    throw new OrganizationsApiError("Member not found", 404);
  }

  const { ownerId } = await assertSingleOwnerInvariant(validatedOrgId);
  if (validatedUserId === ownerId) {
    throw new OrganizationsApiError("Cannot remove the organization owner", 400);
  }

  if (membership.role === "ORG_ADMIN") {
    const adminCount = await repo.countAdmins(validatedOrgId);
    if (adminCount <= 1) {
      throw new OrganizationsApiError("Cannot remove the last organization admin", 400);
    }
  }

  await repo.deleteMembership(validatedOrgId, validatedUserId);
}

export async function updateMemberRole(
  orgId: string,
  userId: string,
  role: MembershipRole
): Promise<OrganizationMember> {
  const validatedOrgId = requireOrgId(orgId);
  const validatedUserId = userId?.trim();

  if (!validatedUserId) {
    throw new OrganizationsApiError("User ID is required", 400);
  }

  if (role !== "ORG_ADMIN" && role !== "ORG_USER") {
    throw new OrganizationsApiError("Invalid membership role", 400);
  }

  const membership = await repo.findMembershipWithUser(validatedOrgId, validatedUserId);
  if (!membership) {
    throw new OrganizationsApiError("Member not found", 404);
  }

  const { ownerId } = await assertSingleOwnerInvariant(validatedOrgId);
  if (validatedUserId === ownerId && role !== "ORG_ADMIN") {
    throw new OrganizationsApiError("Organization owner must remain an admin", 400);
  }

  if (membership.role === "ORG_ADMIN" && role === "ORG_USER") {
    const adminCount = await repo.countAdmins(validatedOrgId);
    if (adminCount <= 1) {
      throw new OrganizationsApiError("Organization must have at least one admin", 400);
    }
  }

  const updatedMembership = await repo.updateMembershipRole(validatedOrgId, validatedUserId, role);
  return mapMembershipToMember(updatedMembership, ownerId);
}

export async function transferOwnership(
  orgId: string,
  payload: TransferOwnershipPayload
): Promise<TransferOwnershipResult> {
  const validatedOrgId = requireOrgId(orgId);
  const actorUserId = typeof payload?.actorUserId === "string" ? payload.actorUserId.trim() : "";
  const targetUserId = typeof payload?.targetUserId === "string" ? payload.targetUserId.trim() : "";

  if (!actorUserId) {
    throw new OrganizationsApiError("Actor user ID is required", 400);
  }

  if (!targetUserId) {
    throw new OrganizationsApiError("Target user ID is required", 400);
  }

  if (actorUserId === targetUserId) {
    throw new OrganizationsApiError("Target user is already the owner", 400);
  }

  const result = await repo.transferOwnership(validatedOrgId, actorUserId, targetUserId);

  if (!result) {
    throw new OrganizationsApiError("Not found", 404);
  }

  if ("denied" in result && result.denied) {
    throw new OrganizationsApiError("Only the organization owner can transfer ownership", 403);
  }

  if ("invalidTarget" in result && result.invalidTarget) {
    throw new OrganizationsApiError("Transfer target must be an existing organization member", 400);
  }

  if (!result.organization.owner) {
    throw new OrganizationsApiError("Organization owner is not configured", 409);
  }

  return {
    organizationId: result.organization.id,
    owner: result.organization.owner,
  };
}
