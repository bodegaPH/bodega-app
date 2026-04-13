"use client";

import { useState } from "react";
import { ArchiveX, Package, Pencil, RotateCcw, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { extractApiErrorMessage } from "@/lib/client-errors";
import ItemForm, { type ItemPayload } from "./ItemForm";
import ItemDeactivateDialog from "./ItemDeactivateDialog";

interface ItemListProps {
  initialItems: ItemPayload[];
}

export default function ItemList({ initialItems }: ItemListProps) {
  const [items, setItems] = useState(initialItems);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ItemPayload | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ItemPayload | null>(null);
  const [inlineError, setInlineError] = useState("");
  const router = useRouter();

  async function reloadItems(nextIncludeInactive = includeInactive) {
    const response = await fetch(
      `/api/items${nextIncludeInactive ? "?includeInactive=true" : ""}`,
      { cache: "no-store" }
    );

    if (response.status === 401) {
      window.location.assign("/auth/signin");
      return;
    }

    const data = (await response.json().catch(() => ({}))) as {
      items?: ItemPayload[];
      error?: string;
    };

    if (response.status === 403) {
      setInlineError(extractApiErrorMessage(data, "You do not have access to this organization"));
      return;
    }

    if (!response.ok) {
      setInlineError(extractApiErrorMessage(data, "Unable to load items"));
      return;
    }

    setItems(data.items ?? []);
    setInlineError("");
    router.refresh();
  }

  async function handleToggleInactive(checked: boolean) {
    setIncludeInactive(checked);
    await reloadItems(checked);
  }

  return (
    <>
      <div className="rounded-lg bg-zinc-900/30 backdrop-blur-3xl border border-white/5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">Items</h2>
            <p className="mt-1.5 text-sm text-zinc-500">
              Manage products and SKUs used for inventory and movements.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white shadow-none transition-colors border border-transparent">
            <Plus className="h-4 w-4" />
            New Item
          </Button>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-md border border-white/5 bg-white/[0.02] px-4 py-3">
          <p className="text-sm text-zinc-300">Show inactive items</p>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(event) => void handleToggleInactive(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-zinc-950"
            />
            <span className="text-xs text-zinc-500">Include inactive</span>
          </label>
        </div>

        {inlineError && (
          <div className="mt-6 rounded-md border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {inlineError}
          </div>
        )}

        <div className="mt-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.01] px-4 py-16 text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-md border border-blue-500/20 bg-blue-500/10">
                <Package className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-zinc-200 tracking-tight">No items found</h3>
              <p className="mb-8 max-w-sm text-sm leading-relaxed text-zinc-500">
                Create your first item to prepare for stock movements and inventory tracking.
              </p>
              <Button onClick={() => setCreateOpen(true)} className="rounded-md border border-white/5 bg-white/5 hover:bg-white/10 text-white shadow-none">
                Create First Item
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-white/5 bg-white/[0.02]">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900/50 text-[11px] uppercase tracking-wider font-semibold text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Low Stock</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.map((item) => (
                    <tr key={item.id} className="text-zinc-300 hover:bg-white/[0.01] transition-colors">
                      <td className="px-4 py-3 font-medium text-zinc-200">{item.name}</td>
                      <td className="px-4 py-3 font-mono tracking-tight text-xs text-zinc-400">{item.sku}</td>
                      <td className="px-4 py-3 text-zinc-400">{item.unit}</td>
                      <td className="px-4 py-3 text-zinc-500">{item.category || "-"}</td>
                      <td className="px-4 py-3 font-mono tracking-tight text-zinc-400">{item.lowStockThreshold || "-"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${
                            item.isActive
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                              : "border-zinc-500/20 bg-zinc-500/10 text-zinc-400"
                          }`}
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditTarget(item)}
                            className="rounded-md border border-transparent p-2 text-zinc-500 transition-colors hover:border-white/5 hover:bg-white/5 hover:text-zinc-300"
                            title="Edit item"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeactivateTarget(item)}
                            className="rounded-md border border-transparent p-2 text-zinc-500 transition-colors hover:border-white/5 hover:bg-white/5 hover:text-zinc-300"
                            title={item.isActive ? "Deactivate item" : "Reactivate item"}
                          >
                            {item.isActive ? (
                              <ArchiveX className="h-4 w-4 text-rose-500 hover:text-rose-400" />
                            ) : (
                              <RotateCcw className="h-4 w-4 text-blue-500 hover:text-blue-400" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ItemForm
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSuccess={() => void reloadItems()}
      />

      <ItemForm
        open={Boolean(editTarget)}
        mode="edit"
        item={editTarget ?? undefined}
        onClose={() => setEditTarget(null)}
        onSuccess={() => void reloadItems()}
      />

      <ItemDeactivateDialog
        open={Boolean(deactivateTarget)}
        item={deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onUpdated={() => void reloadItems()}
      />
    </>
  );
}
