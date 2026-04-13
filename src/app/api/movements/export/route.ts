import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSupportCode, logOpEvent, resolveRequestId } from "@/lib/op-events";
import {
  exportMovementsCsv,
  InvalidMovementExportFiltersError,
  MovementExportCapExceededError,
  MovementExportRateLimitedError,
  MovementExportServerError,
  MovementExportTimeoutError,
  type MovementExportRequest,
} from "@/features/movements/server";

const NON_ENUMERATING_MESSAGE = "Not found";

export async function POST(request: Request) {
  const requestId = resolveRequestId(request.headers);
  const startedAt = Date.now();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      {
        error: {
          message: "Unauthorized",
          supportCode: getSupportCode("movement.export", "UNAUTHORIZED"),
          requestId,
        },
      },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_FILTERS",
          message: "Invalid JSON body",
          supportCode: getSupportCode("movement.export", "INVALID_FILTERS"),
          requestId,
        },
      },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_FILTERS",
          message: "Invalid request body",
          supportCode: getSupportCode("movement.export", "INVALID_FILTERS"),
          requestId,
        },
      },
      { status: 400 },
    );
  }

  const payload = body as Partial<MovementExportRequest>;

  const orgIdFromBody = (body as { orgId?: unknown }).orgId;
  if (typeof orgIdFromBody !== "string" || !orgIdFromBody.trim()) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_FILTERS",
          message: "orgId is required",
          supportCode: getSupportCode("movement.export", "INVALID_FILTERS"),
          requestId,
        },
      },
      { status: 400 },
    );
  }

  const normalizedOrgId = orgIdFromBody.trim();

  const membership = await prisma.membership.findUnique({
    where: {
      userId_orgId: {
        userId: session.user.id,
        orgId: normalizedOrgId,
      },
    },
    select: { role: true },
  });

  if (!membership || (membership.role !== "ORG_ADMIN" && membership.role !== "ORG_USER")) {
    return NextResponse.json(
      {
        error: {
          message: NON_ENUMERATING_MESSAGE,
          supportCode: getSupportCode("movement.export", "NOT_FOUND"),
          requestId,
        },
      },
      { status: 404 },
    );
  }

  try {
    const result = await exportMovementsCsv(normalizedOrgId, session.user.id, {
      mode: payload.mode as MovementExportRequest["mode"],
      filters: payload.filters,
      confirmedAll: payload.confirmedAll,
    });

    logOpEvent({
      requestId,
      orgId: normalizedOrgId,
      actorUserId: session.user.id,
      event: "movement.export",
      result: "success",
      durationMs: Date.now() - startedAt,
    });

    return new Response(result.content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    const actorUserId = session.user.id;
    const orgId = normalizedOrgId;
    if (error instanceof InvalidMovementExportFiltersError) {
      logOpEvent({
        requestId,
        orgId,
        actorUserId,
        event: "movement.export",
        result: "error",
        errorCode: error.code,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
            supportCode: getSupportCode("movement.export", error.code),
            requestId,
          },
        },
        { status: error.status },
      );
    }

    if (error instanceof MovementExportCapExceededError) {
      logOpEvent({
        requestId,
        orgId,
        actorUserId,
        event: "movement.export",
        result: "error",
        errorCode: error.code,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
            supportCode: getSupportCode("movement.export", error.code),
            requestId,
          },
        },
        { status: error.status },
      );
    }

    if (error instanceof MovementExportTimeoutError) {
      logOpEvent({
        requestId,
        orgId,
        actorUserId,
        event: "movement.export",
        result: "error",
        errorCode: error.code,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
            supportCode: getSupportCode("movement.export", error.code),
            requestId,
          },
        },
        { status: error.status },
      );
    }

    if (error instanceof MovementExportRateLimitedError) {
      logOpEvent({
        requestId,
        orgId,
        actorUserId,
        event: "movement.export",
        result: "error",
        errorCode: error.code,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
            retryAfterSeconds: error.retryAfterSeconds,
            supportCode: getSupportCode("movement.export", error.code),
            requestId,
          },
        },
        {
          status: error.status,
          headers: { "Retry-After": String(error.retryAfterSeconds) },
        },
      );
    }

    const fallback = error instanceof MovementExportServerError
      ? error
      : new MovementExportServerError();

    logOpEvent({
      requestId,
      orgId,
      actorUserId,
      event: "movement.export",
      result: "error",
      errorCode: fallback.code,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        error: {
          code: fallback.code,
          message: fallback.message,
          supportCode: getSupportCode("movement.export", fallback.code),
          requestId,
        },
      },
      { status: fallback.status },
    );
  }
}
