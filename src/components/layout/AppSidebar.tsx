"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  DashboardIcon as LayoutDashboard,
  CubeIcon as Boxes,
  TokensIcon as Package,
  UpdateIcon as ArrowLeftRight,
  TargetIcon as MapPin,
  CaretSortIcon as ChevronsUpDown,
  MixerHorizontalIcon as Settings2,
  BoxModelIcon as Building2,
  CheckIcon as Check,
  PlusIcon as Plus,
} from "@radix-ui/react-icons";
import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { switchOrg, createOrg } from "@/features/organizations/actions/org";
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
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    header: "INVENTORY",
    items: [
      { label: "Items", href: "/items", icon: Boxes },
      { label: "Stock", href: "/inventory", icon: Package },
      { label: "Movements", href: "/movements", icon: ArrowLeftRight },
      { label: "Locations", href: "/locations", icon: MapPin },
    ],
  },
  {
    header: "SYSTEM",
    items: [
      { label: "Settings", href: "/settings/organization", icon: Settings2 },
    ],
  },
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
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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
        const currentPath = pathname.replace(
          new RegExp(`^/${activeOrg.id}`),
          "",
        );
        // Hard navigation is intentional: ensures the updated JWT (activeOrgId)
        // is fully propagated before the next page renders.
        // eslint-disable-next-line react-hooks/immutability
        window.location.href = `/${orgId}${currentPath}`;
      } else {
        console.error("Failed to switch org:", result.error);
        setIsSwitching(false);
        setIsOrgSwitcherOpen(false);
      }
    } catch {
      console.error("Error switching org");
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
        window.location.href = "/";
      } else {
        setCreateError(result.error);
        setIsCreating(false);
      }
    } catch {
      setCreateError("An error occurred. Please try again.");
      setIsCreating(false);
    }
  }

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col bg-zinc-950 border-r border-white/10 relative z-50">
      {/* Top Section / Org Switcher (Render Style) */}
      <div
        className="h-16 shrink-0 flex items-stretch border-b border-white/10 relative"
        ref={dropdownRef}
      >
        {/* Logo Pane */}
        <div className="w-16 h-full shrink-0 flex items-center justify-center border-r border-white/10">
          <Image 
            src="/bodega-logo.svg" 
            alt="Bodega" 
            width={24} 
            height={24} 
            className="w-6 h-6"
            priority
          />
        </div>

        {/* Org Switcher Button */}
        <button
          onClick={() => setIsOrgSwitcherOpen(!isOrgSwitcherOpen)}
          disabled={isSwitching}
          className="flex-1 flex items-center justify-between px-4 hover:bg-white/5 transition-colors group text-left min-w-0"
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar Square */}
            <div className="w-6 h-6 rounded-none bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center shrink-0 shadow-[inset_0_0_8px_rgba(99,102,241,0.2)]">
              <span className="text-[12px] font-mono font-bold text-indigo-400">
                {activeOrg.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-[12px] font-mono font-bold tracking-[0.1em] text-zinc-300 uppercase truncate pt-[1px]">
              {activeOrg.name}
            </span>
          </div>
          <ChevronsUpDown 
            className="w-4 h-4 text-zinc-500 shrink-0 ml-2" 
          />
        </button>

        {/* Org Switcher Dropdown */}
        {isOrgSwitcherOpen && (
          <div className="absolute top-full left-4 right-4 mt-2 rounded-none bg-zinc-950 border border-white/10 shadow-2xl overflow-hidden z-50 py-1">
            {userOrgs.length > 1 && (
              <>
                <div className="px-3 py-2 border-b border-white/10">
                  <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-[0.2em]">
                    Switch Organization
                  </p>
                </div>
                <div className="max-h-60 overflow-y-auto p-1">
                  {userOrgs.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => handleSwitch(org.id)}
                      disabled={isSwitching}
                      className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-none text-left transition-all border-l-2 ${
                        org.id === activeOrg.id
                          ? "bg-indigo-500/10 border-indigo-500 text-indigo-100"
                          : "border-transparent hover:bg-white/5 text-zinc-400"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 
                          className="w-4 h-4 shrink-0 opacity-50" 
                        />
                        <span className="text-[12px] font-mono uppercase tracking-wider truncate">
                          {org.name}
                        </span>
                      </div>
                      {org.id === activeOrg.id && (
                        <Check 
                          className="w-3.5 h-3.5 shrink-0 text-indigo-400" 
                        />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
            {/* Create Organization Button */}
            <div
              className={`p-1 ${userOrgs.length > 1 ? "border-t border-white/10 mt-1" : ""}`}
            >
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setIsOrgSwitcherOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-none text-left hover:bg-zinc-800 text-zinc-300 transition-colors border border-dashed border-white/10 hover:border-indigo-500/50 group"
              >
                <Plus 
                  className="w-3.5 h-3.5 shrink-0 text-zinc-500 group-hover:text-indigo-400"
                />
                <span className="text-[10px] font-mono uppercase tracking-[0.1em] group-hover:text-white">
                  Create Organization
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-zinc-950/90 flex items-center justify-center z-[100]">
          <div className="bg-zinc-950 border border-indigo-500/30 rounded-none p-8 max-w-md w-full mx-4 shadow-[0_0_50px_rgba(99,102,241,0.05)]">
            <h3 className="text-[11px] font-mono tracking-[0.2em] font-bold text-indigo-400 uppercase mb-6">
              Create Organization
            </h3>
            <form onSubmit={handleCreateOrg} className="space-y-6">
              <div>
                <label
                  htmlFor="orgName"
                  className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-2"
                >
                  <span className="text-indigo-500 mr-1">*</span> Organization Name
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
                  className="w-full px-3 py-3 bg-black/50 border border-white/10 rounded-none text-[13px] font-mono text-white placeholder-zinc-700 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {createError && (
                <div className="px-4 py-3 rounded-none text-[11px] font-mono uppercase tracking-wide bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  {createError}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewOrgName("");
                    setCreateError(null);
                  }}
                  disabled={isCreating}
                  className="px-5 py-2.5 bg-transparent border border-white/10 hover:bg-white/5 text-zinc-400 text-[10px] font-mono tracking-[0.2em] uppercase rounded-none transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newOrgName.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/30 text-white text-[10px] font-mono tracking-[0.2em] uppercase rounded-none transition-colors shadow-[0_0_15px_rgba(99,102,241,0.2)] disabled:shadow-none disabled:cursor-not-allowed border border-indigo-400/20 disabled:border-transparent"
                >
                  {isCreating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-6 space-y-5 overflow-y-auto w-full">
        {navGroups.map((group) => (
          <div key={group.header} className="space-y-1">
            <h3 className="px-6 text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-[0.2em] mb-2">
              {group.header}
            </h3>
            {group.items.map(({ label, href, icon: Icon }) => {
              const orgHref = `/${activeOrg.id}${href}`;
              const isActive =
                pathname === orgHref || pathname.startsWith(`${orgHref}/`);

              // Hide Organization Settings for non-admins
              if (href === "/settings/organization" && !isOrgAdmin) {
                return null;
              }

              return (
                <Link
                  key={href}
                  href={orgHref}
                  className={`flex items-center gap-3 pl-[21px] pr-6 py-2.5 rounded-none text-[12px] font-mono uppercase tracking-wide transition-all group ${
                    isActive
                      ? "border-l-[3px] border-indigo-500 bg-indigo-500/10 text-white"
                      : "border-l-[3px] border-transparent text-zinc-500 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-indigo-400" : "text-zinc-600 group-hover:text-zinc-400"}`}
                  />
                  <span className={isActive ? "font-bold tracking-tight" : ""}>
                    {label}
                  </span>
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
