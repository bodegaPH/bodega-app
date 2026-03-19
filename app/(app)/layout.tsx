import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AppSidebar from "@/app/components/app/AppSidebar";
import AppHeader from "@/app/components/app/AppHeader";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  // Fetch user's org memberships
  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Redirect to onboarding if user has no orgs
  if (memberships.length === 0) {
    redirect("/onboarding/create-org");
  }

  // Build orgs list with roles
  const userOrgs = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    role: m.role,
  }));

  // Determine active org
  let activeOrgId = session.user.activeOrgId;
  
  // If no activeOrgId or not in user's orgs, default to first org
  if (!activeOrgId || !userOrgs.some((o) => o.id === activeOrgId)) {
    activeOrgId = userOrgs[0].id;
  }

  const activeOrg = userOrgs.find((o) => o.id === activeOrgId) ?? userOrgs[0];

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <AppHeader 
          user={session.user} 
          activeOrg={activeOrg}
          userOrgs={userOrgs}
        />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
