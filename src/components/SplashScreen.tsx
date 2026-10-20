import { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { BUBBLE } from "@/lib/bubble";

/* ============================================================
   SplashScreen — Locket-style loading screen shown on app boot.
   Cream gradient, heart mark heartbeat, wordmark, floaty
   sticker hearts, bouncing dots. Fades out after ~1.4s.
   ============================================================ */

const FLOATERS = [
  { emoji: "💛", left: "18%", top: "22%", size: 34, rot: -10, dur: 6, delay: 0.2 },
  { emoji: "🧡", left: "78%", top: "18%", size: 30, rot: 12, dur: 7, delay: 0.8 },
  { emoji: "✨", left: "12%", top: "68%", size: 26, rot: 8, dur: 6.5, delay: 1.4 },
  { emoji: "💛", left: "82%", top: "72%", size: 38, rot: -14, dur: 7.5, delay: 0.5 },
  { emoji: "📸", left: "70%", top: "84%", size: 28, rot: 6, dur: 8, delay: 1.9 },
  { emoji: "⚡", left: "24%", top: "84%", size: 26, rot: -8, dur: 7, delay: 1.1 },
];

export const SplashScreen = ({ onDone }: { onDone: () => void }) => {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1300);
    const t2 = setTimeout(onDone, 1750);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      className={leaving ? "ff-splash-out" : ""}
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: BUBBLE.bg,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Floating sticker hearts */}
      {FLOATERS.map((f, i) => (
        <span
          key={i}
          className="ff-sticker-float"
          style={{
            position: "absolute",
            left: f.left, top: f.top,
            fontSize: f.size,
            ["--rot" as string]: `${f.rot}deg`,
            ["--dur" as string]: `${f.dur}s`,
            ["--delay" as string]: `${f.delay}s`,
            filter: "drop-shadow(0 4px 10px rgba(120,72,20,0.18))",
            pointerEvents: "none",
          }}
        >
          {f.emoji}
        </span>
      ))}

      {/* Logo */}
      <div className="ff-heartbeat" style={{ marginBottom: 18 }}>
        <BrandMark size={96} />
      </div>
      <div className="ff-wordmark" style={{ fontSize: 42, letterSpacing: "-0.03em" }}>
        facefrenzy
      </div>
      <div style={{ marginTop: 8, fontSize: 15, fontWeight: 800, color: BUBBLE.sub, letterSpacing: "-0.1px" }}>
        real people. real vibes. 💛
      </div>

      {/* Loading dots */}
      <div style={{ display: "flex", gap: 7, marginTop: 34 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="ff-dot" style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </div>
    </div>
  );
};
