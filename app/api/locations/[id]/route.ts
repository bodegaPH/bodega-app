import { NextResponse } from "next/server";
import {
  deleteLocation,
  LocationApiError,
  updateLocation,
} from "@/features/locations/server";
import { requireAuthWithOrg } from "@/lib/api-auth";

function asErrorResponse(error: unknown) {
  if (error instanceof LocationApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  throw error;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAuthWithOrg();
  if (!auth.success) {
    return auth.response;
  }

  const { id } = await context.params;

  let body: { name?: unknown; isDefault?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const location = await updateLocation(auth.orgId, id, body);
    return NextResponse.json({ location });
  } catch (error) {
    return asErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAuthWithOrg();
  if (!auth.success) {
    return auth.response;
  }

  const { id } = await context.params;

  try {
    await deleteLocation(auth.orgId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return asErrorResponse(error);
  }
}
