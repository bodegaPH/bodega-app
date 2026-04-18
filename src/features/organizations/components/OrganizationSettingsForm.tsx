"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Button from "@/components/ui/Button";
import MemberList from "./MemberList";

interface OrganizationSettingsFormProps {
  organization: {
    id: string;
    name: string;
  };
  isLastOrg: boolean;
  owner: {
    id: string;
    name: string | null;
    email: string | null;
  };
  currentUserId: string;
  members: Array<{
    id: string;
    name: string | null;
    email: string | null;
    role: "ORG_ADMIN" | "ORG_USER";
    isOwner: boolean;
  }>;
  invites: Array<{
    id: string;
    invitedEmail: string;
    role: "ORG_ADMIN" | "ORG_USER";
    expiresAt: Date | string;
    inviter?: { name: string | null; email: string | null };
  }>;
}

export default function OrganizationSettingsForm({
  organization,
  isLastOrg,
  owner,
  currentUserId,
  members,
  invites,
}: OrganizationSettingsFormProps) {
  const [name, setName] = useState(organization.name);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [ownerConfirmText, setOwnerConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [targetOwnerId, setTargetOwnerId] = useState("");
  const [deleteDetails, setDeleteDetails] = useState<{
    items: number;
    locations: number;
    movements: number;
    stock?: number;
  } | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ORG_ADMIN" | "ORG_USER">("ORG_USER");
  const [inviteRetryAfter, setInviteRetryAfter] = useState<number | null>(null);
  const [memberActionUserId, setMemberActionUserId] = useState<string | null>(null);
  const [inviteActionId, setInviteActionId] = useState<string | null>(null);
  const router = useRouter();
  const { data: session, update } = useSession();
  const isOwner = owner.id === currentUserId;
  const transferCandidates = members.filter((member) => member.id !== owner.id);

  async function parseJsonBody(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  function getErrorMessage(body: unknown, fallback: string): string {
    if (!body || typeof body !== "object") {
      return fallback;
    }

    const errorValue = (body as { error?: unknown }).error;
    if (typeof errorValue === "string") {
      return errorValue;
    }
    if (errorValue && typeof errorValue === "object") {
      const message = (errorValue as { message?: unknown }).message;
      if (typeof message === "string") {
        return message;
      }
    }

    return fallback;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/organizations/${organization.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to update organization" });
        setIsLoading(false);
        return;
      }

      setMessage({ type: "success", text: "Organization updated successfully" });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "An error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (deleteConfirmText !== organization.name) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/organizations/${organization.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerConfirmation: ownerConfirmText }),
      });

      const data = await res.json();

      // 409 = Needs confirmation with data counts
      if (res.status === 409 && data.requiresConfirmation) {
        setDeleteDetails(data.details);
        setIsDeleting(false);
        return;
      }

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to delete organization" });
        setIsDeleting(false);
        setShowDeleteModal(false);
        setDeleteDetails(null);
        return;
      }

      // Switch to next org before redirecting
      if (data.nextOrgId) {
        await update({ activeOrgId: data.nextOrgId });
      }

      // Use hard navigation to ensure session is fully refreshed
      window.location.href = `/${data.nextOrgId}/dashboard`;
    } catch {
      setMessage({ type: "error", text: "An error occurred. Please try again." });
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteDetails(null);
    }
  }

  async function handleTransferOwnership() {
    if (!targetOwnerId || !isOwner) {
      return;
    }

    setIsTransferring(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/organizations/${organization.id}/ownership`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: targetOwnerId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to transfer ownership" });
        return;
      }

      setMessage({ type: "success", text: "Ownership transferred successfully" });
      setTargetOwnerId("");
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "An error occurred. Please try again." });
    } finally {
      setIsTransferring(false);
    }
  }

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setInviteRetryAfter(null);
    setIsLoading(true);

    try {
      const trimmedEmail = inviteEmail.trim();
      const normalizedEmail = trimmedEmail.toLowerCase();
      const currentUserEmail = session?.user?.email?.trim().toLowerCase();
      if (!trimmedEmail) {
        setMessage({ type: "error", text: "Email is required" });
        return;
      }

      if (currentUserEmail && normalizedEmail === currentUserEmail) {
        setMessage({ type: "error", text: "You cannot send an invitation to your own email" });
        return;
      }

      const existingMember = members.some(
        (member) => member.email?.trim().toLowerCase() === normalizedEmail,
      );
      if (existingMember) {
        setMessage({ type: "error", text: "User is already a member of this organization" });
        return;
      }

      const res = await fetch(`/api/organizations/${organization.id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        const retryAfter = Number(res.headers.get("Retry-After") || 0);
        if (retryAfter > 0) {
          setInviteRetryAfter(retryAfter);
        }
        setMessage({ type: "error", text: data.error?.message || data.error || "Failed to invite member" });
        return;
      }

      setInviteEmail("");
      setMessage({ type: "success", text: "Invitation created successfully" });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Unable to create invitation right now." });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendInvite(inviteId: string) {
    setMessage(null);
    setInviteActionId(inviteId);

    try {
      const res = await fetch(`/api/organizations/${organization.id}/invites/${inviteId}`, {
        method: "POST",
      });
      const data = await parseJsonBody(res);

      if (!res.ok) {
        const retryAfter = Number(res.headers.get("Retry-After") || 0);
        setInviteRetryAfter(retryAfter > 0 ? retryAfter : null);
        setMessage({ type: "error", text: getErrorMessage(data, "Failed to resend invite") });
        return;
      }

      setMessage({ type: "success", text: "Invitation resent" });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Unable to resend invite right now." });
    } finally {
      setInviteActionId(null);
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    setMessage(null);
    setInviteActionId(inviteId);

    try {
      const res = await fetch(`/api/organizations/${organization.id}/invites/${inviteId}`, {
        method: "DELETE",
      });
      const data = await parseJsonBody(res);

      if (!res.ok) {
        setMessage({ type: "error", text: getErrorMessage(data, "Failed to revoke invite") });
        return;
      }

      setMessage({ type: "success", text: "Invitation revoked" });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Unable to revoke invite right now." });
    } finally {
      setInviteActionId(null);
    }
  }

  async function handleRoleChange(userId: string, role: "ORG_ADMIN" | "ORG_USER") {
    setMemberActionUserId(userId);
    setMessage(null);

    try {
      const res = await fetch(`/api/organizations/${organization.id}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await parseJsonBody(res);

      if (!res.ok) {
        setMessage({ type: "error", text: getErrorMessage(data, "Failed to update member role") });
        return;
      }

      setMessage({ type: "success", text: "Member role updated" });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Unable to update member role right now." });
    } finally {
      setMemberActionUserId(null);
    }
  }

  async function handleRemoveMember(userId: string) {
    setMemberActionUserId(userId);
    setMessage(null);

    try {
      const res = await fetch(`/api/organizations/${organization.id}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await parseJsonBody(res);

      if (!res.ok) {
        setMessage({ type: "error", text: getErrorMessage(data, "Failed to remove member") });
        return;
      }

      setMessage({ type: "success", text: "Member removed" });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Unable to remove member right now." });
    } finally {
      setMemberActionUserId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Global status message — shown across all sections */}
      {message && (
        <div
          className={`px-4 py-3 text-[10px] font-mono uppercase tracking-widest border ${
            message.type === "success"
              ? "bg-emerald-950/30 text-emerald-400 border-emerald-500/30"
              : "bg-rose-950/30 text-rose-400 border-rose-500/30"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Organization Details Section */}
      <div className="bg-black border border-white/10 rounded-none p-8">
        <h2 className="text-sm font-mono tracking-[0.2em] uppercase font-semibold text-white mb-6">Organization Details</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Organization Name Field */}
          <div>
            <label htmlFor="orgName" className="block text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
              Organization Name
            </label>
            <input
              type="text"
              id="orgName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-zinc-950 border border-white/10 rounded-none text-[12px] font-mono text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-none"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              loading={isLoading}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Danger Zone - Delete Organization */}
      {!isLastOrg && (
        <div className="bg-rose-950/10 border border-rose-500/30 rounded-none p-8">
          <h2 className="text-sm font-mono tracking-[0.2em] uppercase font-semibold text-rose-500 mb-2">Danger Zone</h2>
          <p className="text-[10px] font-mono tracking-widest uppercase text-rose-500/70 mb-6">
            Permanently delete this organization. This action cannot be undone and will erase all data, stock, and locations associated with it.
          </p>
          <Button
            type="button"
            variant="danger"
            onClick={() => setShowDeleteModal(true)}
            disabled={!isOwner}
          >
            {isOwner ? "Delete Organization" : "Only owner can delete"}
          </Button>
        </div>
      )}

      <div className="bg-black border border-white/10 rounded-none p-8 space-y-6">
        <h2 className="text-sm font-mono tracking-[0.2em] uppercase font-semibold text-white">Ownership</h2>
        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
          Current owner: <span className="text-zinc-300 font-bold">{owner.name ?? owner.email ?? "Unknown"}</span>
        </p>
        <div className="space-y-3">
          <label className="block text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Transfer ownership</label>
          <div className="relative">
            <select
              value={targetOwnerId}
              onChange={(e) => setTargetOwnerId(e.target.value)}
              disabled={!isOwner || isTransferring}
              style={{ colorScheme: "dark" }}
              className="appearance-none w-full pl-4 pr-10 py-3 bg-zinc-950 border border-white/10 text-[10px] uppercase font-mono text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 disabled:opacity-50 cursor-pointer"
            >
              <option value="">Select member</option>
              {transferCandidates.map((member) => (
                <option key={member.id} value={member.id}>
                  {(member.name ?? member.email ?? "Unknown user") + (member.role === "ORG_ADMIN" ? " (Admin)" : "")}
                </option>
              ))}
            </select>
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-3 h-3 text-zinc-500" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 4l4 4 4-4" strokeLinecap="square"/>
            </svg>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleTransferOwnership}
              disabled={!isOwner || !targetOwnerId || isTransferring}
              loading={isTransferring}
            >
              Transfer Ownership
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-black border border-white/10 rounded-none p-8 space-y-6">
        <h2 className="text-sm font-mono tracking-[0.2em] uppercase font-semibold text-white">Invite members</h2>
        <form onSubmit={handleCreateInvite} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Email</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-zinc-950 border border-white/10 rounded-none text-[12px] font-mono text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            />
          </div>
          <div>
            <label className="block text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Role</label>
            <div className="relative">
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "ORG_ADMIN" | "ORG_USER")}
                style={{ colorScheme: "dark" }}
                className="appearance-none w-full pl-4 pr-10 py-3 bg-zinc-950 border border-white/10 text-[10px] font-mono uppercase tracking-widest text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer"
              >
                <option value="ORG_USER">Member</option>
                <option value="ORG_ADMIN">Admin</option>
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-3 h-3 text-zinc-500" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 4l4 4 4-4" strokeLinecap="square"/>
              </svg>
            </div>
          </div>
          <Button type="submit" loading={isLoading}>Send Invite</Button>
        </form>
        {inviteRetryAfter !== null && (
          <p className="text-xs text-rose-300">Rate limited. Retry in {inviteRetryAfter}s.</p>
        )}

        <div className="space-y-2">
          <h3 className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mt-6">Pending invites</h3>
          {invites.length === 0 ? (
            <p className="text-[10px] font-mono uppercase text-zinc-600">No pending invites.</p>
          ) : (
            <div className="space-y-2">
              {invites.map((invite) => (
                <div key={invite.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 rounded-none border border-white/10 bg-zinc-950">
                  <div>
                    <p className="text-[12px] font-mono text-zinc-200">{invite.invitedEmail}</p>
                    <p className="text-[9px] font-mono tracking-widest uppercase text-zinc-500 mt-1">
                      {invite.role === "ORG_ADMIN" ? "Admin" : "Member"} · expires {new Date(invite.expiresAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResendInvite(invite.id)}
                      loading={inviteActionId === invite.id}
                      disabled={inviteActionId !== null}
                    >
                      Resend
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => handleRevokeInvite(invite.id)}
                      loading={inviteActionId === invite.id}
                      disabled={inviteActionId !== null}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-black border border-white/10 rounded-none p-8">
        <div className="mb-6">
          <h2 className="text-sm font-mono tracking-[0.2em] uppercase font-semibold text-white">Members</h2>
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mt-1">People with access to this organization</p>
        </div>
        <MemberList
          members={members}
          canManage
          onRoleChange={handleRoleChange}
          onRemove={handleRemoveMember}
          loadingUserId={memberActionUserId}
        />
      </div>

      {/* Info message for last org */}
      {isLastOrg && (
        <div className="bg-rose-950/10 border border-rose-500/30 rounded-none p-8">
          <h2 className="text-sm font-mono tracking-[0.2em] uppercase font-semibold text-rose-500 mb-2">Danger Zone</h2>
          <div className="bg-black border border-rose-500/20 rounded-none p-4 mt-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-rose-300 leading-relaxed">
              <span className="font-bold text-rose-500">Cannot delete this organization.</span> You must have at least one organization in your account. To delete this one, you first need to create another organization and switch to it.
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-rose-500/30 rounded-none p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-mono uppercase tracking-[0.2em] font-bold text-rose-500 mb-4">Delete Organization</h3>
            
            {/* Show data warning if details are present */}
            {deleteDetails ? (
              <>
                <div className="bg-black border border-rose-500/30 rounded-none p-4 mb-5">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-rose-200 font-bold mb-3">
                    This organization contains:
                  </p>
                  <ul className="text-[10px] font-mono uppercase tracking-widest text-rose-400 space-y-2">
                    {deleteDetails.items > 0 && <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> {deleteDetails.items} item{deleteDetails.items !== 1 ? 's' : ''}</li>}
                    {deleteDetails.locations > 0 && <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> {deleteDetails.locations} location{deleteDetails.locations !== 1 ? 's' : ''}</li>}
                    {deleteDetails.movements > 0 && <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> {deleteDetails.movements} movement{deleteDetails.movements !== 1 ? 's' : ''}</li>}
                    {deleteDetails.stock && deleteDetails.stock > 0 && <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> {deleteDetails.stock} stock record{deleteDetails.stock !== 1 ? 's' : ''}</li>}
                  </ul>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-rose-500 mt-6 font-bold">
                    All of this data will be permanently deleted.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-5 leading-relaxed">
                This will permanently delete the organization <span className="font-bold text-rose-400 px-1 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded-none">{organization.name}</span> and all associated data.
              </p>
            )}
            
            <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
              To confirm, type the organization name below:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={organization.name}
              className="w-full px-4 py-3 bg-black border border-white/10 rounded-none text-[12px] font-mono text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 mb-6 transition-none"
            />
            <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
              Owner confirmation: type <span className="font-bold text-rose-500">DELETE</span>
            </p>
            <input
              type="text"
              value={ownerConfirmText}
              onChange={(e) => setOwnerConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-4 py-3 bg-black border border-white/10 rounded-none text-[12px] font-mono text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 mb-6 transition-none"
            />
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                  setOwnerConfirmText("");
                  setDeleteDetails(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                disabled={deleteConfirmText !== organization.name || ownerConfirmText !== "DELETE" || isDeleting || !isOwner}
                loading={isDeleting}
              >
                {deleteDetails ? "Delete All Data" : "Delete Organization"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
