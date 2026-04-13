import { MOVEMENT_EXPORT_RATE_LIMITS } from "./constants";
import {
  checkAndRecordMovementExportThrottleEventAtomic,
} from "./repository";

type Bucket = {
  count: number;
  resetAt: number;
};

const userPerOrgBuckets = new Map<string, Bucket>();
const orgBuckets = new Map<string, Bucket>();
const PRUNE_INTERVAL_MS = 60_000;
let lastPruneAt = 0;

function pruneExpiredBuckets(now: number) {
  if (now - lastPruneAt < PRUNE_INTERVAL_MS) {
    return;
  }

  for (const [key, bucket] of userPerOrgBuckets) {
    if (bucket.resetAt <= now) {
      userPerOrgBuckets.delete(key);
    }
  }

  for (const [key, bucket] of orgBuckets) {
    if (bucket.resetAt <= now) {
      orgBuckets.delete(key);
    }
  }

  lastPruneAt = now;
}

function checkLimit(map: Map<string, Bucket>, key: string, windowMs: number, maxRequests: number) {
  const now = Date.now();
  pruneExpiredBuckets(now);
  const existing = map.get(key);

  if (!existing || existing.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true as const, retryAfterSeconds: 0 };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false as const,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  map.set(key, existing);
  return { allowed: true as const, retryAfterSeconds: 0 };
}

export function checkMovementExportRateLimit(orgId: string, userId: string) {
  const userKey = `${orgId}:${userId}`;
  const userResult = checkLimit(
    userPerOrgBuckets,
    userKey,
    MOVEMENT_EXPORT_RATE_LIMITS.perUserPerOrg.windowMs,
    MOVEMENT_EXPORT_RATE_LIMITS.perUserPerOrg.maxRequests,
  );

  if (!userResult.allowed) {
    return userResult;
  }

  const orgResult = checkLimit(
    orgBuckets,
    orgId,
    MOVEMENT_EXPORT_RATE_LIMITS.perOrg.windowMs,
    MOVEMENT_EXPORT_RATE_LIMITS.perOrg.maxRequests,
  );

  return orgResult;
}

export async function checkDurableMovementExportRateLimit(orgId: string, userId: string) {
  return checkAndRecordMovementExportThrottleEventAtomic(orgId, userId);
}

export function resetMovementExportRateLimiterForTests() {
  userPerOrgBuckets.clear();
  orgBuckets.clear();
  lastPruneAt = 0;
}
