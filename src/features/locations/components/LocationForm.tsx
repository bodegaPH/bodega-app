"use client";

import { FormEvent, useEffect, useState } from "react";
import Button from "@/src/components/ui/Button";

interface LocationPayload {
  id: string;
  name: string;
  isDefault: boolean;
}

interface LocationFormProps {
  open: boolean;
  mode: "create" | "edit";
  location?: LocationPayload;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LocationForm({
  open,
  mode,
  location,
  onClose,
  onSuccess,
}: LocationFormProps) {
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(location?.name ?? "");
    setIsDefault(location?.isDefault ?? false);
    setError("");
  }, [open, location]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Location name is required");
      return;
    }

    if (trimmed.length > 100) {
      setError("Location name must be 100 characters or fewer");
      return;
    }

    setLoading(true);

    const endpoint = mode === "create" ? "/api/locations" : `/api/locations/${location?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, isDefault }),
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
        setError(data.error ?? "Unable to save location");
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Unable to save location right now. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "create" ? "Create Location" : "Edit Location";
  const submitLabel = mode === "create" ? "Create Location" : "Save Changes";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-zinc-900/40 backdrop-blur-3xl border border-white/5 ring-1 ring-white/10 p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {mode === "create"
            ? "Add a new storage location for your organization."
            : "Update this location name or set it as default."}
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        )}

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="location-name" className="text-sm font-medium text-zinc-300">
              Name
            </label>
            <input
              id="location-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="Warehouse A"
            />
            <p className="mt-1 text-xs text-zinc-500">{name.length}/100</p>
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(event) => setIsDefault(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-blue-500"
            />
            <span className="text-sm text-zinc-300">Set as default location</span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
