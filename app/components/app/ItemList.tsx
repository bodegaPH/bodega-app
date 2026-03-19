"use client";

import { useState } from "react";
import { ArchiveX, Package, Pencil, RotateCcw, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/ui/Button";
import ItemForm, { type ItemPayload } from "@/app/components/app/ItemForm";
import ItemDeactivateDialog from "@/app/components/app/ItemDeactivateDialog";

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
      setInlineError(data.error ?? "You do not have access to this organization");
      return;
    }

    if (!response.ok) {
      setInlineError(data.error ?? "Unable to load items");
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
      <div className="rounded-3xl bg-zinc-900/40 backdrop-blur-3xl border border-white/5 ring-1 ring-white/10 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">Items</h2>
            <p className="mt-1.5 text-sm text-zinc-400">
              Manage products and SKUs used for inventory and movements.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 border-0">
            <Plus className="h-4 w-4" />
            New Item
          </Button>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
          <p className="text-sm text-zinc-300">Show inactive items</p>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(event) => void handleToggleInactive(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-blue-500"
            />
            <span className="text-xs text-zinc-400">Include inactive</span>
          </label>
        </div>

        {inlineError && (
          <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {inlineError}
          </div>
        )}

        <div className="mt-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01] px-4 py-16 text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10">
                <Package className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-white">No items found</h3>
              <p className="mb-8 max-w-sm text-sm leading-relaxed text-zinc-400">
                Create your first item to prepare for stock movements and inventory tracking.
              </p>
              <Button onClick={() => setCreateOpen(true)} variant="ghost">
                Create First Item
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900/70 text-xs uppercase tracking-wide text-zinc-400">
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
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-white/5 text-zinc-200">
                      <td className="px-4 py-3 font-medium text-white">{item.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-300">{item.sku}</td>
                      <td className="px-4 py-3 text-zinc-300">{item.unit}</td>
                      <td className="px-4 py-3 text-zinc-400">{item.category || "-"}</td>
                      <td className="px-4 py-3 text-zinc-300">{item.lowStockThreshold || "-"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            item.isActive
                              ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                              : "border border-zinc-500/20 bg-zinc-500/10 text-zinc-300"
                          }`}
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditTarget(item)}
                            className="rounded-lg border border-transparent p-2 text-zinc-400 transition-colors hover:border-white/5 hover:bg-white/10 hover:text-white"
                            title="Edit item"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeactivateTarget(item)}
                            className="rounded-lg border border-transparent p-2 text-zinc-400 transition-colors hover:border-white/5 hover:bg-white/10 hover:text-white"
                            title={item.isActive ? "Deactivate item" : "Reactivate item"}
                          >
                            {item.isActive ? (
                              <ArchiveX className="h-4 w-4 text-rose-400" />
                            ) : (
                              <RotateCcw className="h-4 w-4 text-blue-400" />
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
