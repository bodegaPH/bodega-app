"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Button from "@/src/components/ui/Button";

interface OrganizationSettingsFormProps {
  organization: {
    id: string;
    name: string;
  };
  isLastOrg: boolean;
}

export default function OrganizationSettingsForm({ organization, isLastOrg }: OrganizationSettingsFormProps) {
  const [name, setName] = useState(organization.name);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDetails, setDeleteDetails] = useState<{
    items: number;
    locations: number;
    movements: number;
    stock?: number;
  } | null>(null);
  const router = useRouter();
  const { update } = useSession();

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
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(force = false) {
    if (deleteConfirmText !== organization.name) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    try {
      const url = force
        ? `/api/organizations/${organization.id}?force=true`
        : `/api/organizations/${organization.id}`;

      const res = await fetch(url, {
        method: "DELETE",
      });

      const data = await res.json();

      // 409 = Needs confirmation with data counts
      if (res.status === 409 && data.requiresConfirmation) {
        setDeleteDetails(data.details);
        setIsDeleting(false);
        // Keep modal open to show confirmation
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
      window.location.href = "/dashboard";
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred. Please try again." });
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteDetails(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Organization Details Section */}
      <div className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-2xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        <h2 className="text-lg font-semibold text-white mb-6">Organization Details</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Organization Name Field */}
          <div>
            <label htmlFor="orgName" className="block text-sm font-medium text-zinc-300 mb-2">
              Organization Name
            </label>
            <input
              type="text"
              id="orgName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner"
            />
          </div>

          {/* Message */}
          {message && (
            <div
              className={`px-4 py-3 rounded-xl text-sm ${
                message.type === "success"
                  ? "bg-emerald-500/10 text-emerald-200 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-200 border border-rose-500/20"
              }`}
            >
              {message.text}
            </div>
          )}

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
        <div className="bg-rose-950/20 backdrop-blur-3xl border border-rose-500/20 rounded-2xl p-6 shadow-[inset_0_1px_0_0_rgba(244,63,94,0.05)]">
          <h2 className="text-lg font-semibold text-rose-400 mb-2">Danger Zone</h2>
          <p className="text-sm text-rose-200/70 mb-6">
            Permanently delete this organization. This action cannot be undone and will erase all data, stock, and locations associated with it.
          </p>
          <Button
            type="button"
            variant="danger"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete Organization
          </Button>
        </div>
      )}

      {/* Info message for last org */}
      {isLastOrg && (
        <div className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-2xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
          <h2 className="text-lg font-semibold text-white mb-2">Danger Zone</h2>
          <div className="bg-black/20 border border-white/10 rounded-xl p-4 mt-4">
            <p className="text-sm text-zinc-400 leading-relaxed">
              <span className="font-semibold text-zinc-300">Cannot delete this organization.</span> You must have at least one organization in your account. To delete this one, you first need to create another organization and switch to it.
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Delete Organization</h3>
            
            {/* Show data warning if details are present */}
            {deleteDetails ? (
              <>
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 mb-5">
                  <p className="text-sm text-rose-200 font-semibold mb-3">
                    This organization contains:
                  </p>
                  <ul className="text-sm text-rose-300 space-y-2">
                    {deleteDetails.items > 0 && <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> {deleteDetails.items} item{deleteDetails.items !== 1 ? 's' : ''}</li>}
                    {deleteDetails.locations > 0 && <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> {deleteDetails.locations} location{deleteDetails.locations !== 1 ? 's' : ''}</li>}
                    {deleteDetails.movements > 0 && <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> {deleteDetails.movements} movement{deleteDetails.movements !== 1 ? 's' : ''}</li>}
                    {deleteDetails.stock && deleteDetails.stock > 0 && <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> {deleteDetails.stock} stock record{deleteDetails.stock !== 1 ? 's' : ''}</li>}
                  </ul>
                  <p className="text-sm text-rose-200 mt-4 font-medium">
                    All of this data will be permanently deleted.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-300 mb-5 leading-relaxed">
                This will permanently delete the organization <span className="font-semibold text-white px-1 py-0.5 bg-white/10 rounded">{organization.name}</span> and all associated data.
              </p>
            )}
            
            <p className="text-sm text-zinc-400 mb-2">
              To confirm, type the organization name below:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={organization.name}
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 mb-6 transition-all shadow-inner"
            />
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                  setDeleteDetails(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => handleDelete(deleteDetails ? true : false)}
                disabled={deleteConfirmText !== organization.name || isDeleting}
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
