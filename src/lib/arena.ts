/**
 * Arena — dark "versus" design tokens for the match pipeline
 * (searching screen + connected chat room). Near-black canvas,
 * glassy dark panels, orange brand glow, esports-style energy.
 * Complements BUBBLE (cream lobby) — the app goes dark the
 * moment a match starts.
 */
export const ARENA = {
  bg: "#0B0B10",
  panel: "#14141C",
  tile: "#101017",
  card: "rgba(255,255,255,0.06)",
  cardSolid: "#191922",
  border: "rgba(255,255,255,0.10)",
  borderSoft: "rgba(255,255,255,0.06)",
  ink: "#F5F3EE",
  sub: "rgba(245,243,238,0.60)",
  faint: "rgba(245,243,238,0.36)",
  brand: "#FF9F0A",
  brandSoft: "rgba(255,159,10,0.14)",
  pink: "#FF4D8D",
  green: "#3DD68C",
  grad: "linear-gradient(180deg, #FFB340 0%, #FF9F0A 100%)",
  scrim: "rgba(5,5,8,0.72)",
  shadow: "0 18px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
  bgGlow: [
    "radial-gradient(50% 38% at 22% 0%, rgba(255,159,10,0.13), transparent 70%)",
    "radial-gradient(44% 36% at 84% 8%, rgba(255,77,141,0.10), transparent 70%)",
    "radial-gradient(60% 50% at 50% 110%, rgba(255,159,10,0.07), transparent 70%)",
    "linear-gradient(180deg, #0B0B10 0%, #0D0C13 55%, #0B0B10 100%)",
  ].join(", "),
} as const;

/** Dark glass pill chip — icon + label, arena-style. */
export const arenaChip: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "7px 14px",
  borderRadius: 999,
  background: ARENA.card,
  border: `1px solid ${ARENA.border}`,
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  fontSize: 12,
  fontWeight: 700,
  color: ARENA.ink,
  whiteSpace: "nowrap",
};

/** Dark circular icon button. */
export const arenaCircleBtn: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 22,
  background: ARENA.card,
  border: `1px solid ${ARENA.border}`,
  color: ARENA.ink,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  transition: "transform 0.22s cubic-bezier(0.34,1.4,0.5,1), background 0.22s ease",
};

/** Dark ghost pill button. */
export const arenaGhostPill: React.CSSProperties = {
  borderRadius: 999,
  background: ARENA.card,
  color: ARENA.ink,
  fontWeight: 800,
  border: `1px solid ${ARENA.border}`,
  cursor: "pointer",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
};
