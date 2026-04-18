"use client";

import React from "react";
import { MembershipRole } from "@prisma/client";
import Button from "@/components/ui/Button";

interface Member {
  id: string;
  name: string | null;
  email: string | null;
  role: MembershipRole;
  isOwner: boolean;
}

interface MemberListProps {
  members: Member[];
  canManage?: boolean;
  onRoleChange?: (userId: string, role: MembershipRole) => void;
  onRemove?: (userId: string) => void;
  loadingUserId?: string | null;
}

export default function MemberList({
  members,
  canManage = false,
  onRoleChange,
  onRemove,
  loadingUserId,
}: MemberListProps) {
  const [pendingRemoveId, setPendingRemoveId] = React.useState<string | null>(null);
  const pendingMember = members.find((m) => m.id === pendingRemoveId);

  function requestRemove(userId: string) {
    setPendingRemoveId(userId);
  }

  function confirmRemove() {
    if (pendingRemoveId) {
      onRemove?.(pendingRemoveId);
    }
    setPendingRemoveId(null);
  }

  function cancelRemove() {
    setPendingRemoveId(null);
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-12 px-4 border border-dashed border-white/10 bg-black">
        <div className="h-10 w-10 bg-zinc-950 border border-white/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        </div>
        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">No members found</p>
        <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 mt-1">
          This organization doesn&apos;t have any members yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border border-white/10 bg-black overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-zinc-950 border-b border-white/10">
            <tr>
              <th className="text-left px-4 py-3 text-[9px] uppercase tracking-widest font-mono text-zinc-500 font-normal">
                Name
              </th>
              <th className="text-left px-4 py-3 text-[9px] uppercase tracking-widest font-mono text-zinc-500 font-normal">
                Email
              </th>
              <th className="text-left px-4 py-3 text-[9px] uppercase tracking-widest font-mono text-zinc-500 font-normal">
                Role
              </th>
              {canManage && (
                <th className="text-right px-4 py-3 text-[9px] uppercase tracking-widest font-mono text-zinc-500 font-normal">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member.id}
                className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors"
              >
                {/* Name */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 shrink-0 bg-zinc-900 border border-white/10 flex items-center justify-center text-[10px] font-mono text-zinc-300">
                      {(member.name || member.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[12px] font-mono text-zinc-200 whitespace-nowrap">
                      {member.name || "Unknown User"}
                    </span>
                    {member.isOwner && (
                      <span className="inline-flex items-center px-1.5 py-0.5 text-[8px] font-mono tracking-widest uppercase bg-amber-500/10 text-amber-500 border border-amber-500/30 whitespace-nowrap">
                        Owner
                      </span>
                    )}
                  </div>
                </td>

                {/* Email */}
                <td className="px-4 py-3 text-[10px] font-mono tracking-wide text-zinc-500">
                  {member.email ?? "—"}
                </td>

                {/* Role */}
                <td className="px-4 py-3">
                  {canManage && !member.isOwner && onRoleChange ? (
                    <div className="relative inline-flex items-center">
                      <select
                        value={member.role}
                        onChange={(e) => onRoleChange(member.id, e.target.value as MembershipRole)}
                        disabled={loadingUserId === member.id}
                        style={{ colorScheme: "dark" }}
                        className="appearance-none pl-2.5 pr-7 py-1.5 text-[9px] uppercase font-mono tracking-widest bg-zinc-950 border border-white/10 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50 cursor-pointer"
                      >
                        <option value="ORG_USER">Member</option>
                        <option value="ORG_ADMIN">Admin</option>
                      </select>
                      <svg className="absolute right-2 pointer-events-none w-3 h-3 text-zinc-500" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M2 4l4 4 4-4" strokeLinecap="square"/>
                      </svg>
                    </div>
                  ) : (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-[9px] uppercase font-mono tracking-widest border ${
                        member.role === "ORG_ADMIN"
                          ? "bg-indigo-500/5 text-indigo-400 border-indigo-500/30"
                          : "bg-zinc-800/30 text-zinc-500 border-zinc-700/30"
                      }`}
                    >
                      {member.role === "ORG_ADMIN" ? "Admin" : "Member"}
                    </span>
                  )}
                </td>

                {/* Actions */}
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    {member.isOwner ? (
                      <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-700">
                        Owner protected
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={loadingUserId === member.id}
                        onClick={() => requestRemove(member.id)}
                        className="text-[9px] font-mono uppercase tracking-widest text-rose-500/70 border border-rose-500/20 px-3 py-1.5 hover:text-rose-400 hover:border-rose-500/50 hover:bg-rose-500/5 disabled:opacity-40 transition-colors"
                      >
                        {loadingUserId === member.id ? "Removing..." : "Remove"}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Remove Confirmation Modal */}
      {pendingRemoveId && pendingMember && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-rose-500/30 p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-mono uppercase tracking-[0.2em] font-bold text-rose-500 mb-3">
              Remove Member
            </h3>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 leading-relaxed mb-2">
              You are about to remove:
            </p>
            <div className="bg-black border border-white/10 px-4 py-3 mb-5">
              <p className="text-[12px] font-mono text-zinc-200">
                {pendingMember.name || "Unknown User"}
              </p>
              <p className="text-[9px] font-mono tracking-widest text-zinc-500 mt-0.5">
                {pendingMember.email}
              </p>
            </div>
            <p className="text-[9px] font-mono uppercase tracking-widest text-rose-400/80 leading-relaxed mb-5">
              This member will immediately lose access to this organization. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={cancelRemove}>
                Cancel
              </Button>
              <Button type="button" variant="danger" size="sm" onClick={confirmRemove}>
                Confirm Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
