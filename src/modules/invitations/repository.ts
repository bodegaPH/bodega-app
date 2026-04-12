import { Prisma, type MembershipRole } from "@prisma/client";
import { prisma } from "@/lib/db";

type TxClient = Prisma.TransactionClient;

function db(tx?: TxClient) {
  return tx ?? prisma;
}

export function isPrismaKnownError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

export async function listActiveInvitesByOrg(orgId: string) {
  const now = new Date();
  return prisma.organizationInvitation.findMany({
    where: { orgId, status: "PENDING", expiresAt: { gt: now } },
    include: {
      inviter: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function countInvitesByInviterSince(inviterUserId: string, since: Date) {
  return prisma.organizationInvitation.count({
    where: { inviterUserId, createdAt: { gte: since } },
  });
}

export async function countInvitesByOrgSince(orgId: string, since: Date) {
  return prisma.organizationInvitation.count({
    where: { orgId, createdAt: { gte: since } },
  });
}

export async function findLatestInviteByEmail(orgId: string, invitedEmail: string) {
  return prisma.organizationInvitation.findFirst({
    where: { orgId, invitedEmail },
    orderBy: { createdAt: "desc" },
  });
}

export async function findPendingInviteByEmail(orgId: string, invitedEmail: string) {
  return prisma.organizationInvitation.findFirst({
    where: { orgId, invitedEmail, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
}

export async function findUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
}

export async function findMembershipByEmail(orgId: string, invitedEmail: string) {
  return prisma.membership.findFirst({
    where: {
      orgId,
      user: {
        email: { equals: invitedEmail, mode: "insensitive" },
      },
    },
    select: {
      userId: true,
    },
  });
}

export async function createInvitation(input: {
  orgId: string;
  inviterUserId: string;
  invitedEmail: string;
  role: MembershipRole;
  tokenHash: string;
  expiresAt: Date;
}) {
  return prisma.organizationInvitation.create({
    data: input,
    include: {
      inviter: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function findInviteById(inviteId: string) {
  return prisma.organizationInvitation.findUnique({
    where: { id: inviteId },
    include: {
      inviter: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function rotateInvitationToken(input: {
  inviteId: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  return prisma.organizationInvitation.update({
    where: { id: input.inviteId },
    data: {
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      status: "PENDING",
      revokedAt: null,
      acceptedAt: null,
    },
    include: {
      inviter: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function restoreInvitationToken(input: {
  inviteId: string;
  tokenHash: string;
  expiresAt: Date;
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  acceptedAt: Date | null;
  revokedAt: Date | null;
}) {
  return prisma.organizationInvitation.update({
    where: { id: input.inviteId },
    data: {
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      status: input.status,
      acceptedAt: input.acceptedAt,
      revokedAt: input.revokedAt,
    },
  });
}

export async function revokeInvitation(inviteId: string) {
  return prisma.organizationInvitation.update({
    where: { id: inviteId },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
    },
  });
}

export async function findInvitationByTokenHash(tokenHash: string) {
  return prisma.organizationInvitation.findUnique({
    where: { tokenHash },
    include: {
      organization: { select: { id: true, name: true } },
      inviter: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function updateInvitationStatus(
  inviteId: string,
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED",
  tx?: TxClient,
) {
  return db(tx).organizationInvitation.update({
    where: { id: inviteId },
    data: {
      status,
      acceptedAt: status === "ACCEPTED" ? new Date() : null,
      revokedAt: status === "REVOKED" ? new Date() : null,
    },
  });
}

export async function findMembership(orgId: string, userId: string, tx?: TxClient) {
  return db(tx).membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
}

export async function createMembership(
  orgId: string,
  userId: string,
  role: MembershipRole,
  tx?: TxClient,
) {
  return db(tx).membership.create({
    data: { orgId, userId, role },
  });
}

export async function transaction<T>(callback: (tx: TxClient) => Promise<T>) {
  return prisma.$transaction((tx) => callback(tx));
}

export async function expireStalePendingInvites(now: Date) {
  return prisma.organizationInvitation.updateMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: now },
    },
    data: {
      status: "EXPIRED",
    },
  });
}
