import UserMenu from "./UserMenu";

interface AppHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  title?: string;
}

export default function AppHeader({ user, title = "Dashboard" }: AppHeaderProps) {
  return (
    <header className="h-16 shrink-0 flex items-center justify-between px-6 bg-zinc-950 border-b border-white/5 relative z-40">
      {/* Left: Context / Breadcrumbs */}
      <div className="flex items-center gap-2">
        <h1 className="text-[14px] font-medium text-white">{title}</h1>
      </div>

      {/* Right: User info + signout */}
      <div className="flex items-center gap-4">
        <UserMenu user={user} />
      </div>
    </header>
  );
}
