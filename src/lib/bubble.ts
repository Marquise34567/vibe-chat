/**
 * Bubble — shared light "bubbly" design tokens for the main app screens
 * (lobby, matching, chat room). Soft lavender canvas, white pill chips,
 * ink text, violet gradient CTAs, chunky rounded cards.
 */
export const BUBBLE = {
  ink: "#1B1A33",
  sub: "rgba(27,26,51,0.62)",
  faint: "rgba(27,26,51,0.42)",
  border: "rgba(27,26,51,0.09)",
  card: "#FFFFFF",
  violet: "#6362F2",
  violetSoft: "rgba(99,98,242,0.10)",
  pink: "#FF4D8D",
  green: "#22c55e",
  grad: "linear-gradient(180deg, #7B78FF 0%, #625FF3 100%)",
  shadow: "0 1px 2px rgba(27,26,51,0.05), 0 8px 22px rgba(99,98,242,0.11)",
  cardShadow: "0 20px 48px rgba(99,98,242,0.16), 0 4px 12px rgba(27,26,51,0.07), inset 0 1px 0 rgba(255,255,255,0.9)",
  scrim: "rgba(27,26,51,0.38)",
  bg: [
    "radial-gradient(55% 42% at 50% -5%, rgba(139,92,246,0.24), transparent 70%)",
    "radial-gradient(38% 32% at 92% 14%, rgba(255,77,141,0.12), transparent 70%)",
    "radial-gradient(38% 32% at 4% 22%, rgba(99,102,241,0.14), transparent 70%)",
    "linear-gradient(180deg, #F6F4FF 0%, #EFEBFF 55%, #F8F6FF 100%)",
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
  boxShadow: "inset 0 -2px 0 rgba(27,26,51,0.05), 0 2px 8px rgba(27,26,51,0.06)",
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
  boxShadow: "inset 0 -2px 0 rgba(27,26,51,0.06), 0 2px 8px rgba(27,26,51,0.07)",
  transition: "transform 0.22s cubic-bezier(0.34,1.4,0.5,1), box-shadow 0.22s ease",
};

/** Indigo primary pill CTA — solid sheen + bottom edge + drop shadow (ref style). */
export const ctaStyle: React.CSSProperties = {
  borderRadius: 999,
  background: BUBBLE.grad,
  color: "#fff",
  fontWeight: 800,
  border: "none",
  cursor: "pointer",
  boxShadow:
    "inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -2.5px 0 rgba(30,27,75,0.16), 0 8px 22px rgba(98,95,243,0.38)",
};

/** White secondary pill button — solid white, hairline border, bottom edge. */
export const ghostPillStyle: React.CSSProperties = {
  borderRadius: 999,
  background: BUBBLE.card,
  color: BUBBLE.ink,
  fontWeight: 800,
  border: `1px solid ${BUBBLE.border}`,
  cursor: "pointer",
  boxShadow: "inset 0 -2px 0 rgba(27,26,51,0.06), 0 2px 8px rgba(27,26,51,0.07)",
};
