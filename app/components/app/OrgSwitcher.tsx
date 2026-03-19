"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { switchOrg } from "@/lib/actions/org";
import { ChevronDown, Check, Building2 } from "lucide-react";
import { MembershipRole } from "@prisma/client";

interface Org {
  id: string;
  name: string;
  slug: string | null;
  role: MembershipRole;
}

interface OrgSwitcherProps {
  activeOrg: Org;
  userOrgs: Org[];
}

export default function OrgSwitcher({ activeOrg, userOrgs }: OrgSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { update } = useSession();
  const router = useRouter();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Single org - just display, no dropdown
  if (userOrgs.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
        <Building2 className="w-4 h-4 text-zinc-400" />
        <span className="text-sm font-medium text-zinc-200 truncate max-w-[150px]">
          {activeOrg.name}
        </span>
      </div>
    );
  }

  async function handleSwitch(orgId: string) {
    if (orgId === activeOrg.id) {
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await switchOrg(orgId);
      if (result.success) {
        // Update the session with new activeOrgId
        await update({ activeOrgId: orgId });
        router.refresh();
      } else {
        console.error("Failed to switch org:", result.error);
      }
    } catch (error) {
      console.error("Error switching org:", error);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50"
      >
        <Building2 className="w-4 h-4 text-zinc-400" />
        <span className="text-sm font-medium text-zinc-200 truncate max-w-[150px]">
          {activeOrg.name}
        </span>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 rounded-xl bg-zinc-900/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden z-50">
          <div className="p-2 space-y-1">
            {userOrgs.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                disabled={isLoading}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  org.id === activeOrg.id
                    ? "bg-blue-500/20 text-blue-200"
                    : "hover:bg-white/5 text-zinc-300"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-4 h-4 shrink-0 text-zinc-400" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{org.name}</div>
                    <div className="text-xs text-zinc-500">
                      {org.role === "ORG_ADMIN" ? "Admin" : "Member"}
                    </div>
                  </div>
                </div>
                {org.id === activeOrg.id && (
                  <Check className="w-4 h-4 shrink-0 text-blue-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
