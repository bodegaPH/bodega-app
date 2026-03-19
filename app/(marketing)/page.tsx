import Link from "next/link";
import { Package, ArrowLeftRight, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Package,
    title: "Ledger-based tracking",
    description:
      "Every stock movement is recorded permanently. Full audit trail, nothing ever lost.",
  },
  {
    icon: ArrowLeftRight,
    title: "Multi-org support",
    description:
      "Manage multiple organizations from one account. Switch context instantly.",
  },
  {
    icon: BarChart3,
    title: "Real-time stock",
    description:
      "Always know what you have, down to the unit. Derived from immutable movements.",
  },
];

const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for small teams getting started.",
    features: ["1 organization", "Up to 100 items", "Full movement history", "CSV export"],
    cta: "Get started",
    href: "/auth/signup",
    highlight: false,
  },
  {
    name: "Pro",
    price: "Coming soon",
    description: "For growing teams with advanced needs.",
    features: ["Unlimited organizations", "Unlimited items", "Priority support", "Advanced analytics"],
    cta: "Join waitlist",
    href: "/auth/signup",
    highlight: true,
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-32 lg:py-48 min-h-[calc(100vh-4rem)]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-zinc-400 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Now in MVP
        </div>

        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-white max-w-4xl leading-tight">
          Inventory management for the{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">
            modern team
          </span>
        </h1>

        <p className="mt-6 text-lg lg:text-xl text-zinc-400 max-w-2xl leading-relaxed">
          Track stock, manage movements, and keep your team in sync — all in one
          place. Built on an immutable ledger so your inventory is always
          correct.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center">
          <Link
            href="/auth/signup"
            className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-base font-semibold text-white shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all active:scale-[0.98] hover:shadow-[0_0_40px_rgba(37,99,235,0.5)]"
          >
            Get started free
          </Link>
          <Link
            href="/auth/signin"
            className="px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-base font-medium text-zinc-300 hover:text-white transition-all"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-24 max-w-7xl mx-auto w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
            Everything you need
          </h2>
          <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
            Built for operational teams who need accuracy and auditability, not
            spreadsheet complexity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="relative p-6 rounded-2xl bg-zinc-900/40 backdrop-blur-xl border border-white/5 ring-1 ring-white/10 hover:border-white/10 transition-all group"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-24 max-w-7xl mx-auto w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
            Simple pricing
          </h2>
          <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
            Start free. Upgrade when your team grows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative p-8 rounded-2xl border transition-all ${
                tier.highlight
                  ? "bg-blue-600/10 border-blue-500/30 ring-1 ring-blue-500/20"
                  : "bg-zinc-900/40 backdrop-blur-xl border-white/5 ring-1 ring-white/10"
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-blue-600 text-xs font-semibold text-white">
                    Coming soon
                  </span>
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{tier.price}</span>
                  {tier.price !== "Coming soon" && (
                    <span className="text-zinc-400 text-sm">/month</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-zinc-400">{tier.description}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                    <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={tier.href}
                className={`block w-full text-center py-3 px-4 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
                  tier.highlight
                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                    : "bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
