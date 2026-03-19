import MarketingNav from "@/app/components/marketing/MarketingNav";
import Footer from "@/app/components/marketing/Footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col relative overflow-hidden">
      {/* Aurora background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-indigo-900/20 blur-[150px] animate-pulse"
          style={{ animationDuration: "8s" }}
        />
        <div
          className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] rounded-full bg-blue-900/20 blur-[150px] animate-pulse"
          style={{ animationDuration: "10s", animationDelay: "1s" }}
        />
        {/* Noise texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <MarketingNav />
      <main className="relative z-10 flex-1">{children}</main>
      <Footer />
    </div>
  );
}
