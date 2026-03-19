import { NextResponse } from "next/server";
import { requireAuthWithOrg } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAuthWithOrg();
  if (!auth.success) {
    return auth.response;
  }

  const { id } = await context.params;

  const existing = await prisma.item.findFirst({
    where: { id, orgId: auth.orgId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  await prisma.item.update({
    where: { id },
    data: { isActive: true },
  });

  return NextResponse.json({ success: true });
}
