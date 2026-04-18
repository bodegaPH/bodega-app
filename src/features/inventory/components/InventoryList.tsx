"use client";

import { useState } from "react";
import { TokensIcon as Package, PlusIcon as Plus, UpdateIcon as ArrowRightLeft } from "@radix-ui/react-icons";
import Button from "@/components/ui/Button";
import { MovementForm } from "@/features/movements";
import { useRouter } from "next/navigation";
import { ExportButton } from "./ExportButton";

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
      <div className="bg-zinc-950 border border-white/10 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-mono font-bold uppercase tracking-[0.2em] text-white">Current Stock</h2>
            <p className="mt-1 text-[10px] uppercase font-mono tracking-widest text-zinc-500">
              View current inventory levels across all locations.
            </p>
          </div>
          <div className="flex gap-2">
            <ExportButton />
            <Button onClick={() => handleRecordMovement()} className="gap-2 uppercase text-[10px]">
              <Plus className="h-3.5 w-3.5" />
              Record Movement
            </Button>
          </div>
        </div>

        <div className="mt-6">
          {inventory.length === 0 ? (
            <div className="flex flex-col items-center justify-center border-y border-dashed border-white/10 bg-black px-4 py-16 text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-none border border-indigo-500/20 bg-indigo-500/10">
                <Package className="h-6 w-6 text-indigo-400" />
              </div>
              <h3 className="mb-2 text-sm font-mono tracking-widest uppercase text-zinc-200">No inventory yet</h3>
              <p className="mb-8 max-w-sm text-[10px] font-mono tracking-wide leading-relaxed text-zinc-500">
                RECORD YOUR FIRST STOCK MOVEMENT TO START TRACKING.
              </p>
              <Button variant="ghost" onClick={() => handleRecordMovement()}>
                Record First Movement
              </Button>
            </div>
          ) : (
            <div className="border border-white/10 bg-black">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-950 border-b border-white/10 text-[9px] uppercase tracking-widest font-mono text-zinc-500">
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
                <tbody className="divide-y divide-white/5">
                  {inventory.map((row) => {
                    const qty = Number(row.quantity);
                    const threshold = row.item.lowStockThreshold
                      ? Number(row.item.lowStockThreshold)
                      : null;
                    const isLowStock = threshold !== null && qty <= threshold;

                    return (
                      <tr key={row.id} className="text-zinc-300 hover:bg-white/[0.02] transition-colors border-b border-white/5">
                        <td className="px-4 py-3 text-[12px] font-mono text-zinc-200">{row.item.name}</td>
                        <td className="px-4 py-3 font-mono tracking-widest text-[10px] text-zinc-500">{row.item.sku}</td>
                        <td className="px-4 py-3 text-[11px] font-mono text-zinc-400">{row.location.name}</td>
                        <td className="px-4 py-3 font-mono tracking-widest text-[12px] font-bold text-zinc-200">{qty}</td>
                        <td className="px-4 py-3 text-[11px] font-mono text-zinc-500">{row.item.unit}</td>
                        <td className="px-4 py-3">
                          {isLowStock ? (
                            <span className="inline-flex rounded-none px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest border border-amber-500/30 bg-amber-500/5 text-amber-500">
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex rounded-none px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest border border-emerald-500/30 bg-emerald-500/5 text-emerald-500">
                              OK
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRecordMovement(row.item.id)}
                              className="rounded-none border border-transparent p-2 text-zinc-500 transition-colors hover:border-white/10 hover:bg-zinc-900 hover:text-zinc-300"
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
