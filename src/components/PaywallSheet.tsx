import { useNavigate } from "react-router-dom";
import { Crown, Lock } from "lucide-react";
import { BUBBLE } from "@/lib/bubble";
import { FREE_DAILY_MATCH_LIMIT } from "@/lib/limits";

export type PaywallReason =
  | "limit"        // daily match cap hit
  | "gender"       // gender filter locked
  | "region"       // region picker locked
  | "generic";     // generic upsell

const COPY: Record<PaywallReason, { emoji: string; title: string; body: string }> = {
  limit: {
    emoji: "⏳",
    title: "You're out of free matches",
    body: `Free accounts get ${FREE_DAILY_MATCH_LIMIT} matches a day. Go Plus for unlimited matches — no waiting until tomorrow.`,
  },
  gender: {
    emoji: "💘",
    title: "Gender filters are a Plus feature",
    body: "Choose exactly who you meet. Upgrade to Plus to filter by girls, guys, or both.",
  },
  region: {
    emoji: "🌍",
    title: "Region filters are a Plus feature",
    body: "Pick where in the world your matches come from. Upgrade to Plus to unlock all regions.",
  },
  generic: {
    emoji: "✨",
    title: "Unlock FaceFrenzy Plus",
    body: "Unlimited matches, gender + region filters, priority queue, and more.",
  },
};

/**
 * PaywallSheet — hard paywall modal. Blocks the action and pushes /plus.
 * Locket-style warm light card with an orange gradient CTA.
 */
export const PaywallSheet = ({
  reason,
  onClose,
}: {
  reason: PaywallReason;
  onClose: () => void;
}) => {
  const navigate = useNavigate();
  const copy = COPY[reason];

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(72,56,32,0.45)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md animate-sheet-up"
        style={{
          background: BUBBLE.card,
          borderRadius: "28px 28px 0 0",
          padding: "28px 24px calc(env(safe-area-inset-bottom, 0px) + 28px)",
          borderTop: `1px solid ${BUBBLE.border}`,
          boxShadow: `0 -16px 64px rgba(120,72,20,0.30), 0 0 80px rgba(255,159,10,0.15)`,
          maxHeight: "88dvh",
          overflowY: "auto",
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(120,72,20,0.15)", margin: "0 auto 22px" }} />

        {/* Lock medallion */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <div style={{ position: "relative" }}>
            <div
              style={{
                width: 76, height: 76, borderRadius: 38,
                background: `linear-gradient(140deg, ${BUBBLE.brand} 0%, #E5820A 100%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 10px 36px rgba(255,159,10,0.40), inset 0 2px 0 rgba(255,255,255,0.45)`,
              }}
            >
              <Lock style={{ width: 32, height: 32, color: "#fff" }} strokeWidth={2.5} />
            </div>
            <span style={{
              position: "absolute", top: -8, right: -10, fontSize: 22,
              animation: "ff-icon-bounce 2s ease-in-out infinite",
            }}>
              {copy.emoji}
            </span>
          </div>
        </div>

        <h2
          style={{ fontSize: 24, fontWeight: 900, color: BUBBLE.ink, textAlign: "center", letterSpacing: "-0.5px", marginBottom: 8 }}
        >
          {copy.title}
        </h2>
        <p style={{ fontSize: 14, color: BUBBLE.sub, textAlign: "center", lineHeight: 1.5, marginBottom: 22 }}>
          {copy.body}
        </p>

        {/* Mini feature list */}
        <div
          className="p-4 mb-5"
          style={{
            borderRadius: 18,
            background: "rgba(255,159,10,0.05)",
            border: `1px solid ${BUBBLE.border}`,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["♾️", "Unlimited matches — no daily cap"],
              ["💘", "Gender + region filters"],
              ["⚡", "Priority queue — match faster"],
              ["🚫", "Zero ads"],
            ].map(([icon, text]) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 700, color: BUBBLE.ink }}>
                <span style={{ fontSize: 16 }}>{icon}</span> {text}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate(`/plus?reason=${reason}`)}
          style={{
            width: "100%", height: 54, borderRadius: 27, border: "none", cursor: "pointer",
            background: BUBBLE.grad,
            color: "#fff", fontSize: 16, fontWeight: 900, letterSpacing: "0.2px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: `0 8px 28px rgba(255,159,10,0.40), inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -2.5px 0 rgba(140,80,10,0.20)`,
            transition: "transform 0.15s ease, filter 0.2s ease",
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <Crown style={{ width: 18, height: 18 }} strokeWidth={2.5} />
          Get Plus — from $1.99
        </button>
        <button
          onClick={onClose}
          style={{
            width: "100%", marginTop: 10, height: 40, borderRadius: 20,
            background: "transparent", border: "none", cursor: "pointer",
            color: BUBBLE.faint, fontSize: 13, fontWeight: 700,
          }}
        >
          {reason === "limit" ? "Come back tomorrow" : "Maybe later"}
        </button>
      </div>
    </div>
  );
};
