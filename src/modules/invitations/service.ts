import crypto from "crypto";
import type { MembershipRole } from "@/modules/organizations/types";
import * as repo from "./repository";
import { InvitationsApiError } from "./errors";
import { getInvitationNotifier } from "./notifier";
import type {
  AcceptInvitationResult,
  CreateInvitationInput,
  CreateInvitationResult,
  InviteRateLimitResult,
  OrganizationInvitation,
} from "./types";
import type { InvitationDeliveryResult } from "./notifier";

const INVITE_TTL_MS = 30 * 60 * 1000;
const INVITER_WINDOW_MS = 60 * 60 * 1000;
const ORG_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_COOLDOWN_MS = 2 * 60 * 1000;
const MAX_PER_INVITER_PER_WINDOW = 20;
const MAX_PER_ORG_PER_WINDOW = 50;

export { InvitationsApiError } from "./errors";

function normalizeEmail(email: unknown): string {
  if (typeof email !== "string") {
    throw new InvitationsApiError("Email is required", 400, "INVITE_CONFLICT");
  }
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    throw new InvitationsApiError("Email is required", 400, "INVITE_CONFLICT");
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    throw new InvitationsApiError("Invalid email", 400, "INVITE_CONFLICT");
  }
  return normalized;
}

function requireId(value: unknown, message: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!id) {
    throw new InvitationsApiError(message, 400, "INVITE_CONFLICT");
  }
  return id;
}

function assertRole(role: MembershipRole): void {
  if (role !== "ORG_ADMIN" && role !== "ORG_USER") {
    throw new InvitationsApiError("Invalid membership role", 400, "INVITE_CONFLICT");
  }
}

function mapInvitation(raw: Awaited<ReturnType<typeof repo.findInviteById>>): OrganizationInvitation {
  if (!raw) {
    throw new InvitationsApiError("Invitation not found", 404, "INVALID_INVITE");
  }

  return {
    id: raw.id,
    orgId: raw.orgId,
    inviterUserId: raw.inviterUserId,
    invitedEmail: raw.invitedEmail,
    role: raw.role,
    status: raw.status,
    expiresAt: raw.expiresAt,
    acceptedAt: raw.acceptedAt,
    revokedAt: raw.revokedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    inviter: raw.inviter,
  };
}

function getExpirationDate(from = new Date()): Date {
  return new Date(from.getTime() + INVITE_TTL_MS);
}

