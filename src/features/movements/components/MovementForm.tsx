"use client";

import { FormEvent, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { extractApiErrorMessage } from "@/lib/client-errors";

export interface MovementFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedItemId?: string | null;
  items: Array<{ id: string; name: string; sku: string; unit: string }>;
  locations: Array<{ id: string; name: string; isDefault: boolean }>;
}

type MovementType = "RECEIVE" | "ISSUE" | "ADJUSTMENT";

export default function MovementForm({
  open,
  onClose,
  onSuccess,
  preselectedItemId,
  items,
  locations,
}: MovementFormProps) {
  const [itemId, setItemId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [type, setType] = useState<MovementType>("RECEIVE");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  useEffect(() => {
    if (!open) return;

    // Pre-select default location
    const defaultLocation = locations.find((loc) => loc.isDefault);
    setLocationId(defaultLocation?.id ?? locations[0]?.id ?? "");

    // Pre-select item if provided
    setItemId(preselectedItemId ?? "");

    setType("RECEIVE");
    setQuantity("");
    setReason("");
    setError("");
  }, [open, preselectedItemId, locations]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!itemId) {
      setError("Item is required");
      return;
    }

    if (!locationId) {
      setError("Location is required");
      return;
    }

    if (!type) {
      setError("Movement type is required");
      return;
    }

    const qtyNum = Number(quantity);
    if (!Number.isFinite(qtyNum)) {
      setError("Quantity must be a number");
      return;
    }
    if (type !== "ADJUSTMENT" && qtyNum <= 0) {
      setError("Quantity must be a positive number");
      return;
    }
    if (type === "ADJUSTMENT" && qtyNum === 0) {
      setError("Adjustment quantity cannot be zero");
      return;
    }

    if (type === "ADJUSTMENT" && !reason.trim()) {
      setError("Reason is required for adjustments");
      return;
    }

    if (type !== "ADJUSTMENT" && reason.trim()) {
      setError("Reason is only allowed for adjustments");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        itemId,
        locationId,
        type,
        quantity: qtyNum,
        ...(type === "ADJUSTMENT" ? { reason: reason.trim() } : {}),
      };

      const response = await fetch("/api/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        window.location.assign("/auth/signin");
        return;
      }

      const data: unknown = await response.json().catch(() => ({}));

      if (response.status === 403) {
        setError(extractApiErrorMessage(data, "You do not have access to this organization"));
        return;
      }

      if (response.status === 404) {
        setError("Item or location not found");
        return;
      }

      if (response.status === 409) {
        setError(extractApiErrorMessage(data, "Insufficient stock"));
        return;
      }

      if (response.status === 400) {
        setError(extractApiErrorMessage(data, "Invalid request"));
        return;
      }

      if (!response.ok) {
        setError(extractApiErrorMessage(data, "Unable to record movement"));
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Unable to record movement right now. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const selectedItem = items.find((item) => item.id === itemId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-zinc-900/40 backdrop-blur-3xl border border-white/5 ring-1 ring-white/10 p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white">Record Movement</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Record a stock movement (receive, issue, or adjustment).
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        )}

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="movement-item"
              className="text-sm font-medium text-zinc-300"
            >
              Item
            </label>
            <select
              id="movement-item"
              value={itemId}
              onChange={(event) => setItemId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 [&>option]:bg-zinc-900 [&>option]:text-white"
            >
              <option value="">Select an item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="movement-location"
              className="text-sm font-medium text-zinc-300"
            >
              Location
            </label>
            <select
              id="movement-location"
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 [&>option]:bg-zinc-900 [&>option]:text-white"
            >
              <option value="">Select a location</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} {loc.isDefault ? "(Default)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="movement-type"
              className="text-sm font-medium text-zinc-300"
            >
              Movement Type
            </label>
            <select
              id="movement-type"
              value={type}
              onChange={(event) => setType(event.target.value as MovementType)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 [&>option]:bg-zinc-900 [&>option]:text-white"
            >
              <option value="RECEIVE">Receive (add stock)</option>
              <option value="ISSUE">Issue (remove stock)</option>
              <option value="ADJUSTMENT">Adjustment (correct stock)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="movement-quantity"
              className="text-sm font-medium text-zinc-300"
            >
              Quantity {selectedItem && `(${selectedItem.unit})`}
              {type === "ADJUSTMENT" && (
                <span className="ml-1 text-xs text-zinc-500">
                  (negative to reduce stock)
                </span>
              )}
            </label>
            <input
              id="movement-quantity"
              type="number"
              min={type === "ADJUSTMENT" ? undefined : "0"}
              step="0.01"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder={type === "ADJUSTMENT" ? "e.g. -5 or 10" : "10"}
            />
          </div>

          {type === "ADJUSTMENT" && (
            <div>
              <label
                htmlFor="movement-reason"
                className="text-sm font-medium text-zinc-300"
              >
                Reason
              </label>
              <input
                id="movement-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="Stock count correction"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Record Movement
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
