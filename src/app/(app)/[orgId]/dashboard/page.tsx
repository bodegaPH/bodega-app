import Link from "next/link";
import { getDashboardData, getIndicators } from "@/features/dashboard/server";
import { InventoryAlerts } from "@/features/dashboard/components/InventoryAlerts";
import { InventoryFlowChart } from "@/features/dashboard/components/InventoryFlowChart";
import type { RecentMovement, LowStockItem } from "@/features/dashboard/server";

function formatQuantity(quantity: string) {
  return quantity || "0";
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const [{ orgName, stats, recentActivity, lowStock, volumeData }, indicators] =
    await Promise.all([getDashboardData(orgId), getIndicators(orgId)]);

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col gap-px bg-white/10 p-px rounded-none overflow-hidden max-w-[1800px] animate-in fade-in duration-500 shadow-2xl">
      <div className="flex items-center justify-between bg-zinc-950 p-4">
        <h1 className="text-[11px] font-mono tracking-[0.2em] text-zinc-400 uppercase">
           {orgName} [SYSTEM_MATRIX_ACTIVE]
        </h1>
      </div>

      {/* Inventory Alerts (Full Width Strip) */}
      <div className="bg-zinc-950">
        <InventoryAlerts indicators={indicators} />
      </div>

      {/* Top KPIs Row & Chart Array */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-px bg-white/10">
        {/* Left Col: KPI Strip */}
        <div className="lg:col-span-1 grid grid-cols-1 gap-px bg-white/10">
          {[
            { label: "Total Items", value: stats.totalItems },
            { label: "Total Movements", value: stats.totalMovements },
            { label: "Active Locations", value: stats.totalLocations },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-zinc-950 p-6 flex flex-col justify-center hover:bg-zinc-900/80 transition-colors"
            >
              <p className="text-[10px] font-mono text-zinc-500 tracking-[0.2em] uppercase mb-2">
                {stat.label}
              </p>
              <p className="text-3xl font-mono tracking-tight text-white">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Right Col: Volume Chart */}
        <div className="lg:col-span-3 bg-zinc-950 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-mono text-zinc-500 tracking-[0.2em] uppercase">
              Inventory Volume Matrix
            </h2>
          </div>
          <InventoryFlowChart data={volumeData} />
        </div>
      </div>

      {/* Lower Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-white/10">
        {/* Left Col: Recent Activity */}
        <div className="lg:col-span-2 flex flex-col bg-zinc-950 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 bg-zinc-900/20 flex items-center justify-between">
            <h2 className="text-[10px] font-mono tracking-[0.2em] uppercase text-zinc-300">
              Recent Activity
            </h2>
          </div>
          <div className="flex-1 overflow-auto">
            {recentActivity.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500 flex flex-col items-center justify-center h-full min-h-[200px]">
                No recent movements found.
              </div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-zinc-900/50 text-zinc-500 border-b border-white/10">
                  <tr className="text-[10px] font-mono uppercase tracking-widest leading-none">
                    <th className="px-5 py-4 font-bold">Type</th>
                    <th className="px-5 py-4 font-bold">Item</th>
                    <th className="px-5 py-4 font-bold text-right">Qty</th>
                    <th className="px-5 py-4 font-bold text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-zinc-300">
                  {recentActivity.map((movement: RecentMovement) => (
                    <tr
                      key={movement.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-2">
                          {movement.type === "RECEIVE" && (
                            <span className="w-1.5 h-1.5 rounded-none bg-emerald-500" />
                          )}
                          {movement.type === "ISSUE" && (
                            <span className="w-1.5 h-1.5 rounded-none bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                          )}
                          {movement.type === "ADJUSTMENT" && (
                            <span className="w-1.5 h-1.5 rounded-none bg-amber-500" />
                          )}
                          <span className="text-xs font-medium tracking-wide text-zinc-400 group-hover:text-zinc-200 transition-colors">
                            {movement.type}
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col">
                          <span className="text-white text-sm">
                            {movement.item.name}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {movement.location.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-sm">
                        <span
                          className={
                            movement.type === "RECEIVE"
                              ? "text-emerald-400"
                              : movement.type === "ISSUE"
                                ? "text-rose-400"
                                : "text-amber-400"
                          }
                        >
                          {movement.type === "RECEIVE"
                            ? "+"
                            : movement.type === "ISSUE"
                              ? "-"
                              : ""}
                          {formatQuantity(movement.quantity)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-500 text-xs tabular-nums">
                        {dateFormatter.format(movement.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Col */}
        <div className="flex flex-col gap-px bg-white/10">
          {/* Needs Attention */}
          <div className="flex flex-col bg-zinc-950 overflow-visible">
            <div className="px-5 py-4 border-b border-white/10 bg-zinc-900/20">
              <h2 className="text-[10px] font-mono tracking-[0.2em] uppercase text-zinc-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-none bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>
                Needs Attention
              </h2>
            </div>
            <div className="p-0">
              {lowStock.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center h-full min-h-[150px]">
                  <p className="text-sm text-emerald-400 font-medium mb-1 flex items-center gap-2 justify-center">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="square"
                        strokeLinejoin="miter"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Stock levels healthy
                  </p>
                  <p className="text-xs text-zinc-500 mt-2">
                    No items below threshold.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {lowStock.map((stock: LowStockItem) => (
                    <li
                      key={stock.id}
                      className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm text-white font-medium">
                          {stock.item.name}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {stock.location.name}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-mono text-rose-400 font-medium">
                          {formatQuantity(stock.quantity)}
                        </span>
                        <span className="text-xs text-zinc-500">
                          Min: {formatQuantity(stock.item.lowStockThreshold)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col bg-zinc-950 overflow-visible">
            <div className="px-5 py-4 border-b border-white/10 bg-zinc-900/20">
              <h2 className="text-[10px] font-mono tracking-[0.2em] uppercase text-zinc-300">
                Quick Commands
              </h2>
            </div>
              <Link
                href={`/${orgId}/movements`}
                className="flex-1 inline-flex items-center justify-center px-4 py-3 text-[11px] uppercase tracking-[0.2em] font-mono font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-none transition-all shadow-[0_5px_20px_rgba(99,102,241,0.25)] border border-indigo-400/20"
              >
                Record Move
              </Link>
              <Link
                href={`/${orgId}/items`}
                className="flex-1 inline-flex items-center justify-center px-4 py-3 text-[11px] uppercase tracking-[0.2em] font-mono font-bold text-zinc-300 bg-zinc-900 hover:bg-zinc-850 border border-white/10 rounded-none transition-all"
              >
                Add Item
              </Link>
            </div>
          </div>
        </div>
      </div>
  )
}
