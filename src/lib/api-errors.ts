import { NextResponse } from "next/server";

export interface ApiErrorPayload {
  message: string;
  code?: string;
  details?: unknown;
  supportCode?: string;
  requestId?: string;
  retryAfterSeconds?: number;
}

export interface ApiErrorResponse {
  error: ApiErrorPayload;
}

interface ApiErrorOptions {
  code?: string;
  details?: unknown;
  supportCode?: string;
  requestId?: string;
  retryAfterSeconds?: number;
  headers?: HeadersInit;
}

export function apiError(
  message: string,
  status: number,
  options?: ApiErrorOptions
) {
  return NextResponse.json(
    {
      error: {
        message,
        ...(options?.code ? { code: options.code } : {}),
        ...(options?.details !== undefined ? { details: options.details } : {}),
        ...(options?.supportCode ? { supportCode: options.supportCode } : {}),
        ...(options?.requestId ? { requestId: options.requestId } : {}),
        ...(typeof options?.retryAfterSeconds === "number"
          ? { retryAfterSeconds: options.retryAfterSeconds }
          : {}),
      },
    } satisfies ApiErrorResponse,
    {
      status,
      headers: options?.headers,
    }
  );
}
