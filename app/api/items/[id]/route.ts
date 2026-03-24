import { NextResponse } from "next/server";
import { requireAuthWithOrg } from "@/lib/api-auth";
import { deleteItem, ItemApiError, updateItem } from "@/features/items/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function asErrorResponse(error: unknown) {
  if (error instanceof ItemApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  throw error;
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAuthWithOrg();
  if (!auth.success) {
    return auth.response;
  }

  const { id } = await context.params;

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
    const item = await updateItem(auth.orgId, id, body);
    return NextResponse.json({ item });
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
    await deleteItem(auth.orgId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return asErrorResponse(error);
  }
}
