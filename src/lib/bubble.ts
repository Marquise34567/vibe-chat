/**
 * Bubble — shared light "bubbly" design tokens for the main app screens
 * (lobby, matching, chat room). Locket-style warm cream canvas, chunky
 * white cards, cocoa-ink text, orange heart-brand CTAs, sticker vibes.
 */
export const BUBBLE = {
  ink: "#33291C",
  sub: "rgba(72,56,32,0.62)",
  faint: "rgba(72,56,32,0.40)",
  border: "rgba(120,72,20,0.10)",
  card: "#FFFFFF",
  brand: "#FF9F0A",
  brandSoft: "rgba(255,159,10,0.10)",
  pink: "#FF4D8D",
  green: "#22c55e",
  grad: "linear-gradient(180deg, #FFB340 0%, #FF9F0A 100%)",
  shadow: "0 1px 2px rgba(120,72,20,0.05), 0 8px 22px rgba(255,159,10,0.12)",
  cardShadow: "0 20px 48px rgba(255,159,10,0.16), 0 4px 12px rgba(120,72,20,0.07), inset 0 1px 0 rgba(255,255,255,0.9)",
  scrim: "rgba(72,56,32,0.38)",
  sticker: "0 6px 18px rgba(120,72,20,0.18), 0 2px 6px rgba(120,72,20,0.10)",
  bg: [
    "radial-gradient(55% 42% at 50% -5%, rgba(255,179,64,0.38), transparent 70%)",
    "radial-gradient(38% 32% at 92% 14%, rgba(255,77,141,0.10), transparent 70%)",
    "radial-gradient(38% 32% at 4% 22%, rgba(255,159,10,0.14), transparent 70%)",
    "linear-gradient(180deg, #FFE3A0 0%, #FFF3DA 45%, #FFFBF2 100%)",
  ].join(", "),
} as const;

/** White pill chip — icon + label, influee-style. Solid, no glass. */
export const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "7px 14px",
  borderRadius: 999,
  background: BUBBLE.card,
  border: `1px solid ${BUBBLE.border}`,
  fontSize: 12,
  fontWeight: 700,
  color: BUBBLE.ink,
  boxShadow: "inset 0 -2px 0 rgba(120,72,20,0.05), 0 2px 8px rgba(120,72,20,0.06)",
  whiteSpace: "nowrap",
};

/** White circular icon button. Solid, no glass. */
export const circleBtnStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 22,
  background: BUBBLE.card,
  border: `1px solid ${BUBBLE.border}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxShadow: "inset 0 -2px 0 rgba(120,72,20,0.06), 0 2px 8px rgba(120,72,20,0.07)",
  transition: "transform 0.22s cubic-bezier(0.34,1.4,0.5,1), box-shadow 0.22s ease",
};

/** Orange primary pill CTA — solid sheen + bottom edge + drop shadow. */
export const ctaStyle: React.CSSProperties = {
  borderRadius: 999,
  background: BUBBLE.grad,
  color: "#fff",
  fontWeight: 800,
  border: "none",
  cursor: "pointer",
  boxShadow:
    "inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -2.5px 0 rgba(140,80,10,0.20), 0 8px 22px rgba(255,159,10,0.42)",
};

/** White secondary pill button — solid white, hairline border, bottom edge. */
export const ghostPillStyle: React.CSSProperties = {
  borderRadius: 999,
  background: BUBBLE.card,
  color: BUBBLE.ink,
  fontWeight: 800,
  border: `1px solid ${BUBBLE.border}`,
  cursor: "pointer",
  boxShadow: "inset 0 -2px 0 rgba(120,72,20,0.06), 0 2px 8px rgba(120,72,20,0.07)",
};
