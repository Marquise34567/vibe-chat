import { useNavigate } from "react-router-dom";
import { Home, Clock, MessageCircle, Heart, Crown, Camera, Play } from "lucide-react";

/**
 * Welcome screen (Screen A) — Monkey.app layout replica with Liquid Glass.
 * Purple mesh background, floating cookie particles, glass chrome.
 * Content layer: title, subtitle, particles. Control layer: glass.
 */
const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-welcome min-h-screen-safe flex flex-col relative overflow-hidden">
      {/* Cookie particles — background content, behind glass */}
      <div className="cookie-particle cookie-float-1" style={{ top: "18%", left: "12%", fontSize: 28, opacity: 0.45, filter: "blur(0.5px)" }}>🍪</div>
      <div className="cookie-particle cookie-float-2" style={{ top: "28%", right: "15%", fontSize: 22, opacity: 0.40, filter: "blur(1px)" }}>🍪</div>
      <div className="cookie-particle cookie-float-3" style={{ top: "55%", left: "20%", fontSize: 18, opacity: 0.35, filter: "blur(1.5px)" }}>🍪</div>
      <div className="cookie-particle cookie-float-4" style={{ top: "62%", right: "18%", fontSize: 16, opacity: 0.50, filter: "blur(0.5px)" }}>🍪</div>

      {/* Top row: Sign In (leading) */}
      <div className="pt-safe px-5 pt-3 flex items-center justify-between animate-rise-in">
        <button className="glass-signin" onClick={() => navigate("/app/profile")}>
          Sign In
        </button>
      </div>

      {/* Icon glass bar (center) + crown (trailing) */}
      <div className="px-5 pt-3 flex items-center justify-center gap-3 animate-rise-in" style={{ animationDelay: "0.05s" }}>
        <div className="glass-nav-bar">
          <button className="glass-nav-btn selected" aria-label="Home" onClick={() => navigate("/")}>
            <Home className="w-[18px] h-[18px]" strokeWidth={2.5} />
          </button>
          <button className="glass-nav-btn" aria-label="Recent" onClick={() => navigate("/app/chats")}>
            <Clock className="w-[18px] h-[18px]" strokeWidth={2.5} />
          </button>
          <button className="glass-nav-btn" aria-label="Chats" onClick={() => navigate("/app/chats")}>
            <MessageCircle className="w-[18px] h-[18px]" strokeWidth={2.5} />
          </button>
          <button className="glass-nav-btn" aria-label="Favorites" onClick={() => navigate("/app/cards")}>
            <Heart className="w-[18px] h-[18px]" strokeWidth={2.5} />
          </button>
        </div>
        <button className="glass-icon-circle" aria-label="Premium" onClick={() => navigate("/plus")}>
          <Crown className="w-[18px] h-[18px]" strokeWidth={2.5} />
        </button>
      </div>

      {/* Title block — content layer, no glass, optically centered */}
      <div className="flex-1 flex flex-col items-center justify-center -translate-y-6 px-5">
        <h1
          className="text-white font-bold text-center animate-rise-in"
          style={{ fontSize: "48px", letterSpacing: "-0.6px", lineHeight: 1.05, animationDelay: "0.1s" }}
        >
          FaceFrenzy
        </h1>
        <p
          className="text-center mt-2 animate-rise-in"
          style={{ fontSize: "17px", color: "var(--label-secondary)", animationDelay: "0.15s" }}
        >
          Make new friends face-to-face
        </p>
      </div>

      {/* Bottom: CTA + camera button */}
      <div className="pb-safe px-5 pb-6 flex flex-col items-center gap-4 animate-rise-in" style={{ animationDelay: "0.2s" }}>
        <button className="cta-yellow" onClick={() => navigate("/app")}>
          <span className="w-7 h-7 rounded-full bg-black/15 flex items-center justify-center">
            <Play className="w-3.5 h-3.5" strokeWidth={3} />
          </span>
          Continue
        </button>

        {/* Camera button — bottom-left */}
        <div className="w-full flex justify-start">
          <button className="glass-icon-circle" style={{ width: 48, height: 48, borderRadius: 24 }} aria-label="Camera" onClick={() => navigate("/app")}>
            <Camera className="w-[18px] h-[18px]" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
