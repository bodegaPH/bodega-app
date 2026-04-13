"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { extractApiErrorMessage } from "@/lib/client-errors";
import type { ItemPayload } from "./ItemForm";

interface ItemDeactivateDialogProps {
  open: boolean;
  item: ItemPayload | null;
  onClose: () => void;
  onUpdated: () => void;
}

export default function ItemDeactivateDialog({
  open,
  item,
  onClose,
  onUpdated,
}: ItemDeactivateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open || !item) {
    return null;
  }

  const currentItem = item;
  const actionLabel = currentItem.isActive ? "Deactivate" : "Reactivate";

  async function handleAction() {
    setLoading(true);
    setError("");

    const endpoint = currentItem.isActive
      ? `/api/items/${currentItem.id}`
      : `/api/items/${currentItem.id}/reactivate`;
    const method = currentItem.isActive ? "DELETE" : "POST";

    try {
      const response = await fetch(endpoint, { method });

      if (response.status === 401) {
        window.location.assign("/auth/signin");
        return;
      }

      const data: unknown = await response.json().catch(() => ({}));

      if (response.status === 403) {
        setError(extractApiErrorMessage(data, "You do not have access to this organization"));
        return;
      }

      if (!response.ok) {
        setError(extractApiErrorMessage(data, `Unable to ${actionLabel.toLowerCase()} item`));
        return;
      }

      onUpdated();
      onClose();
    } catch {
      setError(`Unable to ${actionLabel.toLowerCase()} item right now. Try again.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-zinc-900/40 backdrop-blur-3xl border border-white/5 ring-1 ring-white/10 p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white">{actionLabel} item</h2>
        <p className="mt-2 text-sm text-zinc-300">
          {actionLabel} <span className="font-semibold text-white">{currentItem.name}</span> ({currentItem.sku})?
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          {currentItem.isActive
            ? "This keeps stock history and movement records intact."
            : "This restores the item for use in future inventory operations."}
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={currentItem.isActive ? "danger" : "primary"}
            onClick={handleAction}
            loading={loading}
          >
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
