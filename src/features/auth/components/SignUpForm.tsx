"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, User, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
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
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, inviteToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle string errors or extract message from error objects
        const errorMessage =
          typeof data.error === "string"
            ? data.error
            : data.error?.message ||
              "Unable to create account. Please try again.";
        throw new Error(errorMessage);
      }

      if (inviteToken) {
        const signInRes = await signIn("credentials", {
          email,
          password,
          callbackUrl,
          redirect: false,
        });

        if (!signInRes?.error) {
          const acceptRes = await fetch("/api/invite/accept", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: inviteToken }),
          });

          if (!acceptRes.ok) {
            let message = "Unable to accept invitation. Please sign in and try again.";
            try {
              const acceptData = await acceptRes.json();
              if (typeof acceptData?.error === "string") {
                message = acceptData.error;
              } else if (typeof acceptData?.error?.message === "string") {
                message = acceptData.error.message;
              }
            } catch {
              // fallback message
            }
            throw new Error(message);
          }

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

      router.push("/auth/signin?registered=true");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative border border-white/10 p-8 sm:p-10 bg-zinc-950 w-full">
      <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/40" />
      <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/40" />
      <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/40" />
      <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/40" />

      <div className="mb-10">
        <span className="text-[10px] uppercase tracking-[0.2em] text-indigo-500 font-mono block mb-3">
          {"// NEW OPERATOR INITIALIZATION"}
        </span>
        <h2 className="text-3xl font-sans font-bold text-white uppercase tracking-tight leading-[1.05] mb-2">
          Create Account
        </h2>
        <p className="text-sm font-mono text-zinc-400 leading-relaxed">
          Get started with Bodega to manage your inventory.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs font-mono flex items-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <span className="font-bold mr-2">[ERROR]</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">
            Full Name
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-500 transition-colors duration-300">
              <User className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="block w-full pl-10 pr-4 py-2.5 bg-black border border-white/10 rounded-none text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:bg-zinc-950 transition-colors duration-200 hover:border-white/20"
              placeholder="John Doe"
            />
          </div>
        </div>

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
              className="block w-full pl-10 pr-4 py-2.5 bg-black border border-white/10 rounded-none text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:bg-zinc-950 transition-colors duration-200 hover:border-white/20"
              placeholder="operator@company.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">
            Password
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-500 transition-colors duration-300">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={12}
              maxLength={72}
              className="block w-full pl-10 pr-4 py-2.5 bg-black border border-white/10 rounded-none text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:bg-zinc-950 transition-colors duration-200 hover:border-white/20"
              placeholder="••••••••••••"
            />
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Must be at least 12 characters long
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-indigo-500 rounded-none font-mono text-sm uppercase tracking-widest font-bold text-white bg-indigo-500 hover:bg-indigo-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 mt-6"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              CREATE ACCOUNT
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
            <span className="px-3 bg-zinc-950 text-zinc-500 font-medium tracking-wide uppercase">
              Already have an account?
            </span>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href={inviteToken ? `/auth/signin?inviteToken=${encodeURIComponent(inviteToken)}&callbackUrl=${encodeURIComponent(callbackUrl)}` : "/auth/signin"}
            className="font-medium text-indigo-400 hover:text-indigo-300 hover:underline transition-colors duration-300 underline-offset-4"
          >
            Sign in instead
          </Link>
        </div>
      </div>
    </div>
  );
}
