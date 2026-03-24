import { NextResponse } from "next/server";
import { requireAuthWithOrg } from "@/lib/api-auth";
import {
  createMovement,
  getMovements,
  MovementApiError,
  type GetMovementsFilters,
} from "@/features/movements/server";

function asErrorResponse(error: unknown) {
  if (error instanceof MovementApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  throw error;
}

function parseDateParam(value: string | null, fieldLabel: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new MovementApiError(`Invalid ${fieldLabel} date`, 400);
  }

  return parsed;
}

function parsePaginationParam(
  value: string | null,
  fieldLabel: string,
  fallback: number,
  min: number,
  max: number
) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new MovementApiError(`${fieldLabel} must be a valid integer`, 400);
  }

  return Math.min(max, Math.max(min, parsed));
}

export async function GET(request: Request) {
  const auth = await requireAuthWithOrg();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters: GetMovementsFilters = {
      itemId: searchParams.get("itemId") ?? undefined,
      locationId: searchParams.get("locationId") ?? undefined,
      from: parseDateParam(searchParams.get("from"), "from"),
      to: parseDateParam(searchParams.get("to"), "to"),
      page: parsePaginationParam(searchParams.get("page"), "page", 1, 1, Number.MAX_SAFE_INTEGER),
      limit: parsePaginationParam(searchParams.get("limit"), "limit", 50, 1, 100),
    };

    const response = await getMovements(auth.orgId, filters);
    return NextResponse.json(response);
  } catch (error) {
    return asErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthWithOrg();
  if (!auth.success) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const parsedBody =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : {};

    const movement = await createMovement(auth.orgId, {
      ...parsedBody,
      createdById: auth.session.user.id,
    });

    return NextResponse.json({ movement }, { status: 201 });
  } catch (error) {
    return asErrorResponse(error);
  }
}
