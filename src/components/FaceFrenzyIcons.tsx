import type { SVGProps } from "react";

/* ============================================================
   FaceFrenzy — Custom Carved Icon Set
   Hand-built SVGs for the entire video chat UI.
   No lucide. Rounded, energetic, brand-specific.
   Purple (#6B4CFF) + Yellow (#FFD60A) palette.
   "Carved" feel: dual-tone strokes with subtle depth.
   ============================================================ */

const PURPLE = "#6B4CFF";
const YELLOW = "#FFD60A";
const INK = "#0A0A14";

/* ---------- Chat room control icons ---------- */

// Mic — rounded capsule with sound waves
export const MicIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
    <path d="M 5 11 Q 5 17 12 17 Q 19 17 19 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Mic off — capsule with slash
export const MicOffIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <rect x="9" y="3" width="6" height="8" rx="3" fill="currentColor" opacity="0.4" />
    <path d="M 5 11 Q 5 17 12 17 Q 19 17 19 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
    <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

// Camera — rounded viewfinder with lens
export const CameraIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <rect x="2" y="6" width="14" height="12" rx="3" fill="currentColor" />
    <path d="M 16 10 L 22 6 V 18 L 16 14 Z" fill="currentColor" />
    <circle cx="9" cy="12" r="2.5" fill={INK} opacity="0.3" />
    <circle cx="9" cy="12" r="1.2" fill={INK} opacity="0.5" />
  </svg>
);

// Camera off — viewfinder with slash
export const CameraOffIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <rect x="2" y="6" width="14" height="12" rx="3" fill="currentColor" opacity="0.4" />
    <path d="M 16 10 L 22 6 V 18 L 16 14 Z" fill="currentColor" opacity="0.4" />
    <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

// Skip / Next — the hero button. Forward arrows in a circle.
export const SkipIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M 4 5 L 13 12 L 4 19 Z" fill="currentColor" />
    <path d="M 13 5 L 22 12 L 13 19 Z" fill="currentColor" opacity="0.7" />
  </svg>
);

// Heart — rounded, chunky
export const HeartIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path
      d="M 12 21 C 12 21 3 14.5 3 8.5 C 3 5.5 5.5 3 8.5 3 C 10.2 3 11.5 4 12 5 C 12.5 4 13.8 3 15.5 3 C 18.5 3 21 5.5 21 8.5 C 21 14.5 12 21 12 21 Z"
      fill="currentColor"
    />
  </svg>
);

// Report / Flag — rounded triangle flag
export const FlagIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <line x1="5" y1="3" x2="5" y2="21" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M 5 4 Q 12 2 18 5 Q 14 8 18 11 Q 12 9 5 11 Z" fill="currentColor" />
  </svg>
);

// HD / Sparkles — star burst
export const SparkleIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M 12 2 L 14 9 L 21 12 L 14 15 L 12 22 L 10 15 L 3 12 L 10 9 Z" fill="currentColor" />
    <path d="M 19 3 L 19.8 5.2 L 22 6 L 19.8 6.8 L 19 9 L 18.2 6.8 L 16 6 L 18.2 5.2 Z" fill="currentColor" opacity="0.6" />
  </svg>
);

// Translate — speech bubble with "A→文"
export const TranslateIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M 3 5 H 16 V 14 H 9 L 5 18 V 14 H 3 Z" fill="currentColor" rx="2" />
    <text x="9.5" y="11.5" fontSize="6" fontWeight="700" fill={INK} textAnchor="middle" fontFamily="system-ui">A</text>
    <path d="M 14 14 Q 18 14 18 18 Q 18 21 14 21 L 11 23 V 21 H 10 Q 14 21 14 18 Q 14 14 14 14 Z" fill="currentColor" opacity="0.7" transform="translate(2 -2)" />
  </svg>
);

// Gift — rounded box with bow
export const GiftIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <rect x="3" y="9" width="18" height="12" rx="2" fill="currentColor" />
    <rect x="3" y="9" width="18" height="3" fill={INK} opacity="0.2" />
    <rect x="10.5" y="9" width="3" height="12" fill={INK} opacity="0.2" />
    <path d="M 12 9 Q 8 9 8 6 Q 8 3 12 6 Q 16 3 16 6 Q 16 9 12 9 Z" fill="currentColor" />
    <path d="M 12 6 Q 10 4.5 10 6 Q 10 7 12 7 Q 14 7 14 6 Q 14 4.5 12 6 Z" fill={INK} opacity="0.15" />
  </svg>
);

