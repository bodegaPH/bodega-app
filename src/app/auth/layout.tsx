import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AmbientBackground } from "@/features/auth";
import { resolveCanonicalDestination } from "@/lib/redirect-helper";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

function getSafeCallbackUrl(
  callbackUrl: string | string[] | undefined,
): string | null {
  if (typeof callbackUrl !== "string") return null;
  if (!callbackUrl.startsWith("/")) return null;
  if (callbackUrl.startsWith("//")) return null;
  if (callbackUrl.startsWith("/auth")) return null;
  return callbackUrl;
}

export default async function AuthLayout({
  children,
  searchParams,
}: {
  children: React.ReactNode;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Redirect authenticated users to dashboard
  const session = await getServerSession(authOptions);
  if (session) {
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const callbackUrl = getSafeCallbackUrl(resolvedSearchParams?.callbackUrl);
    if (callbackUrl) {
      redirect(callbackUrl);
    }

    const destination = await resolveCanonicalDestination({ currentPath: "/auth/signin" });
    if (destination.routeClass !== "auth") {
      redirect(destination.destination);
    }
  }
  
  return (
    <div className="min-h-screen w-full flex bg-zinc-950 text-white selection:bg-indigo-500/30">
      {/* Back to Home CTA */}
      <Link 
        href="https://bodega-website-six.vercel.app/"
        className="absolute top-8 left-8 z-50 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white transition-colors group"
      >
        <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
        Back to Home
      </Link>

      {/* Left Column - Form Side */}
      <div className="w-full lg:w-[55%] flex flex-col justify-center items-center p-6 sm:p-12 xl:p-20 relative z-10">
        <div className="w-full max-w-[420px]">
          {children}
        </div>
      </div>

      {/* Right Column - Ambient Visual */}
      <div className="hidden lg:flex lg:w-[45%] h-screen sticky top-0 relative overflow-hidden bg-zinc-950">
        <AmbientBackground />
      </div>
    </div>
  );
}
