export type InvitationErrorCode =
  | "INVALID_INVITE"
  | "INVITE_EXPIRED"
  | "INVITE_REVOKED"
  | "INVITE_ACCEPTED"
  | "INVITE_RATE_LIMITED"
  | "INVITE_CONFLICT"
  | "INVITE_FORBIDDEN"
  | "INVITE_DELIVERY_FAILED"
  | "INVITE_PROVIDER_NOT_CONFIGURED";

export class InvitationsApiError extends Error {
  status: number;
  code: InvitationErrorCode;
  details?: unknown;

  constructor(message: string, status: number, code: InvitationErrorCode, details?: unknown) {
    super(message);
    this.name = "InvitationsApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