// Games — controller silhouette
export const GamepadIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path
      d="M 6 8 H 18 Q 22 8 22 13 Q 22 18 19 18 Q 17 18 16 16 H 8 Q 7 18 5 18 Q 2 18 2 13 Q 2 8 6 8 Z"
      fill="currentColor"
    />
    <line x1="6" y1="12" x2="10" y2="12" stroke={INK} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    <line x1="8" y1="10" x2="8" y2="14" stroke={INK} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    <circle cx="16" cy="11.5" r="1.2" fill={INK} opacity="0.3" />
    <circle cx="18.5" cy="14" r="1.2" fill={INK} opacity="0.3" />
  </svg>
);

// Rewind — circular arrow
export const RewindIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M 12 3 A 9 9 0 1 1 3 12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    <path d="M 3 12 L 7 8 L 7 16 Z" fill="currentColor" />
    <path d="M 12 8 L 8 12 L 12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

// Send — paper plane, chunky
export const SendIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M 3 12 L 21 3 L 12 21 L 10 14 Z" fill="currentColor" />
    <path d="M 10 14 L 21 3" stroke={INK} strokeWidth="1" opacity="0.15" />
  </svg>
);

// Lock — small padlock
export const LockIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <rect x="5" y="10" width="14" height="11" rx="3" fill="currentColor" />
    <path d="M 8 10 V 7 Q 8 3 12 3 Q 16 3 16 7 V 10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    <circle cx="12" cy="15" r="1.8" fill={INK} opacity="0.3" />
  </svg>
);

/* ---------- Navigation / layout icons ---------- */

// Exit / Back — door with arrow
export const ExitIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M 4 3 H 14 V 21 H 4 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M 14 12 H 22" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M 18 7 L 22 12 L 18 17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

// Menu — three rounded dots
export const MenuIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <circle cx="5" cy="12" r="2.2" fill="currentColor" />
    <circle cx="12" cy="12" r="2.2" fill="currentColor" />
    <circle cx="19" cy="12" r="2.2" fill="currentColor" />
  </svg>
);

// Close — X with rounded caps
export const CloseIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

// Chevron right
export const ChevronRightIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M 9 5 L 16 12 L 9 19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

// Users — two overlapping rounded heads
export const UsersIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <circle cx="9" cy="8" r="3.5" fill="currentColor" />
    <path d="M 2 21 Q 2 14 9 14 Q 16 14 16 21 Z" fill="currentColor" />
    <circle cx="17" cy="9" r="2.8" fill="currentColor" opacity="0.6" />
    <path d="M 16 14 Q 22 14 22 21 L 16 21" fill="currentColor" opacity="0.6" />
  </svg>
);

// Globe — circle with meridians
export const GlobeIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
    <ellipse cx="12" cy="12" rx="4" ry="9" stroke="currentColor" strokeWidth="2" fill="none" />
    <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Message — chat bubble (for knock mode)
export const MessageIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M 4 5 H 20 Q 22 5 22 7 V 16 Q 22 18 20 18 H 10 L 5 22 V 18 H 4 Q 2 18 2 16 V 7 Q 2 5 4 5 Z" fill="currentColor" />
    <circle cx="8" cy="11.5" r="1.3" fill={INK} opacity="0.3" />
    <circle cx="12" cy="11.5" r="1.3" fill={INK} opacity="0.3" />
    <circle cx="16" cy="11.5" r="1.3" fill={INK} opacity="0.3" />
  </svg>
);

// Video (for tab bar) — rounded camera
export const VideoIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <rect x="2" y="6" width="14" height="12" rx="3.5" fill="currentColor" />
    <path d="M 16 10 L 22 6.5 V 17.5 L 16 14 Z" fill="currentColor" />
  </svg>
);

// Layers (for cards tab)
export const LayersIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M 12 3 L 22 8 L 12 13 L 2 8 Z" fill="currentColor" />
    <path d="M 2 13 L 12 18 L 22 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />
    <path d="M 2 17 L 12 22 L 22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.4" />
  </svg>
);

// User profile
export const UserIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <circle cx="12" cy="8" r="4" fill="currentColor" />
    <path d="M 4 22 Q 4 14 12 14 Q 20 14 20 22 Z" fill="currentColor" />
  </svg>
);

// User circle (for gender selection etc.)
export const UserCircleIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
    <circle cx="12" cy="9" r="3" fill="currentColor" />
    <path d="M 6 20 Q 6 14 12 14 Q 18 14 18 20" fill="currentColor" />
  </svg>
);

// Graduation cap (scholar)
export const ScholarIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M 12 3 L 22 8 L 12 13 L 2 8 Z" fill="currentColor" />
    <path d="M 6 10 V 16 Q 6 18 12 18 Q 18 18 18 16 V 10" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    <line x1="22" y1="8" x2="22" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="22" cy="14.5" r="1.2" fill="currentColor" />
  </svg>
);

