import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { apiError } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import {
  InvitationsApiError,
  resendInvitation,
  revokeInvitation,
} from "@/features/organizations/server";

function mapInviteError(error: InvitationsApiError) {
  if (error.code === "INVITE_RATE_LIMITED") {
    const retryAfter =
      typeof (error.details as { retryAfterSeconds?: unknown })?.retryAfterSeconds === "number"
        ? (error.details as { retryAfterSeconds: number }).retryAfterSeconds
        : 0;
    return apiError(error.message, error.status, {
      code: error.code,
      details: error.details,
      headers: retryAfter > 0 ? { "Retry-After": String(retryAfter) } : undefined,
    });
  }

  return apiError(error.message, error.status, {
    code: error.code,
    details: error.details,
  });
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ orgId: string; inviteId: string }> },
) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    const { orgId: requestedOrgId, inviteId } = await params;
    const membership = await prisma.membership.findUnique({
      where: {
        userId_orgId: {
          userId: auth.session.user.id,
          orgId: requestedOrgId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!membership) {
      return apiError("Not found", 404);
    }

    if (membership.role !== "ORG_ADMIN") {
      return apiError("Insufficient permissions", 403);
    }

    const result = await resendInvitation(requestedOrgId, inviteId);
    return NextResponse.json({
      invite: result.invitation,
      delivery: result.delivery,
    });
  } catch (error) {
    if (error instanceof InvitationsApiError) {
      return mapInviteError(error);
    }

    console.error("Error resending invite:", error);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgId: string; inviteId: string }> },
) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    const { orgId: requestedOrgId, inviteId } = await params;
    const membership = await prisma.membership.findUnique({
      where: {
        userId_orgId: {
          userId: auth.session.user.id,
          orgId: requestedOrgId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!membership) {
      return apiError("Not found", 404);
    }

    if (membership.role !== "ORG_ADMIN") {
      return apiError("Insufficient permissions", 403);
    }

    await revokeInvitation(requestedOrgId, inviteId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof InvitationsApiError) {
      return mapInviteError(error);
    }

    console.error("Error revoking invite:", error);
    return apiError("Internal server error", 500);
  }
}
