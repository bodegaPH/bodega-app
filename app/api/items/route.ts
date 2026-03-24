import { NextResponse } from "next/server";
import { requireAuthWithOrg } from "@/lib/api-auth";
import { createItem, getItems, ItemApiError } from "@/features/items/server";

function asErrorResponse(error: unknown) {
  if (error instanceof ItemApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  throw error;
}

export async function GET(request: Request) {
  const auth = await requireAuthWithOrg();
  if (!auth.success) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get("includeInactive") === "true";

  try {
    const items = await getItems(auth.orgId, { includeInactive });
    return NextResponse.json({ items });
  } catch (error) {
    return asErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthWithOrg();
  if (!auth.success) {
    return auth.response;
  }

  let body: {
    name?: unknown;
    sku?: unknown;
    unit?: unknown;
    category?: unknown;
    lowStockThreshold?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const item = await createItem(auth.orgId, body);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return asErrorResponse(error);
  }
}
