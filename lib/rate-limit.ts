interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const ipRequestCounts = new Map<string, RateLimitRecord>();

// Periodic cleanup to prevent memory leaks
const CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 minutes

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRequestCounts.entries()) {
    if (record.resetAt < now) {
      ipRequestCounts.delete(ip);
    }
  }
}, CLEANUP_INTERVAL);

// Prevent interval from keeping process alive
if (typeof global !== "undefined" && "unref" in global) {
  // Node.js environment - unref not available on setInterval return in all versions
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export function checkRateLimit(
  ip: string,
  limit = 5,
  windowMs = 15 * 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const record = ipRequestCounts.get(ip);

  // Window expired or first request - start fresh
  if (!record || record.resetAt < now) {
    const resetAt = now + windowMs;
    ipRequestCounts.set(ip, { count: 1, resetAt });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Math.floor(resetAt / 1000),
    };
  }

  // Increment FIRST to prevent race condition in async gaps
  record.count += 1;

  // Check if limit exceeded AFTER increment
  if (record.count > limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: Math.floor(record.resetAt / 1000),
    };
  }

  return {
    success: true,
    limit,
    remaining: limit - record.count,
    reset: Math.floor(record.resetAt / 1000),
  };
}

/**
 * Extract client IP from request headers.
 * Uses multiple header sources with fallback chain for better proxy support.
 */
export function getClientIp(request: Request): string {
  // Cloudflare
  const cfConnecting = request.headers.get("cf-connecting-ip");
  if (cfConnecting) {
    return cfConnecting.trim();
  }

  // Common reverse proxy header
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // Standard forwarded header (take first IP in chain)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return "unknown";
}
