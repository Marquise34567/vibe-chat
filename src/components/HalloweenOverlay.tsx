import { useMemo } from "react";
import { isHalloweenSeason, HALLOWEEN } from "@/lib/halloween";

/**
 * HalloweenOverlay — non-interactive spooky ambiance layer.
 * Floating pumpkins, drifting ghosts, flying bats, a glowing moon and
 * corner cobwebs. Renders nothing outside spooky season.
 *
 * Place inside a `position: relative` container — it's absolutely inset-0,
 * pointer-events: none, and sits above backgrounds but below content (zIndex prop).
 */

type Particle = {
  emoji: string;
  left: number;   // vw %
  size: number;   // px
  delay: number;  // s
  dur: number;    // s
  drift: number;  // px horizontal sway
  kind: "float" | "bat" | "ghost";
};

const EMOJIS = {
  float: ["🎃", "🍬", "🕷️", "🍭", "👻"],
  ghost: ["👻", "🎃"],
  bat: ["🦇", "🦇"],
};

// Deterministic-ish pseudo random so the layout is stable per mount
const rand = (seed: number) => {
  const x = Math.sin(seed * 9999.7) * 43758.5453;
  return x - Math.floor(x);
};

export const HalloweenOverlay = ({
  density = 14,
  zIndex = 1,
  dimmed = false,
}: {
  density?: number;
  zIndex?: number;
  dimmed?: boolean;
}) => {
  const enabled = isHalloweenSeason();

  const particles = useMemo<Particle[]>(() => {
    if (!enabled) return [];
    const out: Particle[] = [];
    for (let i = 0; i < density; i++) {
      const r = rand(i + 1);
      const kind: Particle["kind"] =
        i % 5 === 3 ? "bat" : i % 4 === 1 ? "ghost" : "float";
      const set = EMOJIS[kind];
      out.push({
        kind,
        emoji: set[Math.floor(r * set.length) % set.length],
        left: 3 + rand(i + 11) * 94,
        size: kind === "bat" ? 18 + rand(i + 3) * 14 : 16 + rand(i + 7) * 20,
        delay: -rand(i + 5) * 24,
        dur: kind === "bat" ? 9 + rand(i + 9) * 8 : 14 + rand(i + 13) * 16,
        drift: 20 + rand(i + 17) * 60,
      });
    }
    return out;
  }, [density, enabled]);

  if (!enabled) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex,
        pointerEvents: "none",
        overflow: "hidden",
        opacity: dimmed ? 0.55 : 1,
      }}
    >
      {/* Moon — top-left glowing disc */}
      <div
        style={{
          position: "absolute",
          top: "6%",
          left: "8%",
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: `radial-gradient(circle at 38% 38%, #FFF7DC 0%, #FFE9A8 45%, ${HALLOWEEN.pumpkin}55 100%)`,
          boxShadow: `0 0 60px 18px ${HALLOWEEN.pumpkin}33, 0 0 24px 6px rgba(255,247,220,0.25)`,
          opacity: 0.85,
          animation: "ff-moon-glow 6s ease-in-out infinite",
        }}
      />

      {/* Corner cobwebs (pure CSS) */}
      <div className="ff-web ff-web-tl" />
      <div className="ff-web ff-web-tr" />

      {/* Floating / drifting particles */}
      {particles.map((p, i) => {
        if (p.kind === "bat") {
          return (
            <span
              key={i}
              className="ff-bat"
              style={{
                left: `${p.left}%`,
                top: `${8 + rand(i + 23) * 30}%`,
                fontSize: p.size,
                animationDuration: `${p.dur}s`,
                animationDelay: `${p.delay}s`,
                ["--drift" as string]: `${p.drift}px`,
              }}
            >
              {p.emoji}
            </span>
          );
        }
        if (p.kind === "ghost") {
          return (
            <span
              key={i}
              className="ff-ghost"
              style={{
                left: `${p.left}%`,
                top: `${55 + rand(i + 29) * 35}%`,
                fontSize: p.size,
                animationDuration: `${p.dur}s`,
                animationDelay: `${p.delay}s`,
                ["--drift" as string]: `${p.drift}px`,
              }}
            >
              {p.emoji}
            </span>
          );
        }
        return (
          <span
            key={i}
            className="ff-rise"
            style={{
              left: `${p.left}%`,
              fontSize: p.size,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
              ["--drift" as string]: `${p.drift}px`,
            }}
          >
            {p.emoji}
          </span>
        );
      })}

      {/* Ground fog */}
      <div
        style={{
          position: "absolute",
          bottom: -40,
          left: "-10%",
          right: "-10%",
          height: 160,
          background: `radial-gradient(ellipse at 50% 100%, ${HALLOWEEN.purple}2e 0%, transparent 70%)`,
          filter: "blur(10px)",
          animation: "ff-fog 9s ease-in-out infinite",
        }}
      />
    </div>
  );
};

/** Small 🎃 badge chip for headers */
export const FrightBadge = () => {
  if (!isHalloweenSeason()) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "#FFD9A8",
        background: `linear-gradient(135deg, ${HALLOWEEN.pumpkin}33, ${HALLOWEEN.purple}44)`,
        border: `1px solid ${HALLOWEEN.pumpkin}55`,
        textShadow: "0 1px 6px rgba(0,0,0,0.6)",
      }}
    >
      🎃 Fright Fest
    </span>
  );
};
