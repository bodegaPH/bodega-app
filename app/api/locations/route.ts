import { NextResponse } from "next/server";
import {
  createLocation,
  getLocations,
  LocationApiError,
} from "@/features/locations/server";
import { requireAuthWithOrg } from "@/lib/api-auth";

function asErrorResponse(error: unknown) {
  if (error instanceof LocationApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  throw error;
}

export async function GET() {
  const auth = await requireAuthWithOrg();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const locations = await getLocations(auth.orgId);
    return NextResponse.json({ locations });
  } catch (error) {
    return asErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthWithOrg();
  if (!auth.success) {
    return auth.response;
  }

  let body: { name?: unknown; isDefault?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const location = await createLocation(auth.orgId, body);
    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    return asErrorResponse(error);
  }
}
