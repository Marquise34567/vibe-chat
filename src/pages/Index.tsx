import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { LivePreview } from "@/components/LivePreview";
import { Countries } from "@/components/Countries";
import { SignupCard } from "@/components/SignupCard";
import { Plans } from "@/components/Plans";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Marquee />
      <LivePreview />
      <Countries />
      <SignupCard />
      <Plans />
      <Footer />
    </main>
  );
};

export default Index;
