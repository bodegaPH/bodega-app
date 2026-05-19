import { Suspense } from "react";
import { getTopRiskSnapshots } from "@/features/simulation/server";
import RiskTable from "@/features/simulation/components/RiskTable";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

export const metadata = {
  title: "Simulation | Bodega",
};

interface SimulationPageProps {
  params: Promise<{
    orgId: string;
  }>;
}

async function RiskTableFetcher({ orgId }: { orgId: string }) {
  try {
    const snapshots = await getTopRiskSnapshots(orgId, { limit: 100 });
    return <RiskTable snapshots={snapshots} />;
  } catch (error) {
    return (
      <div className="flex flex-col items-center justify-center border border-dashed border-rose-500/30 bg-rose-950/20 px-4 py-16 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-none border border-rose-500/20 bg-rose-500/10">
          <ExclamationTriangleIcon className="h-6 w-6 text-rose-400" />
        </div>
        <h3 className="mb-2 text-sm font-mono tracking-widest uppercase text-zinc-200">Simulation Error</h3>
        <p className="max-w-sm text-[10px] font-mono tracking-wide leading-relaxed text-rose-400/80">
          Failed to fetch simulation data. Please try again later.
        </p>
      </div>
    );
  }
}

function RiskTableSkeleton() {
  return (
    <div className="bg-zinc-950 border border-white/10 p-6 sm:p-8 animate-pulse">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <div className="h-5 w-48 bg-white/10 mb-2"></div>
          <div className="h-3 w-64 bg-white/5"></div>
        </div>
      </div>
      <div className="border border-white/10 bg-black overflow-hidden">
        <div className="h-10 border-b border-white/10 bg-zinc-950"></div>
        <div className="divide-y divide-white/5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 flex items-center px-4">
              <div className="h-3 w-full bg-white/5"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function SimulationPage({ params }: SimulationPageProps) {
  const { orgId } = await params;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Suspense fallback={<RiskTableSkeleton />}>
        <RiskTableFetcher orgId={orgId} />
      </Suspense>
    </div>
  );
}
