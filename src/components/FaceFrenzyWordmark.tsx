import type { CSSProperties } from "react";

/* ============================================================
   FaceFrenzy Wordmark — custom SVG logo
   "facefrenzy" lowercase in chunky Baloo 2 cocoa ink,
   Locket-style solid color with a tiny heart accent.
   ============================================================ */

export const FaceFrenzyWordmark = ({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) => (
  <svg
    viewBox="0 0 360 80"
    className={className}
    style={style}
    aria-label="FaceFrenzy"
    role="img"
  >
    <text
      x="0" y="58"
      fontFamily="'Baloo 2', 'Nunito', system-ui, sans-serif"
      fontSize="56" fontWeight="800"
      letterSpacing="-2"
      fill="#33291C"
    >
      facefrenzy
    </text>

    {/* Heart accent — top right over the 'y' */}
    <path
      d="M 340 24 C 336 20 331 16 331 11.5 C 331 8 333.8 5.5 337 5.5 C 338.4 5.5 339.6 6.2 340 7.4 C 340.4 6.2 341.6 5.5 343 5.5 C 346.2 5.5 349 8 349 11.5 C 349 16 344 20 340 24 Z"
      fill="#FF9F0A"
    />
  </svg>
);

/* Smaller text-based wordmark for tight spaces */
export const FaceFrenzyText = ({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) => (
  <span
    className={`ff-wordmark ${className}`}
    style={style}
  >
    facefrenzy
  </span>
);
