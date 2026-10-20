import type { CSSProperties } from "react";

/* ============================================================
   FloatingStickers — Locket-style scattered sticker decor.
   Photos + emoji + badge stickers with white outlines, soft
   warm shadows, random-ish rotations and slow bob animations.
   Purely decorative (pointer-events: none).
   ============================================================ */

type Sticker = {
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
  size: number;        // px box
  rot: number;         // deg
  dur: number;         // s
  delay: number;       // s
  kind: "photo" | "emoji" | "badge";
  src?: string;        // photo url
  emoji?: string;
  text?: string;       // badge text
  badgeBg?: string;
  badgeColor?: string;
  mobileHide?: boolean;
  z?: number;
};

const STICKERS: Sticker[] = [
  // ── Left side ──
  { left: "6%",  top: "16%", size: 64, rot: -8, dur: 7,   delay: 0.2, kind: "photo", src: "https://i.pravatar.cc/128?img=47" },
  { left: "3%",  top: "34%", size: 56, rot: 6,  dur: 8,   delay: 1.1, kind: "emoji", emoji: "💛" },
  { left: "9%",  top: "52%", size: 88, rot: -11, dur: 9,  delay: 0.5, kind: "badge", text: "besties first", badgeBg: "#FFC62E", badgeColor: "#33291C" },
  { left: "4%",  top: "72%", size: 72, rot: 7,  dur: 7.5, delay: 1.6, kind: "photo", src: "https://i.pravatar.cc/128?img=32" },
  { left: "13%", top: "84%", size: 52, rot: -14, dur: 8.5, delay: 0.8, kind: "emoji", emoji: "📣", mobileHide: true },
  { left: "16%", top: "24%", size: 46, rot: 12, dur: 6.5, delay: 2.0, kind: "emoji", emoji: "🧡", mobileHide: true },
  // ── Right side ──
  { right: "7%",  top: "14%", size: 74, rot: 9,   dur: 7.5, delay: 0.9, kind: "badge", text: "i ♥ ff", badgeBg: "#FFB340", badgeColor: "#fff" },
  { right: "4%",  top: "32%", size: 62, rot: -7,  dur: 8,   delay: 0.3, kind: "photo", src: "https://i.pravatar.cc/128?img=45" },
  { right: "10%", top: "48%", size: 80, rot: 10,  dur: 9,   delay: 1.4, kind: "badge", text: "GOLD", badgeBg: "#33291C", badgeColor: "#FFB340" },
  { right: "5%",  top: "66%", size: 56, rot: -12, dur: 7,   delay: 0.6, kind: "emoji", emoji: "🧡" },
  { right: "12%", top: "80%", size: 68, rot: 8,   dur: 8.5, delay: 1.8, kind: "photo", src: "https://i.pravatar.cc/128?img=12" },
  { right: "16%", top: "38%", size: 44, rot: 15,  dur: 6.8, delay: 2.2, kind: "emoji", emoji: "✨", mobileHide: true },
];

export const FloatingStickers = ({ className = "" }: { className?: string }) => (
  <div
    aria-hidden
    className={className}
    style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 2 }}
  >
    {STICKERS.map((s, i) => {
      const pos: CSSProperties = {
        left: s.left,
        right: s.right,
        top: s.top,
        bottom: s.bottom,
        width: s.kind === "badge" ? "auto" : s.size,
        height: s.kind === "badge" ? "auto" : s.size,
        ["--rot" as string]: `${s.rot}deg`,
        ["--dur" as string]: `${s.dur}s`,
        ["--delay" as string]: `${s.delay}s`,
        zIndex: s.z ?? 2,
      };
      if (s.kind === "photo") {
        return (
          <div
            key={i}
            className={`ff-sticker ff-sticker-photo ff-sticker-float ${s.mobileHide ? "ff-sticker-desktop" : ""}`}
            style={pos}
          >
            <img src={s.src} alt="" loading="lazy" draggable={false} />
          </div>
        );
      }
      if (s.kind === "badge") {
        return (
          <div
            key={i}
            className={`ff-sticker ff-sticker-tag ff-sticker-float ${s.mobileHide ? "ff-sticker-desktop" : ""}`}
            style={{
              ...pos,
              padding: "8px 14px",
              background: s.badgeBg,
              color: s.badgeColor,
              fontFamily: '"Baloo 2", "Nunito", system-ui, sans-serif',
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: "-0.2px",
              textTransform: "lowercase",
              whiteSpace: "nowrap",
            }}
          >
            {s.text}
          </div>
        );
      }
      return (
        <div
          key={i}
          className={`ff-sticker ff-sticker-float ${s.mobileHide ? "ff-sticker-desktop" : ""}`}
          style={{ ...pos, fontSize: s.size * 0.62, filter: "drop-shadow(0 4px 8px rgba(120,72,20,0.18))" }}
        >
          {s.emoji}
        </div>
      );
    })}
    <style>{`@media (max-width: 767px) { .ff-sticker-desktop { display: none !important; } }`}</style>
  </div>
);
