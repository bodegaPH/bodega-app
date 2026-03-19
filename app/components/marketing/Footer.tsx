import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-zinc-500"
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
          <span className="text-sm font-semibold text-zinc-500">Bodega</span>
        </div>

        {/* Copyright */}
        <p className="text-sm text-zinc-600">
          © 2026 Bodega. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
