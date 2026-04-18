"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";

interface MovementFiltersProps {
  items: Array<{ id: string; name: string; sku: string }>;
  locations: Array<{ id: string; name: string }>;
}

export default function MovementFilters({ items, locations }: MovementFiltersProps) {
  const router = useRouter();
  const params = useParams();
  const orgId = params.orgId as string;
  const searchParams = useSearchParams();

  const [itemId, setItemId] = useState(searchParams.get("itemId") ?? "");
  const [locationId, setLocationId] = useState(searchParams.get("locationId") ?? "");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const urlParams = new URLSearchParams();
    if (itemId) urlParams.set("itemId", itemId);
    if (locationId) urlParams.set("locationId", locationId);
    if (from) urlParams.set("from", from);
    if (to) urlParams.set("to", to);

    router.push(`/${orgId}/movements?${urlParams.toString()}`);
  }

  function handleClearFilters() {
    setItemId("");
    setLocationId("");
    setFrom("");
    setTo("");
    router.push(`/${orgId}/movements`);
  }

  const hasFilters = Boolean(itemId || locationId || from || to);

  function downloadCsv(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  function mapExportError(error: {
    code?: string;
    message?: string;
    retryAfterSeconds?: number;
  }): string {
    switch (error.code) {
      case "INVALID_FILTERS":
        return error.message ?? "Invalid filters. Please review your selected date or item filters.";
      case "EXPORT_CAP_EXCEEDED":
        return "Export exceeds sync limits. Please narrow your filters and try again.";
      case "EXPORT_TIMEOUT":
        return "Export timed out. Try a narrower date range or item filter.";
      case "RATE_LIMITED":
        if (typeof error.retryAfterSeconds === "number") {
          return `Too many export requests. Try again in ${error.retryAfterSeconds}s.`;
        }
        return "Too many export requests. Please try again shortly.";
      case "SERVER_ERROR":
      default:
        return error.message ?? "Failed to export movement CSV. Please retry.";
    }
  }

  function parseFilenameFromDisposition(value: string | null): string {
    if (!value) {
      return "movement-ledger.csv";
    }

    const match = value.match(/filename="?([^";]+)"?/i);
    return match?.[1] ?? "movement-ledger.csv";
  }

  async function runExport(mode: "filtered" | "all") {
    setIsExporting(true);
    setExportError(null);

    try {
      const response = await fetch("/api/movements/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          mode,
          confirmedAll: mode === "all",
          filters: {
            itemId: searchParams.get("itemId") ?? undefined,
            locationId: searchParams.get("locationId") ?? undefined,
            from: searchParams.get("from") ?? undefined,
            to: searchParams.get("to") ?? undefined,
          },
        }),
      });

      if (!response.ok) {
        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        setExportError(
          mapExportError({
            code: (payload as { error?: { code?: string } })?.error?.code,
            message: (payload as { error?: { message?: string } })?.error?.message,
            retryAfterSeconds: (payload as { error?: { retryAfterSeconds?: number } })?.error
              ?.retryAfterSeconds,
          }),
        );
        return;
      }

      const blob = await response.blob();
      const filename = parseFilenameFromDisposition(response.headers.get("Content-Disposition"));
      downloadCsv(filename, blob);
    } catch {
      setExportError("Failed to export movement CSV. Please retry.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleFilteredExport() {
    await runExport("filtered");
  }

  async function handleBroadExport() {
    const confirmed = window.confirm(
      "This exports all movement rows and can be large. It may fail on cap or timeout. Continue?",
    );

    if (!confirmed) {
      return;
    }

    await runExport("all");
  }

  return (
    <div className="bg-zinc-950 border border-white/10 p-6 space-y-6">
      <form onSubmit={handleApplyFilters} className="flex flex-col sm:flex-row items-end gap-4">
        <div className="flex-1 w-full sm:w-auto min-w-[200px]">
          <label htmlFor="filter-item" className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-2">
            Item
          </label>
          <select
            id="filter-item"
            value={itemId}
            onChange={(event) => setItemId(event.target.value)}
            className="w-full rounded-none border border-white/10 bg-black px-3 py-2 text-[10px] uppercase font-mono tracking-widest text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 [&>option]:bg-zinc-950 [&>option]:text-white"
          >
            <option value="">All items</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.sku})
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 w-full sm:w-auto min-w-[200px]">
          <label htmlFor="filter-location" className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-2">
            Location
          </label>
          <select
            id="filter-location"
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
            className="w-full rounded-none border border-white/10 bg-black px-3 py-2 text-[10px] uppercase font-mono tracking-widest text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 [&>option]:bg-zinc-950 [&>option]:text-white"
          >
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-[2] w-full sm:w-auto grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="filter-from" className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-2">
              From Date
            </label>
            <input
              id="filter-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="w-full rounded-none border border-white/10 bg-black px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 [color-scheme:dark]"
            />
          </div>

          <div>
            <label htmlFor="filter-to" className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-2">
              To Date
            </label>
            <input
              id="filter-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="w-full rounded-none border border-white/10 bg-black px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 [color-scheme:dark]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="submit"
            className="w-full sm:w-auto"
          >
            Apply Filters
          </Button>
          {hasFilters && (
            <Button
              variant="ghost"
              type="button"
              onClick={handleClearFilters}
              className="w-full sm:w-auto"
            >
              Clear
            </Button>
          )}
        </div>
      </form>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleFilteredExport}
            disabled={isExporting}
          >
            {isExporting ? "Exporting..." : "Export CSV"}
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={handleBroadExport}
            disabled={isExporting}
          >
            Export All
          </Button>
        </div>
        <p className="text-[10px] font-mono tracking-widest uppercase text-zinc-500">
          Export uses current filters by default. Broad export requires confirmation.
        </p>
      </div>

      {exportError && (
        <div className="rounded-none border-l-[2px] border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-[10px] font-mono text-rose-400 tracking-wide">
          {exportError}
        </div>
      )}
    </div>
  );
}
