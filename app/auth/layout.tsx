// Code-First Design V3: "The Cinematic Prism"
// A unified, deep-glass experience with generative data visualization.

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirect authenticated users to dashboard
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 relative overflow-hidden p-4">
      {/* 1. Cinematic Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
         {/* Deep Aurora Gradients */}
         <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-indigo-900/20 blur-[150px] animate-pulse" style={{ animationDuration: '8s' }} />
         <div className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] rounded-full bg-blue-900/20 blur-[150px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
         
         {/* Noise Texture Overlay */}
         <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
      </div>

      {/* 2. Brand Logo (Top Left) */}
      <div className="absolute top-8 left-8 z-50 flex items-center gap-3">
        {/* Custom Abstract Logo */}
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

      {/* 3. The Prism: Floating Glass Artifact */}
      <div className="relative z-10 w-full max-w-5xl h-auto lg:h-[700px] grid lg:grid-cols-2 rounded-[2.5rem] bg-zinc-900/40 backdrop-blur-3xl border border-white/5 shadow-2xl overflow-hidden ring-1 ring-white/10">
        
        {/* Left: The Form Chamber */}
        <div className="relative flex flex-col justify-center p-8 sm:p-12 lg:p-16">
           {/* Mobile-only Branding - Hidden on Desktop to prevent clutter */}
           <div className="lg:hidden mb-10 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-zinc-400 mb-6 mx-auto">
               <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
               Secure System
             </div>
             <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
               Bodega
             </h1>
           </div>

           {/* Desktop Status Badge (Absolute) */}
           <div className="hidden lg:inline-flex absolute top-8 left-8 items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-zinc-500">
               <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
               System Online
           </div>
          
          {/* Form Injection */}
          <div className="relative z-20 w-full">
            {children}
          </div>
        </div>

        {/* Right: The Data Core (Visuals) */}
        <div className="relative hidden lg:flex flex-col justify-between p-16 bg-zinc-900/30 border-l border-white/5 overflow-hidden group">
          
          {/* Abstract Data Visualization */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <div className="relative w-96 h-96">
               <div className="absolute inset-0 border border-indigo-500/30 rounded-full animate-[spin_10s_linear_infinite]" />
               <div className="absolute inset-4 border border-blue-500/30 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
               <div className="absolute inset-8 border border-violet-500/30 rounded-full animate-[spin_20s_linear_infinite]" />
               {/* Central Pulse */}
               <div className="absolute inset-0 m-auto w-32 h-32 bg-indigo-500/10 rounded-full blur-xl animate-pulse" />
            </div>
          </div>
          
          {/* Content Layer */}
          <div className="relative z-10 mt-auto">
            <div className="space-y-6">
               <div className="space-y-2">
                 <h3 className="text-2xl font-medium text-zinc-400 leading-tight">
                   Real-time <span className="text-indigo-400">intelligence</span><br />
                   for modern retail.
                 </h3>
                 <p className="text-zinc-500 max-w-sm">
                   Monitor inventory, track sales, and optimize supply chains with military-grade precision.
                 </p>
               </div>
               
               {/* Stats / Tech Elements */}
               <div className="flex gap-4 pt-4">
                  <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Latency</div>
                    <div className="text-xl font-mono text-indigo-300">12ms</div>
                  </div>
                  <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Uptime</div>
                    <div className="text-xl font-mono text-emerald-400">99.9%</div>
                  </div>
               </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
