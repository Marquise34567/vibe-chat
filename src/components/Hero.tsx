import { Video, Zap, Globe2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const Hero = () => {
  const { user } = useAuth();
  const ctaTo = user ? "/lobby" : "/auth";
  return (
    <section className="relative px-4 md:px-8 pt-16 pb-24 overflow-hidden">
      {/* Floating sticker decorations */}
      <div className="absolute top-10 right-[8%] hidden md:block animate-float-slow">
        <div className="sticker bg-secondary rotate-12">⚡ live now</div>
      </div>
      <div className="absolute top-40 left-[5%] hidden md:block animate-float-slow" style={{ animationDelay: '1.5s' }}>
        <div className="sticker bg-accent text-accent-foreground -rotate-6">🌍 195 countries</div>
      </div>
      <div className="absolute bottom-20 right-[12%] hidden lg:block animate-float-slow" style={{ animationDelay: '0.8s' }}>
        <div className="sticker bg-highlight rotate-[-8deg]">no cap 🧢</div>
      </div>

      <div className="max-w-6xl mx-auto text-center relative">
        <div className="inline-block glass brutal-sm rounded-full px-4 py-2 mb-8 animate-pop-in">
          <span className="font-display font-semibold text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            2.4M vibing right now
          </span>
        </div>

        <h1 className="font-display font-bold text-6xl sm:text-7xl md:text-8xl lg:text-9xl leading-[0.9] mb-6">
          meet the <br />
          <span className="inline-block bg-primary text-primary-foreground border-4 border-foreground brutal-lg px-4 py-1 -rotate-2 my-2">
            world
          </span>
          <br />
          <span className="text-stroke">face to face.</span>
        </h1>

        <p className="font-body text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 font-medium">
          Random video chat with real humans across the globe. Pick a country, pick a vibe, hit shuffle. No bots, no awkward silence — just main character energy.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link to={ctaTo} className="brutal-hover bg-primary text-primary-foreground border-2 border-foreground rounded-2xl px-8 py-4 font-display font-bold text-lg flex items-center gap-2 group">
            <Video className="w-5 h-5 group-hover:scale-125 transition-transform" strokeWidth={3} />
            {user ? "Open the lobby" : "Start chatting now"}
          </Link>
          <a href="#how" className="brutal-hover glass border-2 border-foreground rounded-2xl px-8 py-4 font-display font-bold text-lg flex items-center gap-2">
            <Zap className="w-5 h-5" strokeWidth={3} />
            Watch a preview
          </a>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-3xl mx-auto mt-16">
          {[
            { icon: Globe2, num: "195", label: "countries" },
            { icon: Video, num: "8M+", label: "daily chats" },
            { icon: Zap, num: "0.3s", label: "match time" },
          ].map((s, i) => (
            <div key={i} className="glass brutal rounded-2xl p-4 md:p-6 -rotate-1 even:rotate-1">
              <s.icon className="w-6 h-6 mb-2 mx-auto" strokeWidth={3} />
              <div className="font-display font-bold text-2xl md:text-4xl">{s.num}</div>
              <div className="font-body text-xs md:text-sm text-muted-foreground font-semibold uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
