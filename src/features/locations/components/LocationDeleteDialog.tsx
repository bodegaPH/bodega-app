"use client";

import { useState } from "react";
import Button from "@/src/components/ui/Button";

interface LocationDeleteDialogProps {
  open: boolean;
  location: {
    id: string;
    name: string;
    isDefault: boolean;
  } | null;
  onClose: () => void;
  onDeleted: () => void;
}

export default function LocationDeleteDialog({
  open,
  location,
  onClose,
  onDeleted,
}: LocationDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open || !location) {
    return null;
  }

  const currentLocation = location;

  async function handleDelete() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/locations/${currentLocation.id}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        window.location.assign("/auth/signin");
        return;
      }

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (response.status === 403) {
        setError(data.error ?? "You do not have access to this organization");
        return;
      }

      if (!response.ok) {
        setError(data.error ?? "Unable to delete location");
        return;
      }

      onDeleted();
      onClose();
    } catch {
      setError("Unable to delete location right now. Try again.");
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
        <h2 className="text-lg font-semibold text-white">Delete location</h2>
        <p className="mt-2 text-sm text-zinc-300">
          You are about to delete <span className="font-semibold text-white">{currentLocation.name}</span>.
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          Deletion is blocked if this location is default or has current stock.
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
          <Button type="button" variant="danger" onClick={handleDelete} loading={loading}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
