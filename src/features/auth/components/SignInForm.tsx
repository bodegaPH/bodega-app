"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const inviteToken = searchParams.get("inviteToken") || (() => {
    const queryIndex = callbackUrl.indexOf("?");
    if (queryIndex === -1) return null;
    const query = callbackUrl.slice(queryIndex + 1);
    return new URLSearchParams(query).get("token");
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email or password. Please check your credentials and try again.");
      } else {
        if (inviteToken) {
          const acceptRes = await fetch("/api/invite/accept", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: inviteToken }),
          });

          if (acceptRes.ok) {
            const accepted = await acceptRes.json();
            try {
              await fetch("/api/organizations/select", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orgId: accepted.orgId }),
              });
            } catch {
              // best effort; redirect still works without this
            }
            router.push(`/${accepted.orgId}/dashboard?inviteAccepted=1`);
            return;
          }
        }

        router.push(res?.url || "/");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to sign in. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative border border-white/10 p-8 sm:p-10 bg-zinc-950/80 w-full shadow-2xl backdrop-blur-sm">
      <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/40" />
      <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/40" />
      <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/40" />
      <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/40" />

      <div className="mb-10">
        <span className="text-[10px] uppercase tracking-[0.2em] text-indigo-500 font-mono block mb-3">
          {"// SECURE UPLINK"}
        </span>
        <h2 className="text-3xl font-sans font-bold text-white uppercase tracking-tight leading-[1.05] mb-2">
          Sign In
        </h2>
        <p className="text-sm font-mono text-zinc-400 leading-relaxed">
          Enter your credentials to access your dashboard.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-200 text-sm font-mono flex items-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <span className="font-bold mr-2">[ERROR]</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">
            Email address
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-500 transition-colors duration-300">
              <Mail className="h-4 w-4" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full pl-10 pr-4 py-2.5 bg-zinc-900/40 border border-white/10 rounded-none text-sm text-white placeholder-zinc-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-zinc-900 transition-all duration-300 hover:border-white/20"
              placeholder="operator@company.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-zinc-300">
              Password
            </label>
            <Link href="#" className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors duration-300 hover:underline underline-offset-4">
              Forgot password?
            </Link>
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-500 transition-colors duration-300">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="block w-full pl-10 pr-4 py-2.5 bg-zinc-900/40 border border-white/10 rounded-none text-sm text-white placeholder-zinc-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-zinc-900 transition-all duration-300 hover:border-white/20"
              placeholder="••••••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-transparent rounded-none font-mono text-sm uppercase tracking-tight font-bold text-zinc-950 bg-indigo-500 hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-zinc-950 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 mt-6 shadow-[0_0_30px_-5px_rgba(99,102,241,0.5)]"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              LOG IN
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-zinc-950/80 text-zinc-500 font-medium tracking-wide uppercase">
              Or continue with
            </span>
          </div>
        </div>

        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="mt-6 w-full flex justify-center items-center py-4 px-4 border border-zinc-800 rounded-none bg-zinc-950/50 hover:bg-zinc-900 hover:border-white/10 font-mono text-sm uppercase font-bold text-zinc-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-600 focus:ring-offset-zinc-950 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link
            href={inviteToken ? `/auth/signup?inviteToken=${encodeURIComponent(inviteToken)}&callbackUrl=${encodeURIComponent(callbackUrl)}` : "/auth/signup"}
            className="font-medium text-indigo-400 hover:text-indigo-300 hover:underline transition-colors duration-300 underline-offset-4"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
