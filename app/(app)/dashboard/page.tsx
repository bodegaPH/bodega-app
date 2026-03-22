import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

function formatQuantity(quantity: any) {
  if (!quantity) return "0";
  return quantity.toString();
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Fetch user's org memberships to get active org
  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) {
    redirect("/onboarding/create-org");
  }

  let orgId = session.user.activeOrgId;
  let activeOrgName = "Command Center";
  
  if (!orgId || !memberships.some((m) => m.orgId === orgId)) {
    orgId = memberships[0].orgId;
  }
  
  const activeMembership = memberships.find((m) => m.orgId === orgId);
  if (activeMembership) {
    activeOrgName = activeMembership.organization.name;
  }

  // Parallel data fetching
  const [
    totalItems,
    totalMovements,
    totalLocations,
    recentActivity,
    allStock,
  ] = await Promise.all([
    prisma.item.count({ where: { orgId } }),
    prisma.movement.count({ where: { orgId } }),
    prisma.location.count({ where: { orgId } }),
    prisma.movement.findMany({
      where: { orgId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { item: true, location: true },
    }),
    prisma.currentStock.findMany({
      where: { orgId },
      include: { item: true, location: true },
    }),
  ]);

  // Filter low stock in memory
  const lowStock = allStock.filter((stock) => {
    const qty = Number(stock.quantity);
    const threshold = stock.item.lowStockThreshold ? Number(stock.item.lowStockThreshold) : 0;
    return qty <= threshold;
  });

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium text-white tracking-tight">{activeOrgName}</h1>
      </div>

      {/* Top KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Items", value: totalItems },
          { label: "Total Movements", value: totalMovements },
          { label: "Active Locations", value: totalLocations },
        ].map((stat, i) => (
          <div
            key={i}
            className="rounded-lg bg-zinc-900/50 border border-white/5 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] flex flex-col justify-between"
          >
            <p className="text-xs font-medium text-zinc-500 tracking-wider uppercase mb-3">
              {stat.label}
            </p>
            <p className="text-3xl font-mono tracking-tight text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Recent Activity */}
        <div className="lg:col-span-2 flex flex-col rounded-lg bg-zinc-900/30 border border-white/5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 bg-zinc-900/20 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-300">Recent Activity</h2>
          </div>
          <div className="flex-1 overflow-auto">
            {recentActivity.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500 flex flex-col items-center justify-center h-full min-h-[200px]">
                No recent movements found.
              </div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-zinc-900/50 text-zinc-500 border-b border-white/5">
                  <tr>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Item</th>
                    <th className="px-5 py-3 font-medium text-right">Qty</th>
                    <th className="px-5 py-3 font-medium text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-zinc-300">
                  {recentActivity.map((movement) => (
                    <tr key={movement.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-2">
                          {movement.type === "RECEIVE" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          )}
                          {movement.type === "ISSUE" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                          )}
                          {movement.type === "ADJUSTMENT" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          )}
                          <span className="text-xs font-medium tracking-wide text-zinc-400 group-hover:text-zinc-200 transition-colors">
                            {movement.type}
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col">
                          <span className="text-white text-sm">{movement.item.name}</span>
                          <span className="text-xs text-zinc-500">{movement.location.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-sm">
                        <span className={movement.type === "RECEIVE" ? "text-emerald-400" : movement.type === "ISSUE" ? "text-rose-400" : "text-amber-400"}>
                          {movement.type === "RECEIVE" ? "+" : movement.type === "ISSUE" ? "-" : ""}
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
        <div className="space-y-6">
          {/* Needs Attention */}
          <div className="rounded-lg bg-zinc-900/30 border border-white/5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 bg-zinc-900/20">
              <h2 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>
                Needs Attention
              </h2>
            </div>
            <div className="p-0">
              {lowStock.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center h-full min-h-[150px]">
                  <p className="text-sm text-emerald-400 font-medium mb-1 flex items-center gap-2 justify-center">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Stock levels healthy
                  </p>
                  <p className="text-xs text-zinc-500 mt-2">
                    No items below threshold.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {lowStock.map((stock) => (
                    <li key={stock.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm text-white font-medium">{stock.item.name}</span>
                        <span className="text-xs text-zinc-500">{stock.location.name}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-mono text-rose-400 font-medium">
                          {formatQuantity(stock.quantity)}
                        </span>
                        <span className="text-xs text-zinc-500">
                          Min: {formatQuantity(stock.item.lowStockThreshold || 0)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-lg bg-zinc-900/30 border border-white/5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 bg-zinc-900/20">
              <h2 className="text-sm font-medium text-zinc-300">Quick Actions</h2>
            </div>
            <div className="p-5 flex flex-col sm:flex-row gap-3">
              <Link
                href="/inventory"
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] active:scale-[0.98]"
              >
                Record Movement
              </Link>
              <Link
                href="/items/new"
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md transition-all active:scale-[0.98]"
              >
                Add Item
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