// Coins (currency)
export const CoinsIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <circle cx="9" cy="9" r="6" fill="currentColor" />
    <circle cx="9" cy="9" r="3.5" fill="none" stroke={INK} strokeWidth="1.5" opacity="0.2" />
    <circle cx="15" cy="15" r="6" fill="currentColor" opacity="0.7" />
    <circle cx="15" cy="15" r="3.5" fill="none" stroke={INK} strokeWidth="1.5" opacity="0.2" />
  </svg>
);

// Eye (blind mode)
export const EyeIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M 2 12 Q 12 4 22 12 Q 12 20 2 12 Z" fill="currentColor" />
    <circle cx="12" cy="12" r="3.5" fill={INK} opacity="0.15" />
    <circle cx="12" cy="12" r="1.8" fill={INK} opacity="0.4" />
  </svg>
);

// Eye off (blind mode)
export const EyeOffIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M 2 12 Q 12 4 22 12 Q 12 20 2 12 Z" fill="currentColor" opacity="0.4" />
    <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

// Camera refresh (retry)
export const CameraRetryIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <rect x="2" y="6" width="14" height="12" rx="3" fill="currentColor" opacity="0.4" />
    <path d="M 16 10 L 22 6 V 18 L 16 14 Z" fill="currentColor" opacity="0.4" />
    <path d="M 12 8 A 5 5 0 1 1 7 13" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    <path d="M 7 13 L 7 9 L 11 9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

// Play (start button)
export const PlayIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M 6 4 L 20 12 L 6 20 Z" fill="currentColor" />
  </svg>
);

/* ---------- Lobby mode icons — Solo / Duo / Group ---------- */

// Solo — single person in a rounded frame (1v1)
export const SoloModeIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
    {/* Rounded video frame */}
    <rect x="3" y="6" width="26" height="20" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
    {/* Single person silhouette centered */}
    <circle cx="16" cy="14" r="3.5" fill="currentColor" />
    <path d="M 9 24 Q 9 18 16 18 Q 23 18 23 24" fill="currentColor" />
  </svg>
);

// Duo — two people side by side in a frame (you + friend vs stranger)
export const DuoModeIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
    {/* Split frame */}
    <rect x="3" y="6" width="26" height="20" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
    {/* Divider line */}
    <line x1="16" y1="8" x2="16" y2="24" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.5" />
    {/* Left person */}
    <circle cx="10" cy="14" r="2.5" fill="currentColor" />
    <path d="M 6 24 Q 6 19 10 19 Q 14 19 14 24" fill="currentColor" />
    {/* Right person */}
    <circle cx="22" cy="14" r="2.5" fill="currentColor" />
    <path d="M 18 24 Q 18 19 22 19 Q 26 19 26 24" fill="currentColor" />
  </svg>
);

// Group — 2x2 grid of people (2v2)
export const GroupModeIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
    {/* Outer frame */}
    <rect x="3" y="6" width="26" height="20" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
    {/* Cross divider */}
    <line x1="16" y1="8" x2="16" y2="24" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.5" />
    <line x1="5" y1="16" x2="27" y2="16" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.5" />
    {/* Four small people */}
    <circle cx="9.5" cy="13" r="1.8" fill="currentColor" />
    <circle cx="22.5" cy="13" r="1.8" fill="currentColor" />
    <circle cx="9.5" cy="20" r="1.8" fill="currentColor" />
    <circle cx="22.5" cy="20" r="1.8" fill="currentColor" />
  </svg>
);

// Blind mode — face with hands covering eyes (the "peeking" pose)
export const BlindModeIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
    {/* Rounded video frame */}
    <rect x="3" y="6" width="26" height="20" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
    {/* Face — circle head */}
    <circle cx="16" cy="15" r="6" fill="currentColor" opacity="0.25" />
    {/* Two hands covering eyes — rounded shapes over the face */}
    <path d="M 10 13 Q 10 10 13 10 Q 15 10 15 13 Q 15 15 13 15 Q 10 15 10 13 Z" fill="currentColor" />
    <path d="M 17 13 Q 17 10 19 10 Q 22 10 22 13 Q 22 15 19 15 Q 17 15 17 13 Z" fill="currentColor" />
    {/* Fingers — small lines on each hand */}
    <line x1="11" y1="11" x2="11" y2="13.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
    <line x1="12.5" y1="10.5" x2="12.5" y2="13.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
    <line x1="20.5" y1="11" x2="20.5" y2="13.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
    <line x1="19" y1="10.5" x2="19" y2="13.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
    {/* Mouth — small surprised "o" */}
    <circle cx="16" cy="18.5" r="1.2" fill="currentColor" opacity="0.5" />
  </svg>
);

// Plus — rounded
export const PlusIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);
