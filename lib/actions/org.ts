"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type CreateOrgResult =
  | { success: true; orgId: string }
  | { success: false; error: string };

type SwitchOrgResult =
  | { success: true; orgId: string }
  | { success: false; error: string };

/**
 * Server action to create a new organization.
 * Creates org, membership (as ORG_ADMIN), and default location.
 * Redirects to dashboard on success.
 */
export async function createOrg(formData: FormData): Promise<CreateOrgResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const name = formData.get("name")?.toString().trim();
  if (!name) {
    return { success: false, error: "Organization name is required" };
  }

  if (name.length < 2) {
    return { success: false, error: "Organization name must be at least 2 characters" };
  }

  if (name.length > 100) {
    return { success: false, error: "Organization name must be 100 characters or less" };
  }

  // Generate slug from name
  let baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  if (!baseSlug) {
    baseSlug = "org";
  }

  // Ensure unique slug
  let slug = baseSlug;
  let counter = 1;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Create org and membership in transaction
  const org = await prisma.$transaction(async (tx) => {
    const newOrg = await tx.organization.create({
      data: {
        name,
        slug,
      },
    });

    await tx.membership.create({
      data: {
        userId: session.user.id,
        orgId: newOrg.id,
        role: "ORG_ADMIN",
      },
    });

    // Create default location for the org (Ticket 6 prerequisite)
    await tx.location.create({
      data: {
        orgId: newOrg.id,
        name: "Default",
        isDefault: true,
      },
    });

    return newOrg;
  });

  // Redirect to dashboard - the layout will set activeOrgId
  redirect("/dashboard");
}

/**
 * Server action to switch active organization.
 * Validates membership and returns orgId for client to update session.
 */
export async function switchOrg(orgId: string): Promise<SwitchOrgResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  if (!orgId) {
    return { success: false, error: "Organization ID is required" };
  }

  // Validate membership
  const membership = await prisma.membership.findUnique({
    where: {
      userId_orgId: {
        userId: session.user.id,
        orgId,
      },
    },
    include: {
      organization: {
        select: {
          isActive: true,
        },
      },
    },
  });

  if (!membership) {
    return { success: false, error: "You are not a member of this organization" };
  }

  if (!membership.organization.isActive) {
    return { success: false, error: "This organization is inactive" };
  }

  // Revalidate to refresh data with new org context
  revalidatePath("/");

  return { success: true, orgId };
}
