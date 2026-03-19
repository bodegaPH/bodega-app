import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function MarketingNav() {
  const session = await getServerSession(authOptions);

  return (
    <header className="sticky top-0 z-50 w-full bg-zinc-900/60 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 border border-white/10 shadow-md ring-1 ring-white/20">
            <div className="absolute inset-0 bg-indigo-500/20 rounded-lg blur-sm" />
            <svg
              className="w-5 h-5 text-white relative z-10"
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
          <span className="text-lg font-bold tracking-tight text-white/90">
            Bodega
          </span>
        </Link>

        {/* Nav actions */}
        <nav className="flex items-center gap-3">
          {session ? (
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all active:scale-[0.98]"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-300 hover:text-white transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all active:scale-[0.98]"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
