import { NextResponse } from "next/server";

export interface ApiErrorPayload {
  message: string;
  code?: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  error: ApiErrorPayload;
}

interface ApiErrorOptions {
  code?: string;
  details?: unknown;
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
      },
    } satisfies ApiErrorResponse,
    {
      status,
      headers: options?.headers,
    }
  );
}
