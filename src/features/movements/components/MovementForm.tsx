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
      setError("REASON IS REQUIRED FOR ADJUSTMENTS");
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
      <div className="relative z-10 w-full max-w-lg rounded-none bg-zinc-950 border border-white/10 p-8 shadow-2xl">
        <h2 className="text-lg font-mono font-bold uppercase tracking-[0.2em] text-white">Record Movement</h2>
        <p className="mt-1 text-[10px] uppercase font-mono tracking-widest text-zinc-500">
          Record a stock movement (receive, issue, or adjustment).
        </p>

        {error && (
          <div className="mt-6 rounded-none border-l-[2px] border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-[10px] font-mono text-rose-400 tracking-wide">
            {error}
          </div>
        )}

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="movement-item"
              className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-2"
            >
              Item
            </label>
            <select
              id="movement-item"
              value={itemId}
              onChange={(event) => setItemId(event.target.value)}
              className="w-full rounded-none border border-white/10 bg-black px-3 py-2.5 text-[10px] uppercase font-mono tracking-widest text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 [&>option]:bg-zinc-950 [&>option]:text-white"
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
              className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-2"
            >
              Location
            </label>
            <select
              id="movement-location"
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              className="w-full rounded-none border border-white/10 bg-black px-3 py-2.5 text-[10px] uppercase font-mono tracking-widest text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 [&>option]:bg-zinc-950 [&>option]:text-white"
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
              className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-2"
            >
              Movement Type
            </label>
            <select
              id="movement-type"
              value={type}
              onChange={(event) => setType(event.target.value as MovementType)}
              className="w-full rounded-none border border-white/10 bg-black px-3 py-2.5 text-[10px] uppercase font-mono tracking-widest text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 [&>option]:bg-zinc-950 [&>option]:text-white"
            >
              <option value="RECEIVE">Receive (add stock)</option>
              <option value="ISSUE">Issue (remove stock)</option>
              <option value="ADJUSTMENT">Adjustment (correct stock)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="movement-quantity"
              className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-2"
            >
              Quantity {selectedItem && `(${selectedItem.unit})`}
              {type === "ADJUSTMENT" && (
                <span className="ml-1 text-[8px] opacity-70 italic tracking-wider">
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
              className="w-full rounded-none border border-white/10 bg-black px-3 py-2.5 text-[10px] font-mono uppercase tracking-widest text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              placeholder={type === "ADJUSTMENT" ? "-0.00" : "0.00"}
            />
          </div>

          {type === "ADJUSTMENT" && (
            <div>
              <label
                htmlFor="movement-reason"
                className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-2"
              >
                Reason
              </label>
              <input
                id="movement-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="w-full rounded-none border border-white/10 bg-black px-3 py-2.5 text-[10px] font-mono uppercase tracking-widest text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                placeholder="STOCK COUNT CORRECTION"
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
