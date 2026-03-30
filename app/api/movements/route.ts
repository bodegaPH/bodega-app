import { NextResponse } from "next/server";
import { requireAuthWithOrg } from "@/lib/api-auth";
import {
  createMovement,
  getMovements,
  MovementApiError,
  type GetMovementsFilters,
} from "@/features/movements/server";
import { createMovementSchema } from "@/features/movements/schemas";
import { handleApiError } from "@/lib/api-handler";
import { apiError } from "@/lib/api-errors";

function asErrorResponse(error: unknown) {
  return handleApiError(error);
}

function parseDateParam(value: string | null, fieldLabel: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const iso8601Pattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
  if (!iso8601Pattern.test(value)) {
    throw new MovementApiError(
      `Invalid ${fieldLabel} date: must be ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)`,
      400
    );
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new MovementApiError(
      `Invalid ${fieldLabel} date: must be ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)`,
      400
    );
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
      page: parsePaginationParam(searchParams.get("page"), "page", 1, 1, 10000),
      limit: parsePaginationParam(searchParams.get("limit"), "limit", 50, 1, 100),
    };

    const response = await getMovements(auth.orgId, filters);
    return NextResponse.json(response);
  } catch (error) {
    return asErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthWithOrg({ allowedRoles: ["ORG_ADMIN", "ORG_USER"] });
  if (!auth.success) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const validation = createMovementSchema.safeParse(body);
  if (!validation.success) {
    return apiError("Validation failed", 400, {
      code: "VALIDATION_ERROR",
      details: validation.error.flatten(),
    });
  }

  try {
    const movement = await createMovement(auth.orgId, {
      ...validation.data,
      createdById: auth.session.user.id,
    });

    return NextResponse.json({ movement }, { status: 201 });
  } catch (error) {
    return asErrorResponse(error);
  }
}
