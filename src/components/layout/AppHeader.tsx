"use client";

import { usePathname } from "next/navigation";
import UserMenu from "./UserMenu";

interface AppHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function AppHeader({ user }: AppHeaderProps) {
  const pathname = usePathname() || "";
  const segments = pathname.split('/').filter(Boolean);
  const currentTab = segments.length > 1 ? segments[segments.length - 1] : "Dashboard";

  return (
    <header className="h-16 shrink-0 flex items-center justify-between px-6 bg-zinc-950 border-b border-white/10 relative z-40">
      {/* Left: Context / Breadcrumbs */}
      <div className="flex items-center gap-4">
        <h1 className="text-[12px] font-mono tracking-[0.2em] uppercase text-zinc-300 leading-none pt-[1px]">{currentTab}</h1>
      </div>

      {/* Right: User info + signout */}
      <div className="flex items-center gap-4">
        <UserMenu user={user} />
      </div>
    </header>
  );
}
