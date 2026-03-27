// Onboarding layout - requires auth but not org membership
// Uses Cinematic Prism design, similar to auth layout

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

  // Check if user already has organizations
  const membershipCount = await prisma.membership.count({
    where: { userId: session.user.id },
  });

  // If user already has orgs, redirect to dashboard
  if (membershipCount > 0) {
    redirect("/dashboard");
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 relative z-10">
            <path
              d="M5 4h9l6 4.5-4 3.5 4 3.5-6 4.5H5z"
              strokeWidth="3.5"
              strokeLinejoin="miter"
              strokeLinecap="square"
              className="text-white"
            />
          </svg>
        </div>
        <span className="text-xl font-bold tracking-[0.1em] text-white/90 drop-shadow-sm uppercase">
          BODEGA
        </span>
      </div>

      {/* Main Content Card */}
      <div className="relative z-10 w-full max-w-md rounded-[2rem] bg-zinc-900/40 backdrop-blur-3xl border border-white/5 shadow-2xl overflow-hidden ring-1 ring-white/10 p-8 sm:p-12">
        {children}
      </div>
    </div>
  );
}
