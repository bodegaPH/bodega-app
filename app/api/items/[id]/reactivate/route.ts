import { NextResponse } from "next/server";
import { requireAuthWithOrg } from "@/lib/api-auth";
import { ItemApiError, reactivateItem } from "@/features/items/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function asErrorResponse(error: unknown) {
  if (error instanceof ItemApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  throw error;
}

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAuthWithOrg({ allowedRoles: ["ORG_ADMIN", "ORG_USER"] });
  if (!auth.success) {
    return auth.response;
  }

  const { id } = await context.params;

  try {
    await reactivateItem(auth.orgId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return asErrorResponse(error);
  }
}
