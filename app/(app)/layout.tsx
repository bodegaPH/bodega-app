import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
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

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <AppHeader user={session.user} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
