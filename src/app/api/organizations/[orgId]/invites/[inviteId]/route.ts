import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { apiError } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import { getSupportCode, logOpEvent, resolveRequestId } from "@/lib/op-events";
import {
  InvitationsApiError,
  resendInvitation,
  revokeInvitation,
} from "@/features/organizations/server";
import {
  acquireInviteIdempotency,
  finalizeInviteIdempotency,
} from "@/modules/invitations/idempotency";

function buildInviteError(error: InvitationsApiError, requestId: string, event: string) {
  const supportCode = getSupportCode(event, error.code);
  if (error.code === "INVITE_RATE_LIMITED") {
    const retryAfter =
      typeof (error.details as { retryAfterSeconds?: unknown })?.retryAfterSeconds === "number"
        ? (error.details as { retryAfterSeconds: number }).retryAfterSeconds
        : 0;
    return {
      status: error.status,
      body: {
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
          supportCode,
          requestId,
          ...(retryAfter > 0 ? { retryAfterSeconds: retryAfter } : {}),
        },
      },
      headers: retryAfter > 0 ? { "Retry-After": String(retryAfter) } : undefined,
      retryAfterSeconds: retryAfter > 0 ? retryAfter : undefined,
    };
  }

  return {
    status: error.status,
    body: {
      error: {
        message: error.message,
        code: error.code,
        details: error.details,
        supportCode,
        requestId,
      },
    },
  };
}

function mapInviteError(error: InvitationsApiError, requestId: string, event: string) {
  const mapped = buildInviteError(error, requestId, event);
  return apiError(error.message, mapped.status, {
    code: error.code,
    details: error.details,
    supportCode: mapped.body.error.supportCode,
    requestId,
    retryAfterSeconds: mapped.retryAfterSeconds,
    headers: mapped.headers,
  });
}

function unauthorizedInviteError(event: string, requestId: string, status: number) {
  const supportCode = getSupportCode(event, status === 403 ? "FORBIDDEN" : "UNAUTHORIZED");
  return apiError(status === 403 ? "Forbidden" : "Unauthorized", status, {
    supportCode,
    requestId,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; inviteId: string }> },
) {
  const requestId = resolveRequestId(req.headers);
  const startedAt = Date.now();

  try {
    const auth = await requireAuth();
    if (!auth.success) {
      return unauthorizedInviteError("invite.resend", requestId, auth.response.status);
    }

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
      return apiError("Not found", 404, {
        supportCode: getSupportCode("invite.resend", "NOT_FOUND"),
        requestId,
      });
    }

    if (membership.role !== "ORG_ADMIN") {
      return apiError("Insufficient permissions", 403, {
        supportCode: getSupportCode("invite.resend", "FORBIDDEN"),
        requestId,
      });
    }

    const idempotencyKey = req.headers.get("idempotency-key")?.trim();
    let finalizeOnComplete = false;
    if (idempotencyKey) {
      const claim = await acquireInviteIdempotency({
        orgId: requestedOrgId,
        actorUserId: auth.session.user.id,
        operation: "invite.resend",
        key: idempotencyKey,
      });

      if (claim.state === "replay") {
        logOpEvent({
          requestId,
          orgId: requestedOrgId,
          actorUserId: auth.session.user.id,
          event: "invite.resend",
          result: "success",
          durationMs: Date.now() - startedAt,
        });
        return NextResponse.json(claim.response.responseBody, { status: claim.response.responseStatus });
      }

      if (claim.state === "in-progress") {
        return apiError("Request with this idempotency key is already in progress", 409, {
          code: "IDEMPOTENCY_IN_PROGRESS",
          supportCode: getSupportCode("invite.resend", "IDEMPOTENCY_IN_PROGRESS"),
          requestId,
          retryAfterSeconds: claim.retryAfterSeconds,
          headers: {
            "Retry-After": String(claim.retryAfterSeconds),
          },
        });
      }

      finalizeOnComplete = true;
    }

    const responseStatus = 200;
    let responseBody: Record<string, unknown>;

    try {
      const result = await resendInvitation(requestedOrgId, inviteId, requestId);
      responseBody = {
        invite: result.invitation,
        delivery: result.delivery,
      };
    } catch (error) {
      if (error instanceof InvitationsApiError) {
        const mapped = buildInviteError(error, requestId, "invite.resend");
        if (idempotencyKey && finalizeOnComplete) {
          await finalizeInviteIdempotency({
            orgId: requestedOrgId,
            actorUserId: auth.session.user.id,
            operation: "invite.resend",
            key: idempotencyKey,
            responseStatus: mapped.status,
            responseBody: mapped.body,
          });
        }
      }
      throw error;
    }

    if (idempotencyKey && finalizeOnComplete) {
      await finalizeInviteIdempotency({
        orgId: requestedOrgId,
        actorUserId: auth.session.user.id,
        operation: "invite.resend",
        key: idempotencyKey,
        responseStatus,
        responseBody,
      });
    }

    logOpEvent({
      requestId,
      orgId: requestedOrgId,
      actorUserId: auth.session.user.id,
      event: "invite.resend",
      result: "success",
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(responseBody, { status: responseStatus });
  } catch (error) {
    if (error instanceof InvitationsApiError) {
      logOpEvent({
        requestId,
        orgId: "unknown",
        actorUserId: "unknown",
        event: "invite.resend",
        result: "error",
        errorCode: error.code,
        durationMs: Date.now() - startedAt,
      });
      return mapInviteError(error, requestId, "invite.resend");
    }

    console.error("Error resending invite:", error);
    logOpEvent({
      requestId,
      orgId: "unknown",
      actorUserId: "unknown",
      event: "invite.resend",
      result: "error",
      errorCode: "SERVER_ERROR",
      durationMs: Date.now() - startedAt,
    });
    return apiError("Internal server error", 500, {
      code: "SERVER_ERROR",
      supportCode: getSupportCode("invite.resend", "SERVER_ERROR"),
      requestId,
    });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; inviteId: string }> },
) {
  const requestId = resolveRequestId(req.headers);
  const startedAt = Date.now();

  try {
    const auth = await requireAuth();
    if (!auth.success) {
      return unauthorizedInviteError("invite.revoke", requestId, auth.response.status);
    }

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
      return apiError("Not found", 404, {
        supportCode: getSupportCode("invite.revoke", "NOT_FOUND"),
        requestId,
      });
    }

    if (membership.role !== "ORG_ADMIN") {
      return apiError("Insufficient permissions", 403, {
        supportCode: getSupportCode("invite.revoke", "FORBIDDEN"),
        requestId,
      });
    }

    await revokeInvitation(requestedOrgId, inviteId);
    logOpEvent({
      requestId,
      orgId: requestedOrgId,
      actorUserId: auth.session.user.id,
      event: "invite.revoke",
      result: "success",
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof InvitationsApiError) {
      logOpEvent({
        requestId,
        orgId: "unknown",
        actorUserId: "unknown",
        event: "invite.revoke",
        result: "error",
        errorCode: error.code,
        durationMs: Date.now() - startedAt,
      });
      return mapInviteError(error, requestId, "invite.revoke");
    }

    console.error("Error revoking invite:", error);
    logOpEvent({
      requestId,
      orgId: "unknown",
      actorUserId: "unknown",
      event: "invite.revoke",
      result: "error",
      errorCode: "SERVER_ERROR",
      durationMs: Date.now() - startedAt,
    });
    return apiError("Internal server error", 500, {
      code: "SERVER_ERROR",
      supportCode: getSupportCode("invite.revoke", "SERVER_ERROR"),
      requestId,
    });
  }
}
