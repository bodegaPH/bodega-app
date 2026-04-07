import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  if (isBuildPhase || process.env.SKIP_BUILD_STATIC_GENERATION) {
    return children;
  }

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

  // Determine active org from URL if present, fallback to session
  let activeOrgId = session.user.activeOrgId;
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  
  const match = pathname.match(/^\/([^\/]+)/);
  if (match && userOrgs.some(o => o.id === match[1])) {
    activeOrgId = match[1];
  }
  
  // If no activeOrgId or not in user's orgs, default to first org
  if (!activeOrgId || !userOrgs.some((o) => o.id === activeOrgId)) {
    activeOrgId = userOrgs[0].id;
  }

  const activeOrg = userOrgs.find((o) => o.id === activeOrgId) ?? userOrgs[0];

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden text-zinc-300 font-sans selection:bg-blue-500/30">
      <AppSidebar activeOrg={activeOrg} userOrgs={userOrgs} />
      <div className="flex flex-col flex-1 min-w-0">
        <AppHeader 
          user={session.user} 
          title="Dashboard"
        />
        <main className="flex-1 overflow-auto bg-zinc-950 p-6">{children}</main>
      </div>
    </div>
  );
}
