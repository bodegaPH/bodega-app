import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { Session } from "next-auth";
import { prisma } from "@/lib/db";
import { MembershipRole } from "@prisma/client";

type AuthResult =
  | { success: true; session: Session }
  | { success: false; response: NextResponse };

type AuthWithOrgResult =
  | {
      success: true;
      session: Session;
      orgId: string;
      orgRole: MembershipRole;
    }
  | { success: false; response: NextResponse };

/**
 * Validates auth for API routes. Returns discriminated union for type safety.
 *
 * Usage:
 * ```ts
 * const auth = await requireAuth();
 * if (!auth.success) return auth.response;
 * const { session } = auth;
 * ```
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      success: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { success: true, session };
}

/**
 * Validates auth AND org membership for org-scoped API routes.
 * Returns session, orgId, and user's role in that org.
 *
 * Usage:
 * ```ts
 * const auth = await requireAuthWithOrg();
 * if (!auth.success) return auth.response;
 * const { session, orgId, orgRole } = auth;
 * ```
 */
export async function requireAuthWithOrg(): Promise<AuthWithOrgResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      success: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const activeOrgId = session.user.activeOrgId;
  if (!activeOrgId) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      ),
    };
  }

  // Validate membership still exists
  const membership = await prisma.membership.findUnique({
    where: {
      userId_orgId: {
        userId: session.user.id,
        orgId: activeOrgId,
      },
    },
  });

  if (!membership) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 }
      ),
    };
  }

  return {
    success: true,
    session,
    orgId: activeOrgId,
    orgRole: membership.role,
  };
}
