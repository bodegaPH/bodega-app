import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function redirectToOrgScopedPath(path: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    select: { orgId: true },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) {
    redirect("/onboarding/create-org");
  }

  let targetOrgId = session.user.activeOrgId;
  if (!targetOrgId || !memberships.some(m => m.orgId === targetOrgId)) {
    targetOrgId = memberships[0].orgId;
  }

  redirect(`/${targetOrgId}/${path}`);
}
