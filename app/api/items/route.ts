import { NextResponse } from "next/server";
import { requireAuthWithOrg } from "@/lib/api-auth";
import { createItem, getItems, ItemApiError } from "@/features/items/server";
import { createItemSchema } from "@/features/items/schemas";
import { withAuth } from "@/lib/api-handler";

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

export const POST = withAuth(
  async ({ auth, body }) => {
    const item = await createItem(auth.orgId, body);
    return NextResponse.json({ item }, { status: 201 });
  },
  {
    allowedRoles: ["ORG_ADMIN", "ORG_USER"],
    bodySchema: createItemSchema,
  }
);
