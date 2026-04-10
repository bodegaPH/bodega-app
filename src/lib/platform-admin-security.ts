import { createHmac, timingSafeEqual } from "node:crypto";

export const PLATFORM_ADMIN_STEP_UP_COOKIE = "bodega_pa_step_up";
export const PLATFORM_ADMIN_STEP_UP_TTL_MS = 10 * 60 * 1000;

export const SENSITIVE_PLATFORM_ADMIN_ACTIONS = [
  "platform_admin.role_change",
  "platform_admin.org_deactivate",
  "platform_admin.org_delete",
  "platform_admin.billing_config_update",
  "platform_admin.security_config_update",
  "platform_admin.data_export",
] as const;

export type SensitivePlatformAdminAction =
  (typeof SENSITIVE_PLATFORM_ADMIN_ACTIONS)[number];

type StepUpTokenPayload = {
  userId: string;
  issuedAt: number;
  expiresAt: number;
};

type StepUpValidationResult =
  | { valid: true; payload: StepUpTokenPayload }
  | { valid: false; reason: "missing" | "malformed" | "invalid_signature" | "expired" };

function getStepUpSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for platform admin step-up security");
  }

  return secret;
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf-8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf-8");
}

function sign(value: string): string {
  return createHmac("sha256", getStepUpSecret()).update(value).digest("base64url");
}

export function isSensitivePlatformAdminAction(
  action: string,
): action is SensitivePlatformAdminAction {
  return SENSITIVE_PLATFORM_ADMIN_ACTIONS.includes(
    action as SensitivePlatformAdminAction,
  );
}

export function issueStepUpToken(
  userId: string,
  now = Date.now(),
  ttlMs = PLATFORM_ADMIN_STEP_UP_TTL_MS,
): string {
  const payload: StepUpTokenPayload = {
    userId,
    issuedAt: now,
    expiresAt: now + ttlMs,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function validateStepUpToken(
  token: string | null | undefined,
  now = Date.now(),
): StepUpValidationResult {
  if (!token) {
    return { valid: false, reason: "missing" };
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return { valid: false, reason: "malformed" };
  }

  const expectedSignature = sign(encodedPayload);
  const givenBuffer = Buffer.from(signature, "utf-8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf-8");
  if (
    givenBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(givenBuffer, expectedBuffer)
  ) {
    return { valid: false, reason: "invalid_signature" };
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as StepUpTokenPayload;
    if (
      !payload ||
      typeof payload.userId !== "string" ||
      typeof payload.issuedAt !== "number" ||
      typeof payload.expiresAt !== "number"
    ) {
      return { valid: false, reason: "malformed" };
    }

    if (payload.expiresAt <= now) {
      return { valid: false, reason: "expired" };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, reason: "malformed" };
  }
}

export function isPrivilegedStepUpRevoked(
  stepUpIssuedAtMs: number,
  userUpdatedAt: Date,
): boolean {
  return userUpdatedAt.getTime() > stepUpIssuedAtMs;
}

export type PlatformSecurityAuditEvent = {
  event:
    | "platform_admin_authz_denied"
    | "platform_admin_step_up_succeeded"
    | "platform_admin_step_up_failed"
    | "platform_admin_sensitive_action_executed";
  actorUserId?: string;
  action?: string;
  path?: string;
  outcome: "allow" | "deny";
  reason?: string;
};

export function logPlatformSecurityAudit(event: PlatformSecurityAuditEvent): void {
  console.info(
    JSON.stringify({
      type: "platform_security_audit",
      timestamp: new Date().toISOString(),
      ...event,
    }),
  );
}
