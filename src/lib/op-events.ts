import crypto from "crypto";

type OpResult = "success" | "error";
const REQUEST_ID_MAX_LENGTH = 128;
const REQUEST_ID_ALLOWED = /^[A-Za-z0-9._:-]+$/;

export type OpEventPayload = {
  requestId: string;
  orgId: string;
  actorUserId: string;
  event: string;
  result: OpResult;
  errorCode?: string;
  durationMs: number;
};

export function resolveRequestId(headers: Headers): string {
  const fromHeader = headers.get("x-request-id")?.trim() ?? "";
  if (
    fromHeader &&
    fromHeader.length <= REQUEST_ID_MAX_LENGTH &&
    REQUEST_ID_ALLOWED.test(fromHeader)
  ) {
    return fromHeader;
  }
  return crypto.randomUUID();
}

export function getSupportCode(event: string, errorCode: string | undefined): string {
  const normalizedEvent = event
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  const normalizedError = (errorCode ?? "UNKNOWN")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  return `${normalizedEvent}_${normalizedError}`;
}

export function logOpEvent(payload: OpEventPayload) {
  console.info("[op-event]", payload);
}
