"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

interface UserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.addEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Generate initials for avatar
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : user.email?.charAt(0).toUpperCase() || "?";

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 border border-white/10 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {initials}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-none bg-zinc-950 border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.05)] z-50 animate-in fade-in slide-in-from-top-2 duration-100">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-[11px] font-mono tracking-wider font-bold text-white uppercase truncate">
              {user.name || "User"}
            </p>
            <p className="text-[10px] font-mono tracking-wide text-zinc-500 truncate mt-1">
              {user.email}
            </p>
          </div>
          
          <div className="py-1">
            <Link
              href="/account/settings"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2.5 text-[10px] font-mono tracking-widest uppercase text-zinc-400 hover:bg-indigo-500/10 hover:text-indigo-300 border-l-2 border-transparent hover:border-indigo-500 transition-all"
            >
              Account Settings
            </Link>
          </div>
          
          <div className="py-1 border-t border-white/10">
            <button
              onClick={() => {
                setIsOpen(false);
                signOut({ callbackUrl: "/auth/signin" });
              }}
              className="block w-full text-left px-4 py-2.5 text-[10px] font-mono tracking-widest uppercase text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 border-l-2 border-transparent hover:border-rose-500 transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
