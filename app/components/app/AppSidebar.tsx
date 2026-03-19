"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Settings,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Movements", href: "/movements", icon: ArrowLeftRight },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col bg-zinc-900/60 backdrop-blur-xl border-r border-white/5">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-white/5">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 border border-white/10 ring-1 ring-white/20">
          <div className="absolute inset-0 bg-indigo-500/20 rounded-lg blur-sm" />
          <svg
            className="w-5 h-5 text-white relative z-10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" />
            <path d="M12 12L12 21" />
            <path d="M12 12L20 7.5" />
            <path d="M12 12L4 7.5" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-white">Bodega</p>
          <p className="text-xs text-zinc-500 truncate w-36">My Organization</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-600/20 text-blue-300 border-r-2 border-blue-500"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
