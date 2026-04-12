import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { apiError } from "@/lib/api-errors";
import { acceptInvitationByToken, InvitationsApiError } from "@/modules/invitations";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.success) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  if (!isRecord(body) || typeof body.token !== "string") {
    return apiError("Invalid request body", 400);
  }

  try {
    const result = await acceptInvitationByToken(
      body.token,
      auth.session.user.id,
      auth.session.user.email,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof InvitationsApiError) {
      return apiError(error.message, error.status, { code: error.code, details: error.details });
    }
    return apiError("Internal server error", 500);
  }
}
