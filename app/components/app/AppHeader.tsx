import SignOutButton from "@/app/components/auth/SignOutButton";
import OrgSwitcher from "@/app/components/app/OrgSwitcher";
import { MembershipRole } from "@prisma/client";

interface Org {
  id: string;
  name: string;
  slug: string | null;
  role: MembershipRole;
}

interface AppHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  activeOrg: Org;
  userOrgs: Org[];
  title?: string;
}

export default function AppHeader({ user, activeOrg, userOrgs, title = "Dashboard" }: AppHeaderProps) {
  return (
    <header className="h-16 shrink-0 flex items-center justify-between px-6 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5">
      {/* Left: Page title */}
      <h1 className="text-sm font-semibold text-white">{title}</h1>

      {/* Center: Org Switcher */}
      <OrgSwitcher activeOrg={activeOrg} userOrgs={userOrgs} />

      {/* Right: User info + signout */}
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          {user.name && (
            <p className="text-sm font-medium text-zinc-200">{user.name}</p>
          )}
          {user.email && (
            <p className="text-xs text-zinc-500">{user.email}</p>
          )}
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
