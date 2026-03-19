// Onboarding layout - requires auth but not org membership
// Uses Cinematic Prism design, similar to auth layout

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  
  // Must be authenticated
  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 relative overflow-hidden p-4">
      {/* Cinematic Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-indigo-900/20 blur-[150px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] rounded-full bg-blue-900/20 blur-[150px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
      </div>

      {/* Brand Logo (Top Left) */}
      <div className="absolute top-8 left-8 z-50 flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 shadow-lg ring-1 ring-white/20">
          <div className="absolute inset-0 bg-indigo-500/20 rounded-xl blur-md" />
          <svg 
            className="w-6 h-6 text-white relative z-10" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" />
            <path d="M12 12L12 21" />
            <path d="M12 12L20 7.5" />
            <path d="M12 12L4 7.5" />
          </svg>
        </div>
        <span className="text-xl font-bold tracking-tight text-white/90 drop-shadow-sm font-sans">
          Bodega
        </span>
      </div>

      {/* Main Content Card */}
      <div className="relative z-10 w-full max-w-md rounded-[2rem] bg-zinc-900/40 backdrop-blur-3xl border border-white/5 shadow-2xl overflow-hidden ring-1 ring-white/10 p-8 sm:p-12">
        {children}
      </div>
    </div>
  );
}
