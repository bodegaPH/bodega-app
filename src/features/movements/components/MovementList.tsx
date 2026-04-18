"use client";

import { UpdateIcon as ArrowDownUp } from "@radix-ui/react-icons";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface Movement {
  id: string;
  type: "RECEIVE" | "ISSUE" | "ADJUSTMENT";
  quantity: string;
  reason: string | null;
  createdAt: string;
  /** Optional — not populated on freshly-created movement responses. */
  item?: {
    id: string;
    name: string;
    sku: string;
    unit: string;
  };
  /** Optional — not populated on freshly-created movement responses. */
  location?: {
    id: string;
    name: string;
  };
  /** Optional — not populated on freshly-created movement responses. */
  createdBy?: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface MovementListProps {
  movements: Movement[];
  pagination: Pagination;
}

export default function MovementList({
  movements,
  pagination,
}: MovementListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  if (movements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center border-y border-dashed border-white/10 bg-black px-4 py-16 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-none border border-indigo-500/20 bg-indigo-500/10">
          <ArrowDownUp className="h-6 w-6 text-indigo-400" />
        </div>
        <h3 className="mb-2 text-sm font-mono tracking-widest uppercase text-zinc-200">
          No movements found
        </h3>
        <p className="max-w-sm text-[10px] font-mono tracking-wide leading-relaxed text-zinc-500 uppercase">
          No stock movements match the current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border border-white/10 bg-black">
        <table className="w-full text-left border-collapse">
          <thead className="bg-zinc-950 border-b border-white/10 text-[9px] uppercase tracking-widest font-mono text-zinc-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Created By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {movements.map((movement) => {
              const date = new Date(movement.createdAt);
              const formattedDate = date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              let typeBadge: { label: string; classes: string };
              if (movement.type === "RECEIVE") {
                typeBadge = {
                  label: "Receive",
                  classes:
                    "border-emerald-500/30 bg-emerald-500/5 text-emerald-500",
                };
              } else if (movement.type === "ISSUE") {
                typeBadge = {
                  label: "Issue",
                  classes: "border-rose-500/30 bg-rose-500/5 text-rose-500",
                };
              } else {
                typeBadge = {
                  label: "Adjustment",
                  classes: "border-amber-500/30 bg-amber-500/5 text-amber-500",
                };
              }

              return (
                <tr
                  key={movement.id}
                  className="text-zinc-300 hover:bg-white/[0.02] transition-colors border-b border-white/5"
                >
                  <td className="px-4 py-3 text-zinc-400 font-mono tracking-widest text-[10px]">
                    {formattedDate}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-zinc-200 text-[12px]">
                      {movement.item?.name ?? "—"}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono tracking-widest">
                      {movement.item?.sku ?? ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[11px] font-mono text-zinc-400">
                    {movement.location?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-none px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest border ${typeBadge.classes}`}
                    >
                      {typeBadge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono font-bold text-[12px] text-zinc-200">
                      {movement.quantity}
                    </div>
                    {movement.item && (
                      <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
                        {movement.item.unit}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[11px] font-mono text-zinc-500">
                    {movement.reason || "-"}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 font-mono tracking-wide text-[10px]">
                    {movement.createdBy?.name ||
                      movement.createdBy?.email ||
                      "Unknown"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-4 py-2 rounded-none border border-white/10 bg-black text-[10px] font-mono tracking-widest uppercase text-zinc-400 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="px-4 py-2 rounded-none border border-white/10 bg-black text-[10px] font-mono tracking-widest uppercase text-zinc-400 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
