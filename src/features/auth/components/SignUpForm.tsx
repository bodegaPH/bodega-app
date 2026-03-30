"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle string errors or extract message from error objects
        const errorMessage = typeof data.error === 'string' 
          ? data.error 
          : data.error?.message || "Unable to create account. Please try again.";
        throw new Error(errorMessage);
      }

      router.push("/auth/signin?registered=true");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold text-white tracking-tight mb-2">
          Create an account
        </h2>
        <p className="text-sm font-medium text-zinc-400">
          Get started with Bodega to manage your inventory
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-200 rounded-lg text-sm flex items-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <span className="font-semibold mr-2">Error:</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">
            Full Name
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-blue-500 transition-colors duration-300">
              <User className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="block w-full pl-10 pr-4 py-2.5 bg-zinc-900/40 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:bg-zinc-900 transition-all duration-300 hover:border-white/20"
              placeholder="John Doe"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">
            Email address
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-blue-500 transition-colors duration-300">
              <Mail className="h-4 w-4" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full pl-10 pr-4 py-2.5 bg-zinc-900/40 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:bg-zinc-900 transition-all duration-300 hover:border-white/20"
              placeholder="operator@company.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">
            Password
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-blue-500 transition-colors duration-300">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={12}
              maxLength={72}
              className="block w-full pl-10 pr-4 py-2.5 bg-zinc-900/40 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:bg-zinc-900 transition-all duration-300 hover:border-white/20"
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
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-zinc-950 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 mt-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_25px_rgba(37,99,235,0.4)]"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Create Account
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
            href="/auth/signin"
            className="font-medium text-blue-400 hover:text-blue-300 hover:underline transition-colors duration-300 underline-offset-4"
          >
            Sign in instead
          </Link>
        </div>
      </div>
    </div>
  );
}