export function createRawInvitationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashInvitationToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function verifyInvitationToken(rawToken: string, tokenHash: string): boolean {
  const digest = hashInvitationToken(rawToken);
  const digestBuffer = Buffer.from(digest, "hex");
  const hashBuffer = Buffer.from(tokenHash, "hex");
  if (digestBuffer.length !== hashBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(digestBuffer, hashBuffer);
}

async function checkInviteRateLimit(input: {
  orgId: string;
  inviterUserId: string;
  invitedEmail: string;
  now?: Date;
}): Promise<InviteRateLimitResult> {
  const now = input.now ?? new Date();
  const inviterSince = new Date(now.getTime() - INVITER_WINDOW_MS);
  const orgSince = new Date(now.getTime() - ORG_WINDOW_MS);
  const [inviterCount, orgCount, latestEmailInvite] = await Promise.all([
    repo.countInvitesByInviterSince(input.inviterUserId, inviterSince),
    repo.countInvitesByOrgSince(input.orgId, orgSince),
    repo.findLatestInviteByEmail(input.orgId, input.invitedEmail),
  ]);

  if (inviterCount >= MAX_PER_INVITER_PER_WINDOW) {
    return { allowed: false, scope: "inviter", retryAfterSeconds: Math.ceil(INVITER_WINDOW_MS / 1000) };
  }

  if (orgCount >= MAX_PER_ORG_PER_WINDOW) {
    return { allowed: false, scope: "organization", retryAfterSeconds: Math.ceil(ORG_WINDOW_MS / 1000) };
  }

  if (latestEmailInvite) {
    const elapsed = now.getTime() - latestEmailInvite.createdAt.getTime();
    if (elapsed < EMAIL_COOLDOWN_MS) {
      return {
        allowed: false,
        scope: "email",
        retryAfterSeconds: Math.ceil((EMAIL_COOLDOWN_MS - elapsed) / 1000),
      };
    }
  }

  return { allowed: true };
}

export async function listPendingInvitations(orgId: string): Promise<OrganizationInvitation[]> {
  const validatedOrgId = requireId(orgId, "Organization ID is required");
  const rows = await repo.listActiveInvitesByOrg(validatedOrgId);
  return rows.map((row: {
    id: string;
    orgId: string;
    inviterUserId: string;
    invitedEmail: string;
    role: MembershipRole;
    status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
    expiresAt: Date;
    acceptedAt: Date | null;
    revokedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    inviter: { id: string; name: string | null; email: string | null };
  }) => ({
    id: row.id,
    orgId: row.orgId,
    inviterUserId: row.inviterUserId,
    invitedEmail: row.invitedEmail,
    role: row.role,
    status: row.status,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    inviter: row.inviter,
  }));
}

export async function createInvitation(input: CreateInvitationInput): Promise<CreateInvitationResult> {
  const orgId = requireId(input.orgId, "Organization ID is required");
  const inviterUserId = requireId(input.inviterUserId, "Inviter user ID is required");
  const invitedEmail = normalizeEmail(input.invitedEmail);
  assertRole(input.role);

  const inviter = await repo.findUserById(inviterUserId);
  const inviterEmail = inviter?.email?.trim().toLowerCase();
  if (inviterEmail && inviterEmail === invitedEmail) {
    throw new InvitationsApiError(
      "You cannot send an invitation to your own email",
      400,
      "INVITE_CONFLICT",
    );
  }

  const existingMembershipByEmail = await repo.findMembershipByEmail(orgId, invitedEmail);
  if (existingMembershipByEmail) {
    throw new InvitationsApiError(
      "User is already a member of this organization",
      409,
      "INVITE_CONFLICT",
    );
  }

  const rateLimit = await checkInviteRateLimit({ orgId, inviterUserId, invitedEmail });
  if (!rateLimit.allowed) {
    throw new InvitationsApiError("Invite rate limited", 429, "INVITE_RATE_LIMITED", rateLimit);
  }

  const pending = await repo.findPendingInviteByEmail(orgId, invitedEmail);
  if (pending && pending.status === "PENDING" && pending.expiresAt > new Date()) {
    throw new InvitationsApiError("Pending invitation already exists", 409, "INVITE_CONFLICT");
  }

  const token = createRawInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const invitation = await repo.createInvitation({
    orgId,
    inviterUserId,
    invitedEmail,
    role: input.role,
    tokenHash,
    expiresAt: getExpirationDate(),
  });

  let delivery: InvitationDeliveryResult;
  try {
    const notifier = getInvitationNotifier();
    delivery = await notifier.notifyInvitation({
      requestId: input.requestId,
      invitationId: invitation.id,
      orgId: invitation.orgId,
      inviterUserId: invitation.inviterUserId,
      invitedEmail: invitation.invitedEmail,
      role: invitation.role,
      token,
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    await repo.revokeInvitation(invitation.id);
    if (error instanceof InvitationsApiError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unknown invite delivery failure";
    const code = /(provider.*configured|not configured)/i.test(message)
      ? "INVITE_PROVIDER_NOT_CONFIGURED"
      : "INVITE_DELIVERY_FAILED";

    throw new InvitationsApiError(
      code === "INVITE_PROVIDER_NOT_CONFIGURED"
        ? "Invitation provider is not configured"
        : "Invitation delivery failed",
      503,
      code,
      { reason: message },
    );
  }

  return {
    invitation: {
      id: invitation.id,
      orgId: invitation.orgId,
      inviterUserId: invitation.inviterUserId,
      invitedEmail: invitation.invitedEmail,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      revokedAt: invitation.revokedAt,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
      inviter: invitation.inviter,
    },
    token,
    delivery,
  };
}

export async function resendInvitation(
  orgId: string,
  inviteId: string,
  requestId?: string,
): Promise<CreateInvitationResult> {
  const validatedOrgId = requireId(orgId, "Organization ID is required");
  const validatedInviteId = requireId(inviteId, "Invitation ID is required");

  const invite = await repo.findInviteById(validatedInviteId);
  if (!invite || invite.orgId !== validatedOrgId) {
    throw new InvitationsApiError("Invitation not found", 404, "INVALID_INVITE");
  }
  if (invite.status === "REVOKED") {
    throw new InvitationsApiError("Invitation has been revoked", 410, "INVITE_REVOKED");
  }
  if (invite.status === "ACCEPTED") {
    throw new InvitationsApiError("Invitation already accepted", 409, "INVITE_ACCEPTED");
  }

  const limiter = await checkInviteRateLimit({
    orgId: invite.orgId,
    inviterUserId: invite.inviterUserId,
    invitedEmail: invite.invitedEmail,
  });
  if (!limiter.allowed) {
    throw new InvitationsApiError("Invite rate limited", 429, "INVITE_RATE_LIMITED", limiter);
  }

  const token = createRawInvitationToken();
  const updated = await repo.rotateInvitationToken({
    inviteId: invite.id,
    tokenHash: hashInvitationToken(token),
    expiresAt: getExpirationDate(),
  });

  let delivery: InvitationDeliveryResult;
  try {
    const notifier = getInvitationNotifier();
    delivery = await notifier.notifyInvitation({
      requestId,
      invitationId: updated.id,
      orgId: updated.orgId,
      inviterUserId: updated.inviterUserId,
      invitedEmail: updated.invitedEmail,
      role: updated.role,
      token,
      expiresAt: updated.expiresAt,
    });
  } catch (error) {
    await repo.restoreInvitationToken({
      inviteId: invite.id,
      tokenHash: invite.tokenHash,
      expiresAt: invite.expiresAt,
      status: invite.status,
      acceptedAt: invite.acceptedAt,
      revokedAt: invite.revokedAt,
    });

    if (error instanceof InvitationsApiError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unknown invite delivery failure";
    const code = /(provider.*configured|not configured)/i.test(message)
      ? "INVITE_PROVIDER_NOT_CONFIGURED"
      : "INVITE_DELIVERY_FAILED";

    throw new InvitationsApiError(
      code === "INVITE_PROVIDER_NOT_CONFIGURED"
        ? "Invitation provider is not configured"
        : "Invitation delivery failed",
      503,
      code,
      { reason: message },
    );
  }

  return {
    invitation: {
      id: updated.id,
      orgId: updated.orgId,
      inviterUserId: updated.inviterUserId,
      invitedEmail: updated.invitedEmail,
      role: updated.role,
      status: updated.status,
      expiresAt: updated.expiresAt,
      acceptedAt: updated.acceptedAt,
      revokedAt: updated.revokedAt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      inviter: updated.inviter,
    },
    token,
    delivery,
  };
}

export async function revokeInvitation(orgId: string, inviteId: string): Promise<void> {
  const validatedOrgId = requireId(orgId, "Organization ID is required");
  const validatedInviteId = requireId(inviteId, "Invitation ID is required");
  const invite = await repo.findInviteById(validatedInviteId);
  if (!invite || invite.orgId !== validatedOrgId) {
    throw new InvitationsApiError("Invitation not found", 404, "INVALID_INVITE");
  }
  if (invite.status === "ACCEPTED") {
    throw new InvitationsApiError("Invitation already accepted", 409, "INVITE_ACCEPTED");
  }
  if (invite.status === "REVOKED") {
    return;
  }
  await repo.revokeInvitation(validatedInviteId);
}

export async function getInvitationContextByToken(rawToken: string) {
  const normalized = requireId(rawToken, "Invite token is required");
  const tokenHash = hashInvitationToken(normalized);
  const invite = await repo.findInvitationByTokenHash(tokenHash);
  if (!invite) {
    throw new InvitationsApiError("Invitation not found", 404, "INVALID_INVITE");
  }
  if (!verifyInvitationToken(normalized, invite.tokenHash)) {
    throw new InvitationsApiError("Invitation not found", 404, "INVALID_INVITE");
  }

  if (invite.status === "REVOKED") {
    throw new InvitationsApiError("Invitation has been revoked", 410, "INVITE_REVOKED");
  }

  if (invite.status === "ACCEPTED") {
    throw new InvitationsApiError("Invitation already accepted", 409, "INVITE_ACCEPTED");
  }

  if (invite.expiresAt <= new Date()) {
    await repo.updateInvitationStatus(invite.id, "EXPIRED");
    throw new InvitationsApiError("Invitation has expired", 410, "INVITE_EXPIRED");
  }

  return invite;
}

export async function acceptInvitationByToken(
  rawToken: string,
  userId: string,
  userEmail?: string | null,
): Promise<AcceptInvitationResult> {
  const validatedUserId = requireId(userId, "User ID is required");
  const token = requireId(rawToken, "Invite token is required");
  const invite = await repo.findInvitationByTokenHash(hashInvitationToken(token));
  if (!invite || !verifyInvitationToken(token, invite.tokenHash)) {
    throw new InvitationsApiError("Invitation not found", 404, "INVALID_INVITE");
  }

  if (invite.status === "REVOKED") {
    throw new InvitationsApiError("Invitation has been revoked", 410, "INVITE_REVOKED");
  }

  if (invite.expiresAt <= new Date()) {
    await repo.updateInvitationStatus(invite.id, "EXPIRED");
    throw new InvitationsApiError("Invitation has expired", 410, "INVITE_EXPIRED");
  }

  if (typeof userEmail !== "string" || !userEmail.trim()) {
    throw new InvitationsApiError("Invitation is not for this account", 403, "INVITE_FORBIDDEN");
  }
  const normalizedUserEmail = normalizeEmail(userEmail);
  if (normalizedUserEmail !== invite.invitedEmail.trim().toLowerCase()) {
    throw new InvitationsApiError("Invitation is not for this account", 403, "INVITE_FORBIDDEN");
  }

  return repo.transaction(async (tx) => {
    const fresh = await repo.findInvitationByTokenHash(hashInvitationToken(token));
    if (!fresh) {
      throw new InvitationsApiError("Invitation not found", 404, "INVALID_INVITE");
    }

    if (fresh.status === "ACCEPTED") {
      const existing = await repo.findMembership(fresh.orgId, validatedUserId, tx);
      return {
        invitationId: fresh.id,
        orgId: fresh.orgId,
        role: fresh.role,
        alreadyMember: Boolean(existing),
      };
    }

    if (fresh.status === "REVOKED") {
      throw new InvitationsApiError("Invitation has been revoked", 410, "INVITE_REVOKED");
    }

    if (fresh.expiresAt <= new Date()) {
      await repo.updateInvitationStatus(fresh.id, "EXPIRED", tx);
      throw new InvitationsApiError("Invitation has expired", 410, "INVITE_EXPIRED");
    }

    const membership = await repo.findMembership(fresh.orgId, validatedUserId, tx);
    if (!membership) {
      try {
        await repo.createMembership(fresh.orgId, validatedUserId, fresh.role, tx);
      } catch (error) {
        if (!repo.isPrismaKnownError(error, "P2002")) {
          throw error;
        }
      }
    }

    await repo.updateInvitationStatus(fresh.id, "ACCEPTED", tx);

    return {
      invitationId: fresh.id,
      orgId: fresh.orgId,
      role: fresh.role,
      alreadyMember: Boolean(membership),
    };
  });
}

export async function getInvitePreviewByToken(rawToken: string) {
  const invite = await getInvitationContextByToken(rawToken);
  return {
    orgId: invite.orgId,
    orgName: invite.organization.name,
    invitedEmail: invite.invitedEmail,
    role: invite.role,
    expiresAt: invite.expiresAt,
    inviter: invite.inviter,
  };
}

export async function getInvitationById(orgId: string, inviteId: string): Promise<OrganizationInvitation> {
  const invite = await repo.findInviteById(requireId(inviteId, "Invitation ID is required"));
  if (!invite || invite.orgId !== requireId(orgId, "Organization ID is required")) {
    throw new InvitationsApiError("Invitation not found", 404, "INVALID_INVITE");
  }
  return mapInvitation(invite);
}
