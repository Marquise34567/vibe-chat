import type { SVGProps } from "react";

/* ============================================================
   FaceFrenzy — custom animated SVG icons for the Match view
   Hand-built (no lucide). On-brand purple + yellow, "frenzy"
   energy: pulses, sweeps, orbits, blinks, bounces.
   ============================================================ */

const PURPLE = "#6B4CFF";
const PURPLE_DEEP = "#3B2AD4";
const YELLOW = "#FFD60A";
const YELLOW_SOFT = "#FFE45E";
const INK = "#1A1400";

/* ---------- Centerpiece: animated radar with orbiting match dots ---------- */
export const RadarPulse = ({ className = "" }: { className?: string }) => (
  <div className={`ff-radar ${className}`}>
    {/* Concentric pulsing rings */}
    <span className="ff-radar-ring" style={{ animationDelay: "0s" }} />
    <span className="ff-radar-ring" style={{ animationDelay: "0.8s" }} />
    <span className="ff-radar-ring" style={{ animationDelay: "1.6s" }} />

    {/* Rotating conic sweep */}
    <span className="ff-radar-sweep" />

    {/* Orbiting "person" dots at three radii */}
    <span className="ff-orbit ff-orbit-1">
      <span className="ff-orbit-dot" />
    </span>
    <span className="ff-orbit ff-orbit-2">
      <span className="ff-orbit-dot ff-orbit-dot-yellow" />
    </span>
    <span className="ff-orbit ff-orbit-3">
      <span className="ff-orbit-dot" />
    </span>

    {/* Center frenzy face */}
    <span className="ff-radar-core">
      <FrenzyFace />
    </span>
  </div>
);

/* ---------- The FaceFrenzy "frenzy face" mark (used in radar core + favicon-style) ---------- */
export const FrenzyFace = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="ff-face-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={YELLOW_SOFT} />
        <stop offset="100%" stopColor={YELLOW} />
      </linearGradient>
    </defs>
    <ellipse cx="32" cy="33" rx="17" ry="16" fill="url(#ff-face-grad)" />
    <g fill={INK}>
      <ellipse cx="25.5" cy="30" rx="2.6" ry="3.4" transform="rotate(-12 25.5 30)" />
      <ellipse cx="38.5" cy="30" rx="2.6" ry="3.4" transform="rotate(12 38.5 30)" />
    </g>
    <g fill="#FFFFFF">
      <circle cx="26.4" cy="28.8" r="0.9" />
      <circle cx="39.4" cy="28.8" r="0.9" />
    </g>
    <path d="M 24 37 Q 32 45 40 37 Q 32 41 24 37 Z" fill={INK} />
    <circle cx="21" cy="36" r="2.2" fill="#FF6B9D" opacity="0.55" />
    <circle cx="43" cy="36" r="2.2" fill="#FF6B9D" opacity="0.55" />
  </svg>
);

/* ---------- Mode icons (custom, on-brand) ---------- */

// Solo — single face with a gentle pulse halo
export const SoloIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <circle cx="12" cy="12" r="10" className="ff-solo-halo" stroke={PURPLE} strokeWidth="1.5" opacity="0.5" />
    <circle cx="12" cy="11" r="4.2" fill={YELLOW} />
    <circle cx="10.4" cy="10.4" r="0.7" fill={INK} />
    <circle cx="13.6" cy="10.4" r="0.7" fill={INK} />
    <path d="M 9.6 12.4 Q 12 14.2 14.4 12.4" stroke={INK} strokeWidth="0.9" strokeLinecap="round" fill="none" />
  </svg>
);

// Duo — two faces wiggling together
export const DuoIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <g className="ff-duo-left">
      <circle cx="8" cy="11" r="4" fill={YELLOW} />
      <circle cx="6.6" cy="10.4" r="0.6" fill={INK} />
      <circle cx="9.4" cy="10.4" r="0.6" fill={INK} />
      <path d="M 6 12.2 Q 8 13.6 10 12.2" stroke={INK} strokeWidth="0.8" strokeLinecap="round" fill="none" />
    </g>
    <g className="ff-duo-right">
      <circle cx="16" cy="11" r="4" fill={PURPLE} />
      <circle cx="14.6" cy="10.4" r="0.6" fill="#FFFFFF" />
      <circle cx="17.4" cy="10.4" r="0.6" fill="#FFFFFF" />
      <path d="M 14 12.2 Q 16 13.6 18 12.2" stroke="#FFFFFF" strokeWidth="0.8" strokeLinecap="round" fill="none" />
    </g>
  </svg>
);

// Knock — chat bubble with a knock-bounce + ripple
export const KnockIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <g className="ff-knock-bubble">
      <path d="M 5 7 h 14 a 2 2 0 0 1 2 2 v 6 a 2 2 0 0 1 -2 2 h -8 l -4 3 v -3 h -2 a 2 2 0 0 1 -2 -2 v -6 a 2 2 0 0 1 2 -2 z" fill={YELLOW} />
      <circle cx="9" cy="12" r="0.9" fill={INK} />
      <circle cx="12" cy="12" r="0.9" fill={INK} />
      <circle cx="15" cy="12" r="0.9" fill={INK} />
    </g>
    <circle className="ff-knock-ripple" cx="20" cy="20" r="1.5" stroke={PURPLE} strokeWidth="1" fill="none" />
  </svg>
);

// Blind — eye that blinks (covered/anonymous vibe)
export const BlindIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M 2 12 Q 12 4 22 12 Q 12 20 2 12 Z" fill={PURPLE} />
    <g className="ff-blind-eye">
      <circle cx="12" cy="12" r="3.2" fill={YELLOW} />
      <circle cx="12" cy="12" r="1.4" fill={INK} />
    </g>
    <path className="ff-blind-strike" d="M 3 4 L 21 20" stroke={YELLOW} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/* ---------- Action icons (animated on hover) ---------- */

// Close — two bars that draw in + rotate on hover
export const CloseIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <g className="ff-close-group">
      <path className="ff-close-bar ff-close-bar-1" d="M 6 6 L 18 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path className="ff-close-bar ff-close-bar-2" d="M 18 6 L 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  </svg>
);

// Back — arrow that slides back on hover
export const BackIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <g className="ff-back-group">
      <path className="ff-back-stem" d="M 4 12 H 20" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path className="ff-back-head" d="M 10 6 L 4 12 L 10 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </g>
  </svg>
);

export const modeIconFor = (mode: string) =>
  mode === "blind" ? BlindIcon : mode === "group" ? DuoIcon : SoloIcon;
