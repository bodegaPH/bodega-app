"use client";

import { MagicWandIcon } from "@radix-ui/react-icons";
import { type SimulationSnapshotDTO } from "../server";

interface RiskTableProps {
  snapshots: SimulationSnapshotDTO[];
}

export default function RiskTable({ snapshots }: RiskTableProps) {
  return (
    <div className="bg-zinc-950 border border-white/10 p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-lg font-mono font-bold uppercase tracking-[0.2em] text-white">Risk Simulation</h2>
          <p className="mt-1 text-[10px] uppercase font-mono tracking-widest text-zinc-500">
            Monte Carlo simulation forecasting stockout probabilities.
          </p>
        </div>
      </div>

      {snapshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-white/10 bg-black px-4 py-16 text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-none border border-indigo-500/20 bg-indigo-500/10">
            <MagicWandIcon className="h-6 w-6 text-indigo-400" />
          </div>
          <h3 className="mb-2 text-sm font-mono tracking-widest uppercase text-zinc-200">No Simulations Yet</h3>
          <p className="max-w-sm text-[10px] font-mono tracking-wide leading-relaxed text-zinc-500">
            Simulations run automatically for items with sufficient movement history.
          </p>
        </div>
      ) : (
        <div className="border border-white/10 bg-black overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-950 border-b border-white/10 text-[9px] uppercase tracking-widest font-mono text-zinc-500 whitespace-nowrap">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3 text-right">Stockout Risk</th>
                <th className="px-4 py-3 text-right">P10 / P50 / P90</th>
                <th className="px-4 py-3 text-right">Last Generated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {snapshots.map((snapshot) => (
                <tr key={snapshot.id} className="text-zinc-300 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-[12px] font-mono text-zinc-200">{snapshot.itemName}</td>
                  <td className="px-4 py-3 font-mono tracking-widest text-[10px] text-zinc-500">{snapshot.itemSku}</td>
                  <td className="px-4 py-3 text-[11px] font-mono text-zinc-400">{snapshot.locationName}</td>
                  <td className="px-4 py-3 text-right font-mono text-[11px]">
                    <span
                      className={`inline-flex rounded-none px-2 py-0.5 text-[10px] uppercase tracking-widest border ${
                        snapshot.stockoutProbability > 0.5
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                          : snapshot.stockoutProbability > 0.2
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {(snapshot.stockoutProbability * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tracking-widest text-[10px] text-zinc-500">
                    <span className="text-rose-400/80">{Math.round(snapshot.p10EndingStock)}</span>
                    <span className="mx-1 text-zinc-600">/</span>
                    <span className="text-amber-400/80">{Math.round(snapshot.p50EndingStock)}</span>
                    <span className="mx-1 text-zinc-600">/</span>
                    <span className="text-emerald-400/80">{Math.round(snapshot.p90EndingStock)}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-[10px] font-mono text-zinc-500">
                    {new Date(snapshot.generatedAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit"
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
