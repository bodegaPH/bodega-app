import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/orgs/switch - Switch active organization
 * Body: { orgId: string }
 * Validates membership before allowing switch
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { orgId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { orgId } = body;
  if (!orgId) {
    return NextResponse.json(
      { error: "Organization ID is required" },
      { status: 400 }
    );
  }

  // Validate user has membership in this org
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
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      },
    },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "You are not a member of this organization" },
      { status: 403 }
    );
  }

  if (!membership.organization.isActive) {
    return NextResponse.json(
      { error: "This organization is inactive" },
      { status: 403 }
    );
  }

  // Return success - client will call update() to refresh token
  return NextResponse.json({
    success: true,
    org: {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      role: membership.role,
    },
  });
}
