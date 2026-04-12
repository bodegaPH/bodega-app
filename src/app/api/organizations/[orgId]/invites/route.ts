import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { apiError } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import {
  createInvitation,
  InvitationsApiError,
  listPendingInvitations,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    const { orgId: requestedOrgId } = await params;
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

    const invites = await listPendingInvitations(requestedOrgId);
    return NextResponse.json({ invites });
  } catch (error) {
    if (error instanceof InvitationsApiError) {
      return mapInviteError(error);
    }

    console.error("Error listing invites:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    const { orgId: requestedOrgId } = await params;
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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    if (!isRecord(body) || typeof body.email !== "string") {
      return apiError("Invalid request body", 400);
    }

    if (body.role !== "ORG_ADMIN" && body.role !== "ORG_USER") {
      return apiError("Invalid request body", 400);
    }

    const role = body.role;
    const result = await createInvitation({
      orgId: requestedOrgId,
      inviterUserId: auth.session.user.id,
      invitedEmail: body.email,
      role,
    });

    return NextResponse.json(
      {
        invite: result.invitation,
        delivery: result.delivery,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof InvitationsApiError) {
      return mapInviteError(error);
    }

    console.error("Error creating invite:", error);
    return apiError("Internal server error", 500);
  }
}
