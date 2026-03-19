import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const stats = [
  { label: "Items", value: "0" },
  { label: "Movements", value: "0" },
  { label: "Organizations", value: "0" },
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="space-y-6">
      {/* Welcome card */}
      <div className="rounded-2xl bg-zinc-900/40 backdrop-blur-xl border border-white/5 ring-1 ring-white/10 p-6">
        <h2 className="text-lg font-semibold text-white">
          Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Your dashboard is ready. Inventory features are coming soon.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-2xl bg-zinc-900/40 backdrop-blur-xl border border-white/5 ring-1 ring-white/10 p-6"
          >
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              {label}
            </p>
            <p className="mt-2 text-4xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
