import { NextResponse } from "next/server";
import { requireAuthWithOrg } from "@/lib/api-auth";
import { deleteItem, ItemApiError, updateItem } from "@/features/items/server";
import { updateItemSchema } from "@/features/items/schemas";

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
  const auth = await requireAuthWithOrg({ allowedRoles: ["ORG_ADMIN", "ORG_USER"] });
  if (!auth.success) {
    return auth.response;
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = updateItemSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.format() }, { status: 400 });
  }

  try {
    const item = await updateItem(auth.orgId, id, validation.data);
    return NextResponse.json({ item });
  } catch (error) {
    return asErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAuthWithOrg({ allowedRoles: ["ORG_ADMIN", "ORG_USER"] });
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
