import { Sparkles } from "lucide-react";

export const Navbar = () => {
  return (
    <nav className="sticky top-4 z-50 mx-4 md:mx-8">
      <div className="glass brutal rounded-2xl flex items-center justify-between px-4 md:px-6 py-3">
        <a href="#" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-primary border-2 border-foreground brutal-sm flex items-center justify-center group-hover:rotate-12 transition-transform">
            <Sparkles className="w-5 h-5 text-primary-foreground" strokeWidth={3} />
          </div>
          <span className="font-display font-bold text-xl md:text-2xl">VIBEZ</span>
        </a>
        <div className="hidden md:flex items-center gap-6 font-display font-semibold">
          <a href="#how" className="hover:text-primary transition-colors">How it works</a>
          <a href="#plans" className="hover:text-primary transition-colors">Plans</a>
          <a href="#countries" className="hover:text-primary transition-colors">Countries</a>
        </div>
        <div className="flex items-center gap-2">
          <button className="hidden sm:inline-flex font-display font-bold text-sm px-3 py-2 hover:underline underline-offset-4">Log in</button>
          <button className="brutal-hover bg-foreground text-background border-2 border-foreground rounded-xl px-4 py-2 font-display font-bold text-sm">
            Sign up free
          </button>
        </div>
      </div>
    </nav>
  );
};
