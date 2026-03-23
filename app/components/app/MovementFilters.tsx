"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

interface MovementFiltersProps {
  items: Array<{ id: string; name: string; sku: string }>;
}

export default function MovementFilters({ items }: MovementFiltersProps) {
  const router = useRouter();
  const params = useParams();
  const orgId = params.orgId as string;
  const searchParams = useSearchParams();

  const [itemId, setItemId] = useState(searchParams.get("itemId") ?? "");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const urlParams = new URLSearchParams();
    if (itemId) urlParams.set("itemId", itemId);
    if (from) urlParams.set("from", from);
    if (to) urlParams.set("to", to);

    router.push(`/${orgId}/movements?${urlParams.toString()}`);
  }

  function handleClearFilters() {
    setItemId("");
    setFrom("");
    setTo("");
    router.push(`/${orgId}/movements`);
  }

  const hasFilters = Boolean(itemId || from || to);

  return (
    <div className="rounded-lg bg-zinc-900/30 backdrop-blur-xl border border-white/5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] p-4">
      <form onSubmit={handleApplyFilters} className="flex flex-col sm:flex-row items-end gap-4">
        <div className="flex-1 w-full sm:w-auto min-w-[200px]">
          <label htmlFor="filter-item" className="text-xs font-medium text-zinc-400 uppercase tracking-wider block mb-2">
            Item
          </label>
          <select
            id="filter-item"
            value={itemId}
            onChange={(event) => setItemId(event.target.value)}
            className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 [&>option]:bg-zinc-900 [&>option]:text-white"
          >
            <option value="">All items</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.sku})
              </option>
            ))}
          </select>
        </div>

        <div className="flex-[2] w-full sm:w-auto grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="filter-from" className="text-xs font-medium text-zinc-400 uppercase tracking-wider block mb-2">
              From Date
            </label>
            <input
              id="filter-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 [color-scheme:dark]"
            />
          </div>

          <div>
            <label htmlFor="filter-to" className="text-xs font-medium text-zinc-400 uppercase tracking-wider block mb-2">
              To Date
            </label>
            <input
              id="filter-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 [color-scheme:dark]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="submit"
            className="flex-1 sm:flex-none px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors border border-transparent whitespace-nowrap"
          >
            Apply Filters
          </button>
          {hasFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-4 py-2 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-medium text-zinc-300 hover:text-white transition-colors whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
