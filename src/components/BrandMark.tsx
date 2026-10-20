/* ============================================================
   BrandMark — FaceFrenzy logo, Locket-style.
   Orange rounded-square with a white heart + "facefrenzy"
   wordmark in chunky Baloo 2.
   ============================================================ */

export const BrandMark = ({
  size = 34,
  className = "",
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    className={className}
    aria-label="FaceFrenzy"
    role="img"
  >
    <defs>
      <linearGradient id="bm-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFB340" />
        <stop offset="100%" stopColor="#FF9F0A" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="60" height="60" rx="19" fill="url(#bm-grad)" />
    <rect x="2" y="2" width="60" height="60" rx="19" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
    {/* Soft top sheen */}
    <path d="M21 2 h22 c-2 10 -11 15 -11 15 S23 12 21 2 Z" fill="rgba(255,255,255,0.22)" />
    <path
      d="M32 52 C21 44 12 36.5 12 26.5 C12 18.8 17.8 13.5 24.5 13.5 C28 13.5 30.6 15 32 17.6 C33.4 15 36 13.5 39.5 13.5 C46.2 13.5 52 18.8 52 26.5 C52 36.5 43 44 32 52 Z"
      fill="#FFFFFF"
    />
  </svg>
);

/** Mark + wordmark lockup — the nav/logo combo used across screens. */
export const BrandLogo = ({
  size = 34,
  wordmarkSize = 16,
  showWordmark = true,
}: {
  size?: number;
  wordmarkSize?: number;
  showWordmark?: boolean;
}) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
    <BrandMark size={size} />
    {showWordmark && (
      <span className="ff-wordmark" style={{ fontSize: wordmarkSize }}>
        facefrenzy
      </span>
    )}
  </span>
);
