import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const INVITE_IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000;
const INVITE_IDEMPOTENCY_PRUNE_INTERVAL_MS = 60 * 1000;
const INVITE_IDEMPOTENCY_IN_PROGRESS_STATUS = 0;
const INVITE_IDEMPOTENCY_IN_PROGRESS_RETRY_AFTER_SECONDS = 2;

type InviteIdempotencyOperation = "invite.create" | "invite.resend";

export type StoredIdempotencyResponse = {
  responseStatus: number;
  responseBody: unknown;
};

export type AcquireInviteIdempotencyResult =
  | {
      state: "acquired";
    }
  | {
      state: "in-progress";
      retryAfterSeconds: number;
    }
  | {
      state: "replay";
      response: StoredIdempotencyResponse;
    };

let lastInviteIdempotencyPruneAt = 0;

function nowWithWindow() {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_IDEMPOTENCY_WINDOW_MS);
  return { now, expiresAt };
}

async function pruneExpiredInviteIdempotencyRecordsBestEffort(now: Date) {
  const nowMs = now.getTime();
  if (nowMs - lastInviteIdempotencyPruneAt < INVITE_IDEMPOTENCY_PRUNE_INTERVAL_MS) {
    return;
  }

  lastInviteIdempotencyPruneAt = nowMs;
  await prisma.operationIdempotency.deleteMany({
    where: {
      expiresAt: { lte: now },
    },
  });
}

function asStoredReplay(row: { responseStatus: number; responseBody: unknown }) {
  return {
    responseStatus: row.responseStatus,
    responseBody: row.responseBody,
  } satisfies StoredIdempotencyResponse;
}

export async function acquireInviteIdempotency(input: {
  orgId: string;
  actorUserId: string;
  operation: InviteIdempotencyOperation;
  key: string;
}): Promise<AcquireInviteIdempotencyResult> {
  const { now, expiresAt } = nowWithWindow();

  void pruneExpiredInviteIdempotencyRecordsBestEffort(now).catch(() => undefined);

  let retriedExpiredConflict = false;
  while (true) {
    try {
      await prisma.operationIdempotency.create({
        data: {
          orgId: input.orgId,
          actorUserId: input.actorUserId,
          operation: input.operation,
          idempotencyKey: input.key,
          responseStatus: INVITE_IDEMPOTENCY_IN_PROGRESS_STATUS,
          responseBody: {
            state: "in_progress",
          } satisfies Prisma.InputJsonObject,
          expiresAt,
        },
      });

      return { state: "acquired" };
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2002"
      ) {
        throw error;
      }

      const existing = await prisma.operationIdempotency.findUnique({
        where: {
          orgId_actorUserId_operation_idempotencyKey: {
            orgId: input.orgId,
            actorUserId: input.actorUserId,
            operation: input.operation,
            idempotencyKey: input.key,
          },
        },
        select: {
          responseStatus: true,
          responseBody: true,
          expiresAt: true,
        },
      });

      if (!existing) {
        if (retriedExpiredConflict) {
          return {
            state: "in-progress",
            retryAfterSeconds: INVITE_IDEMPOTENCY_IN_PROGRESS_RETRY_AFTER_SECONDS,
          };
        }
        retriedExpiredConflict = true;
        continue;
      }

      if (existing.expiresAt <= now && !retriedExpiredConflict) {
        retriedExpiredConflict = true;
        await prisma.operationIdempotency.deleteMany({
          where: {
            orgId: input.orgId,
            actorUserId: input.actorUserId,
            operation: input.operation,
            idempotencyKey: input.key,
            expiresAt: { lte: now },
          },
        });
        continue;
      }

      if (existing.responseStatus === INVITE_IDEMPOTENCY_IN_PROGRESS_STATUS) {
        return {
          state: "in-progress",
          retryAfterSeconds: Math.max(
            INVITE_IDEMPOTENCY_IN_PROGRESS_RETRY_AFTER_SECONDS,
            Math.ceil((existing.expiresAt.getTime() - now.getTime()) / 1000),
          ),
        };
      }

      if (existing.expiresAt > now) {
        return {
          state: "replay",
          response: asStoredReplay(existing),
        };
      }

      return {
        state: "in-progress",
        retryAfterSeconds: INVITE_IDEMPOTENCY_IN_PROGRESS_RETRY_AFTER_SECONDS,
      };
    }
  }
}

export async function finalizeInviteIdempotency(input: {
  orgId: string;
  actorUserId: string;
  operation: InviteIdempotencyOperation;
  key: string;
  responseStatus: number;
  responseBody: unknown;
}) {
  const { now, expiresAt } = nowWithWindow();
  await prisma.operationIdempotency.updateMany({
    where: {
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      operation: input.operation,
      idempotencyKey: input.key,
      responseStatus: INVITE_IDEMPOTENCY_IN_PROGRESS_STATUS,
    },
    data: {
      responseStatus: input.responseStatus,
      responseBody: input.responseBody as Prisma.InputJsonValue,
      expiresAt,
    },
  });

  void pruneExpiredInviteIdempotencyRecordsBestEffort(now).catch(() => undefined);
}
