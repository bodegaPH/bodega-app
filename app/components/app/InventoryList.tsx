"use client";

import { useState } from "react";
import { Package, Plus, ArrowRightLeft } from "lucide-react";
import Button from "@/app/components/ui/Button";
import MovementForm from "@/app/components/app/MovementForm";
import { useRouter } from "next/navigation";

interface InventoryRow {
  id: string;
  quantity: string;
  item: {
    id: string;
    name: string;
    sku: string;
    unit: string;
    category: string | null;
    lowStockThreshold: string | null;
  };
  location: {
    id: string;
    name: string;
  };
}

interface InventoryListProps {
  inventory: InventoryRow[];
  items: Array<{ id: string; name: string; sku: string; unit: string }>;
  locations: Array<{ id: string; name: string; isDefault: boolean }>;
}

export default function InventoryList({ inventory, items, locations }: InventoryListProps) {
  const [movementOpen, setMovementOpen] = useState(false);
  const [preselectedItemId, setPreselectedItemId] = useState<string | null>(null);
  const router = useRouter();

  function handleRecordMovement(itemId?: string) {
    setPreselectedItemId(itemId ?? null);
    setMovementOpen(true);
  }

  function handleSuccess() {
    router.refresh();
  }

  return (
    <>
      <div className="rounded-3xl bg-zinc-900/40 backdrop-blur-3xl border border-white/5 ring-1 ring-white/10 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">Current Stock</h2>
            <p className="mt-1.5 text-sm text-zinc-400">
              View current inventory levels across all locations.
            </p>
          </div>
          <Button onClick={() => handleRecordMovement()} className="flex items-center gap-2 border-0">
            <Plus className="h-4 w-4" />
            Record Movement
          </Button>
        </div>

        <div className="mt-6">
          {inventory.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01] px-4 py-16 text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10">
                <Package className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-white">No inventory yet</h3>
              <p className="mb-8 max-w-sm text-sm leading-relaxed text-zinc-400">
                Record your first stock movement to start tracking inventory.
              </p>
              <Button onClick={() => handleRecordMovement()} variant="ghost">
                Record First Movement
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900/70 text-xs uppercase tracking-wide text-zinc-400">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((row) => {
                    const qty = Number(row.quantity);
                    const threshold = row.item.lowStockThreshold
                      ? Number(row.item.lowStockThreshold)
                      : null;
                    const isLowStock = threshold !== null && qty <= threshold;

                    return (
                      <tr key={row.id} className="border-t border-white/5 text-zinc-200">
                        <td className="px-4 py-3 font-medium text-white">{row.item.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-300">{row.item.sku}</td>
                        <td className="px-4 py-3 text-zinc-300">{row.location.name}</td>
                        <td className="px-4 py-3 font-semibold text-white">{qty}</td>
                        <td className="px-4 py-3 text-zinc-400">{row.item.unit}</td>
                        <td className="px-4 py-3">
                          {isLowStock ? (
                            <span className="inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border border-amber-500/20 bg-amber-500/10 text-amber-300">
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                              OK
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRecordMovement(row.item.id)}
                              className="rounded-lg border border-transparent p-2 text-zinc-400 transition-colors hover:border-white/5 hover:bg-white/10 hover:text-white"
                              title="Record movement"
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <MovementForm
        open={movementOpen}
        onClose={() => setMovementOpen(false)}
        onSuccess={handleSuccess}
        preselectedItemId={preselectedItemId}
        items={items}
        locations={locations}
      />
    </>
  );
}
