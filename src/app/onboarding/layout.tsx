// Onboarding layout - requires auth but not org membership
// Uses Cinematic Prism design, similar to auth layout

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isPlatformAdminRole } from "@/lib/system-role";

export const dynamic = 'force-dynamic';

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  if (isBuildPhase || process.env.SKIP_BUILD_STATIC_GENERATION) {
    return children;
  }

  const session = await getServerSession(authOptions);
  
  // Must be authenticated
  if (!session) {
    redirect("/auth/signin");
  }

  if (isPlatformAdminRole(session.user.role)) {
    redirect("/admin");
  }

  // Check if user already has organizations
  const membershipCount = await prisma.membership.count({
    where: { userId: session.user.id },
  });

  // If user already has orgs, redirect to dashboard
  if (membershipCount > 0) {
    redirect("/");
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center bg-black text-white selection:bg-indigo-500/30 relative overflow-x-hidden">
      {/* Grid Overlay Backdrop */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ 
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 1) 1px, transparent 1px)', 
          backgroundSize: '32px 32px' 
        }} 
      />
      
      {/* Central Breathing Ambient Indigo Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[8000ms]" />

      {/* Header System Bar */}
      <header className="w-full max-w-7xl px-8 py-6 flex items-center justify-between border-b border-white/[0.04] relative z-10 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center bg-zinc-950 border border-white/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 text-indigo-500">
              <path
                d="M5 4h9l6 4.5-4 3.5 4 3.5-6 4.5H5z"
                strokeWidth="3.5"
                strokeLinejoin="miter"
                strokeLinecap="square"
              />
            </svg>
          </div>
          <span className="text-xs font-bold tracking-[0.2em] text-white uppercase">
            Bodega
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-6">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
            System: Setup mode
          </span>
          <span>v2.4.0-matrix</span>
        </div>
      </header>

      {/* Main Centered Content Area */}
      <main className="flex-1 flex flex-col justify-center items-center w-full max-w-7xl px-4 py-12 relative z-10">
        {children}
      </main>

      {/* Footer System Bar */}
      <footer className="w-full max-w-7xl px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-white/[0.04] relative z-10 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
        <div>
          <span>SECURE LINK // TLS_AES_256_GCM</span>
        </div>
        <div className="flex items-center gap-6">
          <a 
            href="#" 
            className="hover:text-indigo-400 border border-transparent hover:border-indigo-500/20 px-2 py-0.5 transition-colors group flex items-center gap-1.5"
          >
            <span>[DOCUMENTATION]</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
