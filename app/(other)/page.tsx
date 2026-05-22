import Hero from "@/components/hero";
import Features from "@/components/features";
import About from "@/components/about";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-hwseta-green-muted/40">
      <Hero />
      <About />
      <Features />
    </div>
  );
}
