/**
 * Organizations Repository - Prisma data access layer
 * INTERNAL: Only import from service.ts within this module
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { MembershipRole } from "./types";

export function isPrismaNotFoundError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

function normalizeSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "org";
}

export async function createOrganization(name: string, userId: string) {
  const baseSlug = normalizeSlug(name);
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  const organization = await prisma.$transaction(async (tx) => {
    const createdOrganization = await tx.organization.create({
      data: {
        name,
        slug,
        ownerId: userId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    await tx.membership.create({
      data: {
        orgId: createdOrganization.id,
        userId,
        role: "ORG_ADMIN",
      },
    });

    await tx.location.create({
      data: {
        orgId: createdOrganization.id,
        name: "Default",
        isDefault: true,
      },
    });

    return createdOrganization;
  });

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug ?? slug,
    owner: organization.owner,
  };
}

export async function updateOrganization(orgId: string, name: string) {
  return prisma.organization.update({
    where: { id: orgId },
    data: { name },
    select: { id: true, name: true, slug: true },
  });
}

export async function findOrganizationName(orgId: string) {
  return prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });
}

export async function findOrganizationGovernance(orgId: string) {
  return prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      ownerId: true,
      owner: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getUserMemberships(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    select: { orgId: true },
  });
}

export async function deleteOrganizationCascade(orgId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.currentStock.deleteMany({ where: { orgId } });
    await tx.movement.deleteMany({ where: { orgId } });
    await tx.item.deleteMany({ where: { orgId } });
    await tx.location.deleteMany({ where: { orgId } });
    await tx.membership.deleteMany({ where: { orgId } });
    await tx.organization.delete({ where: { id: orgId } });
  });
}

export async function listMembers(orgId: string) {
  return prisma.membership.findMany({
    where: { orgId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { role: "desc" },
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
    },
    select: { id: true, name: true, email: true },
  });
}

export async function findMembership(orgId: string, userId: string) {
  return prisma.membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
}

export async function findMembershipWithUser(orgId: string, userId: string) {
  return prisma.membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function findMembershipForSwitch(userId: string, orgId: string) {
  return prisma.membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      },
    },
  });
}

export async function createMembership(orgId: string, userId: string, role: MembershipRole) {
  return prisma.membership.create({
    data: { orgId, userId, role },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function deleteMembership(orgId: string, userId: string) {
  return prisma.membership.delete({
    where: { userId_orgId: { userId, orgId } },
  });
}

export async function countAdmins(orgId: string) {
  return prisma.membership.count({
    where: { orgId, role: "ORG_ADMIN" },
  });
}

export async function updateMembershipRole(orgId: string, userId: string, role: MembershipRole) {
  return prisma.membership.update({
    where: { userId_orgId: { userId, orgId } },
    data: { role },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function transferOwnership(orgId: string, fromUserId: string, toUserId: string) {
  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.findUnique({
      where: { id: orgId },
      select: { id: true, ownerId: true },
    });

    if (!organization) {
      return null;
    }

    if (organization.ownerId !== fromUserId) {
      return { denied: true as const };
    }

    const targetMembership = await tx.membership.findUnique({
      where: { userId_orgId: { userId: toUserId, orgId } },
      select: { userId: true },
    });

    if (!targetMembership) {
      return { invalidTarget: true as const };
    }

    await tx.membership.update({
      where: { userId_orgId: { userId: toUserId, orgId } },
      data: { role: "ORG_ADMIN" },
    });

    const updatedOrg = await tx.organization.update({
      where: { id: orgId },
      data: { ownerId: toUserId },
      select: {
        id: true,
        ownerId: true,
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return { denied: false as const, invalidTarget: false as const, organization: updatedOrg };
  });
}
