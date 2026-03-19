// Code-First Design V4: "The Cinematic Prism Redefined"
// Enhanced layout, strong visual anchor, improved data visualization

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
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 relative overflow-hidden p-4 sm:p-8">
      {/* 1. Cinematic Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
         {/* Deep Aurora Gradients */}
         <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-blue-900/10 blur-[150px] animate-pulse" style={{ animationDuration: '8s' }} />
         <div className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] rounded-full bg-indigo-900/10 blur-[150px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
         
         {/* Noise Texture Overlay */}
         <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
         
         {/* Grid overlay for depth */}
         <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTU5LjUgMGguNXY2MEg2MFptLTYwIDYwaDYwdi0uNUgwbHAtLjVaIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] opacity-20"></div>
         <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent"></div>
      </div>

      {/* 2. Brand Logo (Top Left) */}
      <div className="absolute top-8 left-8 sm:top-10 sm:left-10 z-50 flex items-center gap-3">
        {/* Custom Abstract Logo */}
        <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)] ring-1 ring-white/10 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-blue-500/10 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute inset-0 bg-zinc-400/10 rounded-2xl blur-md" />
          <svg 
            className="w-6 h-6 text-zinc-100 relative z-10 drop-shadow-md" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" />
            <path d="M12 12L12 21" />
            <path d="M12 12L20 7.5" />
            <path d="M12 12L4 7.5" />
          </svg>
        </div>
        
        <span className="text-2xl font-semibold tracking-tight text-white/90 drop-shadow-sm font-sans">
          Bodega
        </span>
      </div>

      {/* 3. The Prism: Floating Glass Artifact */}
      <div className="relative z-10 w-full max-w-6xl h-auto lg:h-[760px] grid lg:grid-cols-[1.1fr_0.9fr] rounded-[2.5rem] bg-zinc-900/40 backdrop-blur-3xl border border-white/5 shadow-2xl overflow-hidden ring-1 ring-white/10">
        
        {/* Left: The Form Chamber */}
        <div className="relative flex flex-col justify-center p-8 sm:p-16 lg:p-20 xl:p-24 bg-gradient-to-br from-zinc-900/50 to-transparent">
           {/* Decorative Top Glow */}
           <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50"></div>
           
           {/* Mobile-only Branding */}
           <div className="lg:hidden mb-12 flex flex-col items-center text-center">
              <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg ring-1 ring-white/10 mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-blue-500/10 opacity-50" />
                <svg className="w-8 h-8 text-zinc-100 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" /><path d="M12 12L12 21" /><path d="M12 12L20 7.5" /><path d="M12 12L4 7.5" />
                </svg>
              </div>
             <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
               Welcome to Bodega
             </h1>
             <p className="text-zinc-400 text-sm max-w-xs mx-auto">
               Secure access to your enterprise inventory systems.
             </p>
           </div>
          
          {/* Form Injection */}
          <div className="relative z-20 w-full max-w-md mx-auto">
            {children}
          </div>
        </div>

        {/* Right: The Data Core (Visuals) */}
        <div className="relative hidden lg:flex flex-col p-16 bg-zinc-950/60 border-l border-white/5 overflow-hidden group">
          
          {/* Status Badge (Moved to visualization side) */}
          <div className="absolute top-12 right-12 inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-black/40 border border-white/5 backdrop-blur-md shadow-lg">
             <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
              </span>
             <span className="text-xs font-semibold text-zinc-300 tracking-wide uppercase">Core Online</span>
          </div>

          {/* Abstract Data Visualization - Improved scale & contrast */}
          <div className="absolute inset-0 flex items-center justify-center opacity-80 mix-blend-screen pointer-events-none">
            {/* Core Glow */}
            <div className="absolute w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]" />
            <div className="absolute w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[80px]" />
            
            <div className="relative w-[450px] h-[450px] flex items-center justify-center">
               {/* Orbital Rings */}
               <div className="absolute inset-0 border border-indigo-500/20 rounded-full animate-[spin_20s_linear_infinite]" style={{ borderStyle: 'dashed' }} />
               <div className="absolute inset-10 border border-blue-400/30 rounded-full animate-[spin_30s_linear_infinite_reverse]" style={{ borderTopColor: 'transparent', borderBottomColor: 'transparent' }} />
               <div className="absolute inset-20 border border-white/10 rounded-full animate-[spin_40s_linear_infinite]" />
               
               {/* Geometric Core */}
               <div className="relative w-40 h-40">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-blue-500/20 rounded-xl rotate-45 border border-white/10 backdrop-blur-sm shadow-[0_0_50px_rgba(59,130,246,0.2)] animate-pulse" style={{ animationDuration: '4s' }} />
                  <div className="absolute inset-4 bg-gradient-to-tr from-blue-600/30 to-purple-500/30 rounded-xl rotate-45 border border-white/20 backdrop-blur-md" />
                  
                  {/* Floating particles inside core */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                  </div>
               </div>
            </div>
          </div>
          
          {/* Content Layer - Redesigned for hierarchy */}
          <div className="relative z-10 mt-auto">
            <div className="space-y-8">
               <div className="space-y-4">
                 <div className="inline-flex items-center gap-2 text-xs font-mono text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                   <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path d="M12 8v4l3 3" /></svg>
                   System Update 2.4.1
                 </div>
                 <h3 className="text-4xl font-semibold text-white tracking-tight leading-[1.1]">
                   Command your <br/>
                   <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
                     supply chain.
                   </span>
                 </h3>
                 <p className="text-zinc-400 text-lg leading-relaxed max-w-md font-light">
                   Real-time synchronization, immutable ledgers, and absolute precision for modern enterprise retail.
                 </p>
               </div>
               
               {/* Stats Matrix */}
               <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-md hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-2 text-zinc-500 mb-2">
                      <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                      <span className="text-xs uppercase tracking-wider font-semibold">Event Latency</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-mono text-white tracking-tight">12</span>
                      <span className="text-zinc-500 font-medium">ms</span>
                    </div>
                  </div>
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-md hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-2 text-zinc-500 mb-2">
                      <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      <span className="text-xs uppercase tracking-wider font-semibold">Reliability</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-mono text-white tracking-tight">99.9</span>
                      <span className="text-zinc-500 font-medium">%</span>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
