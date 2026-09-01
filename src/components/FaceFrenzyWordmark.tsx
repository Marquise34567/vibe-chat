import type { CSSProperties } from "react";

/* ============================================================
   FaceFrenzy Wordmark — custom SVG logo
   "facefrenzy" in lowercase, gradient yellow→purple,
   with a frenzy-face dot over the 'i' (there's no i, so we
   use it as a spark accent). Hand-tuned letterforms with
   rounded terminals to match the Unbounded font energy.
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
    <defs>
      <linearGradient id="ff-wm-grad" x1="0" y1="0" x2="1" y2="0.6">
        <stop offset="0%" stopColor="#FFD60A" />
        <stop offset="45%" stopColor="#FFE45E" />
        <stop offset="100%" stopColor="#6B4CFF" />
      </linearGradient>
      <linearGradient id="ff-wm-glow" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#FFD60A" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#6B4CFF" stopOpacity="0.5" />
      </linearGradient>
    </defs>

    {/* Glow layer (blurred copy) */}
    <text
      x="0" y="58"
      fontFamily="Unbounded, system-ui, sans-serif"
      fontSize="56" fontWeight="900"
      letterSpacing="-2.5"
      fill="url(#ff-wm-glow)"
      style={{ filter: "blur(6px)" }}
    >
      facefrenzy
    </text>

    {/* Main text */}
    <text
      x="0" y="58"
      fontFamily="Unbounded, system-ui, sans-serif"
      fontSize="56" fontWeight="900"
      letterSpacing="-2.5"
      fill="url(#ff-wm-grad)"
    >
      facefrenzy
    </text>

    {/* Frenzy spark accent — top right over the 'y' */}
    <g transform="translate(335 14)">
      <path
        d="M 0 0 L 2 5 L 7 7 L 2 9 L 0 14 L -2 9 L -7 7 L -2 5 Z"
        fill="#FFD60A"
        opacity="0.9"
      />
    </g>
  </svg>
);

/* Smaller text-based wordmark for tight spaces (uses CSS gradient) */
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
