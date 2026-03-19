"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-zinc-300 hover:text-white transition-all active:scale-[0.98]"
    >
      <LogOut className="w-4 h-4" />
      Sign Out
    </button>
  );
}
