"use client";

import { FormEvent, useEffect, useState } from "react";
import Button from "@/src/components/ui/Button";

export interface ItemPayload {
  id: string;
  name: string;
  sku: string;
  unit: string;
  category: string | null;
  lowStockThreshold: string | null;
  isActive: boolean;
}

interface ItemFormProps {
  open: boolean;
  mode: "create" | "edit";
  item?: ItemPayload;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ItemForm({ open, mode, item, onClose, onSuccess }: ItemFormProps) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(item?.name ?? "");
    setSku(item?.sku ?? "");
    setUnit(item?.unit ?? "");
    setCategory(item?.category ?? "");
    setLowStockThreshold(item?.lowStockThreshold ?? "");
    setError("");
  }, [open, item]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const trimmedSku = sku.trim();
    const trimmedUnit = unit.trim();
    const trimmedCategory = category.trim();
    const trimmedThreshold = lowStockThreshold.trim();

    if (!trimmedName) {
      setError("Name is required");
      return;
    }

    if (mode === "create" && !trimmedSku) {
      setError("SKU is required");
      return;
    }

    if (!trimmedUnit) {
      setError("Unit is required");
      return;
    }

    if (trimmedThreshold) {
      const numberValue = Number(trimmedThreshold);
      if (!Number.isFinite(numberValue) || numberValue <= 0) {
        setError("Low stock threshold must be a positive number");
        return;
      }
    }

    setLoading(true);

    const endpoint = mode === "create" ? "/api/items" : `/api/items/${item?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const payload = {
      name: trimmedName,
      ...(mode === "create" ? { sku: trimmedSku } : {}),
      unit: trimmedUnit,
      category: trimmedCategory || null,
      lowStockThreshold: trimmedThreshold || null,
    };

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        setError(data.error ?? "Unable to save item");
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Unable to save item right now. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "create" ? "Create Item" : "Edit Item";
  const submitLabel = mode === "create" ? "Create Item" : "Save Changes";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-zinc-900/40 backdrop-blur-3xl border border-white/5 ring-1 ring-white/10 p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {mode === "create"
            ? "Add a new product or SKU to track inventory."
            : "Update item details. SKU is locked after creation."}
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        )}

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="item-name" className="text-sm font-medium text-zinc-300">
              Name
            </label>
            <input
              id="item-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="Product name"
            />
          </div>

          <div>
            <label htmlFor="item-sku" className="text-sm font-medium text-zinc-300">
              SKU
            </label>
            <input
              id="item-sku"
              value={sku}
              onChange={(event) => setSku(event.target.value.toUpperCase())}
              readOnly={mode === "edit"}
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 read-only:cursor-not-allowed read-only:bg-zinc-800/60"
              placeholder="SKU-001"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="item-unit" className="text-sm font-medium text-zinc-300">
                Unit
              </label>
              <input
                id="item-unit"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="pcs"
              />
            </div>

            <div>
              <label htmlFor="item-category" className="text-sm font-medium text-zinc-300">
                Category (optional)
              </label>
              <input
                id="item-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="Beverages"
              />
            </div>
          </div>

          <div>
            <label htmlFor="item-low-stock" className="text-sm font-medium text-zinc-300">
              Low Stock Threshold (optional)
            </label>
            <input
              id="item-low-stock"
              type="number"
              min="0"
              step="0.01"
              value={lowStockThreshold}
              onChange={(event) => setLowStockThreshold(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="10"
            />
          </div>

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
