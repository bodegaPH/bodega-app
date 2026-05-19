"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { createOrg } from "@/features/organizations/actions/org";

export default function CreateOrgPage() {
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const { data: session, update } = useSession();
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setError(null);
    setIsSubmitting(true);
    setLoadingStep(0);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < 3) return prev + 1;
        return prev;
      });
    }, 700);

    try {
      const result = await createOrg(formData);
      
      clearInterval(stepInterval);
      
      if (!result.success) {
        setError(result.error);
        setIsSubmitting(false);
        setLoadingStep(0);
        return;
      }

      // Update session with new activeOrgId
      await update({
        activeOrgId: result.orgId,
      });

      // Redirect through root so org-scoped routing resolves correctly
      router.push("/");
    } catch (e) {
      clearInterval(stepInterval);
      setError("An unexpected system error occurred during initialization.");
      setIsSubmitting(false);
      setLoadingStep(0);
    }
  }

  const generatedSlug = orgName.trim().length > 0 
    ? `${orgName.trim().replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase()}-${Math.abs(orgName.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)).toString(16).substring(0, 4).toUpperCase()}`
    : "PENDING...";

  const logs = [
    `> SECURE_CHANNEL: OK (AES_256)`,
    `> AUTH_USER: ${session?.user?.email || "CONNECTING..."}`,
    orgName.trim() 
      ? `> SYSTEM_DESIGNATION: "${orgName.toUpperCase()}"`
      : `> AWAITING METADATA STRINGS...`,
    orgName.trim()
      ? `> TARGET_COMPILED_SLUG: org.${orgName.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}`
      : `> SYS_STATUS: PENDING_INPUT`,
  ];

  if (isSubmitting) {
    if (loadingStep >= 0) logs.push(`> [ALLOCATING] Initializing workspace metadata...`);
    if (loadingStep >= 1) logs.push(`> [PROVISIONING] Cluster endpoint mapping active...`);
    if (loadingStep >= 2) logs.push(`> [SECURING] Binding admin privileges to profile...`);
    if (loadingStep >= 3) logs.push(`> [FINALIZING] Launching dashboard interface...`);
  }

  // Get current button text based on submission state
  const getButtonText = () => {
    if (!isSubmitting) return "Initialize Workspace";
    if (loadingStep === 0) return "[INITIALIZING...]";
    if (loadingStep === 1) return "[ALLOCATING CLUSTER...]";
    if (loadingStep === 2) return "[SECURING WORKSPACE...]";
    return "[COMPLETING SETUP...]";
  };

  return (
    <div className="w-full max-w-[500px] relative mx-auto my-6 px-4">
      {/* Decorative Outer Terminal Brackets */}
      <span className="absolute -top-3 -left-1 w-4 h-4 border-t-2 border-l-2 border-indigo-500/30 hidden sm:block" />
      <span className="absolute -top-3 -right-1 w-4 h-4 border-t-2 border-r-2 border-indigo-500/30 hidden sm:block" />
      <span className="absolute -bottom-3 -left-1 w-4 h-4 border-b-2 border-l-2 border-indigo-500/30 hidden sm:block" />
      <span className="absolute -bottom-3 -right-1 w-4 h-4 border-b-2 border-r-2 border-indigo-500/30 hidden sm:block" />

      {/* Main Console Box */}
      <div className="relative bg-zinc-950/80 border border-zinc-800 p-8 sm:p-10 backdrop-blur-md">
        
        {/* Terminal Header Tabs / Window Controls */}
        <div className="absolute top-0 left-6 -translate-y-1/2 flex items-center gap-1 bg-black border border-zinc-800 px-3 py-1 font-mono text-[9px] uppercase tracking-widest text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          <span>PROVISION_ENV.SH</span>
        </div>

        <div className="absolute top-4 right-4 flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-zinc-800 border border-zinc-700/50" />
          <span className="w-2 h-2 rounded-full bg-zinc-800 border border-zinc-700/50" />
          <span className="w-2 h-2 rounded-full bg-zinc-800 border border-zinc-700/50" />
        </div>

        <div className="mb-8 mt-2">
          <span className="text-[9px] uppercase tracking-[0.25em] text-indigo-500 font-mono block mb-2">
            {"// SUITE_SETUP_SEQUENCE"}
          </span>
          <h2 className="text-2xl font-sans font-bold text-white uppercase tracking-tight leading-none mb-2">
            Create Organization
          </h2>
          <p className="text-xs font-mono text-zinc-400 leading-relaxed">
            Name and map your central enterprise cluster sandbox.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-200 text-[10px] font-mono flex items-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <span className="font-bold mr-2 text-rose-500">[SYS_FAIL]</span> {error}
          </div>
        )}

        {/* Form */}
        <form action={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-[10px] font-mono tracking-widest text-zinc-400 uppercase mb-2">
              <span className="text-indigo-500 mr-2">[01]</span>
              Organization Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={100}
              autoComplete="organization"
              autoFocus
              placeholder="Acme Corporation"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="block w-full px-4 py-3 bg-black border border-zinc-800 rounded-none text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:bg-zinc-950/80 transition-colors duration-200 hover:border-zinc-700"
            />
          </div>

          {/* Live ID Preview */}
          <div>
            <label className="block text-[10px] font-mono tracking-widest text-zinc-400 uppercase mb-2">
              <span className="text-indigo-500 mr-2">[02]</span>
              Generated Workspace Slug
            </label>
            <div className="w-full px-4 py-3 bg-zinc-950/80 border border-zinc-800 rounded-none font-mono text-xs text-indigo-400/80 uppercase tracking-widest flex justify-between items-center select-all">
              <span>{generatedSlug}</span>
              <span className="text-[9px] text-zinc-600 font-bold uppercase select-none">SHA_256</span>
            </div>
          </div>

          {/* Dynamic Telemetry / Diagnostics Logs */}
          <div>
            <label className="block text-[10px] font-mono tracking-widest text-zinc-400 uppercase mb-2">
              <span className="text-indigo-500 mr-2">[03]</span>
              Diagnostic Telemetry Feed
            </label>
            <div className="w-full h-[120px] bg-black/60 border border-zinc-800/80 rounded-none font-mono text-[10px] p-4 text-zinc-400 overflow-y-auto space-y-1.5 scrollbar-thin select-none relative">
              {/* Soft scanline line */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/[0.01] to-transparent pointer-events-none" />
              
              {logs.map((log, index) => (
                <div 
                  key={index} 
                  className={`${
                    log.includes("[ERROR]") 
                      ? "text-rose-400" 
                      : log.includes("[ALLOCATING]") || log.includes("[PROVISIONING]") || log.includes("[SECURING]") || log.includes("[FINALIZING]")
                      ? "text-indigo-400 animate-pulse" 
                      : log.includes("SYSTEM_DESIGNATION") || log.includes("TARGET_COMPILED_SLUG")
                      ? "text-zinc-300"
                      : "text-zinc-500"
                  }`}
                >
                  {log}
                </div>
              ))}
              
              {/* Blinking prompt line if not submitting */}
              {!isSubmitting && (
                <div className="text-indigo-500/70 animate-pulse">
                  &gt;_ <span className="inline-block w-1.5 h-3 bg-indigo-500/70 align-middle" />
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || orgName.trim().length < 2}
            className="w-full flex items-center justify-center gap-2 py-3.5 border border-indigo-500 rounded-none font-mono text-xs uppercase tracking-widest font-bold text-white bg-indigo-500 hover:bg-indigo-400 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 mt-6"
          >
            {isSubmitting ? (
              <span className="animate-pulse">{getButtonText()}</span>
            ) : (
              "Initialize Workspace"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
