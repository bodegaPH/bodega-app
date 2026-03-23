"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  MapPin,
  Boxes,
  Settings,
  ChevronDown,
  Building2,
  Check,
  Plus
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { switchOrg, createOrg } from "@/lib/actions/org";
import { MembershipRole } from "@prisma/client";

interface Org {
  id: string;
  name: string;
  slug: string | null;
  role: MembershipRole;
}

interface AppSidebarProps {
  activeOrg: Org;
  userOrgs: Org[];
}

const navGroups = [
  {
    header: "CORE",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ]
  },
  {
    header: "INVENTORY",
    items: [
      { label: "Items", href: "/items", icon: Boxes },
      { label: "Stock", href: "/inventory", icon: Package },
      { label: "Movements", href: "/movements", icon: ArrowLeftRight },
      { label: "Locations", href: "/locations", icon: MapPin },
    ]
  },
  {
    header: "SYSTEM",
    items: [
      { label: "Settings", href: "/settings/organization", icon: Building2 },
    ]
  }
];

export default function AppSidebar({ activeOrg, userOrgs }: AppSidebarProps) {
  const pathname = usePathname();
  const [isOrgSwitcherOpen, setIsOrgSwitcherOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { update } = useSession();

  // Check if user is ORG_ADMIN
  const isOrgAdmin = activeOrg.role === "ORG_ADMIN";

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOrgSwitcherOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSwitch(orgId: string) {
    if (orgId === activeOrg.id) {
      setIsOrgSwitcherOpen(false);
      return;
    }

    setIsSwitching(true);
    try {
      const result = await switchOrg(orgId);
      if (result.success) {
        await update({ activeOrgId: orgId });
        const currentPath = pathname.replace(new RegExp(`^/${activeOrg.id}`), "");
        window.location.href = `/${orgId}${currentPath}`;
      } else {
        console.error("Failed to switch org:", result.error);
        setIsSwitching(false);
        setIsOrgSwitcherOpen(false);
      }
    } catch (error) {
      console.error("Error switching org:", error);
      setIsSwitching(false);
      setIsOrgSwitcherOpen(false);
    }
  }

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    try {
      const formData = new FormData();
      formData.append("name", newOrgName);
      
      const result = await createOrg(formData);
      
      if (result.success) {
        // Switch to new org
        await update({ activeOrgId: result.orgId });
        // Use hard navigation to ensure session is fully refreshed
        window.location.href = "/dashboard";
      } else {
        setCreateError(result.error);
        setIsCreating(false);
      }
    } catch (error) {
      setCreateError("An error occurred. Please try again.");
      setIsCreating(false);
    }
  }

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col bg-zinc-950 border-r border-white/5 relative z-50">
      {/* Top Section / Org Switcher */}
      <div className="h-16 shrink-0 flex items-center px-4 border-b border-white/5 relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOrgSwitcherOpen(!isOrgSwitcherOpen)}
          disabled={isSwitching}
          className="flex-1 flex items-center gap-3 w-full rounded-md p-1.5 -ml-1.5 hover:bg-white/5 transition-colors group text-left"
        >
          {/* Logo Icon */}
          <div className="relative flex items-center justify-center w-8 h-8 rounded-md bg-zinc-900 border border-white/10 shrink-0">
            <svg
              className="w-4 h-4 text-white"
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
          <div className="flex-1 min-w-0 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-white truncate leading-tight">
                {activeOrg.name}
              </p>
              <p className="text-[11px] text-zinc-500 font-medium">
                Bodega
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
          </div>
        </button>

        {/* Org Switcher Dropdown */}
        {isOrgSwitcherOpen && (
          <div className="absolute top-full left-4 right-4 mt-2 rounded-lg bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden z-50 py-1">
            {userOrgs.length > 1 && (
              <>
                <div className="px-3 py-2 border-b border-white/5">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Switch Organization</p>
                </div>
                <div className="max-h-60 overflow-y-auto p-1">
                  {userOrgs.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => handleSwitch(org.id)}
                      disabled={isSwitching}
                      className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                        org.id === activeOrg.id
                          ? "bg-white/10 text-white"
                          : "hover:bg-white/5 text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="w-4 h-4 shrink-0 opacity-50" />
                        <span className="text-[13px] font-medium truncate">{org.name}</span>
                      </div>
                      {org.id === activeOrg.id && (
                        <Check className="w-3.5 h-3.5 shrink-0 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
            {/* Create Organization Button */}
            <div className={`p-1 ${userOrgs.length > 1 ? 'border-t border-white/5 mt-1' : ''}`}>
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setIsOrgSwitcherOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-white/5 text-zinc-300 transition-colors"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="text-[13px] font-medium">Create Organization</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-zinc-900 border border-white/10 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Create Organization</h3>
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label htmlFor="orgName" className="block text-sm font-medium text-zinc-300 mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  id="orgName"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="My Organization"
                  required
                  minLength={2}
                  maxLength={100}
                  className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                />
              </div>

              {createError && (
                <div className="px-4 py-3 rounded-md text-sm bg-rose-500/10 text-rose-200 border border-rose-500/20">
                  {createError}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewOrgName("");
                    setCreateError(null);
                  }}
                  disabled={isCreating}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newOrgName.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-medium rounded-md transition-colors shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {isCreating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.header} className="space-y-1">
            <h3 className="px-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
              {group.header}
            </h3>
            {group.items.map(({ label, href, icon: Icon }) => {
              const orgHref = `/${activeOrg.id}${href}`;
              const isActive = pathname === orgHref || pathname.startsWith(`${orgHref}/`);
              
              // Hide Organization Settings for non-admins
              if (href === "/settings/organization" && !isOrgAdmin) {
                return null;
              }
              
              return (
                <Link
                  key={href}
                  href={orgHref}
                  className={`flex items-center gap-3 px-2 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                    isActive
                      ? "bg-zinc-800/80 text-white"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-zinc-500"}`} />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      
      {/* Bottom User Area if needed, or leave clean */}
    </aside>
  );
}
