import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ReactNode } from "react";
import { OrgProvider } from "@/features/shared/OrgContext";

export default async function OrgLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const { orgId } = await params;

  // Fetch user memberships to validate org access
  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    select: { orgId: true },
  });

  if (memberships.length === 0) {
    redirect("/onboarding/create-org");
  }

  const userOrgIds = memberships.map((m) => m.orgId);

  // Validate that user is a member of the requested org
  if (!userOrgIds.includes(orgId)) {
    // Redirect to first org with same page path
    const firstOrgId = userOrgIds[0];
    redirect(`/${firstOrgId}/dashboard`);
  }

  // Wrap children in OrgProvider for client components that need context
  return (
    <OrgProvider orgId={orgId} userId={session.user.id}>
      {children}
    </OrgProvider>
  );
}
