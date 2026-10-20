import { useState } from "react";
import { Shield, ArrowRight, User } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { FloatingStickers } from "@/components/FloatingStickers";
import { BUBBLE } from "@/lib/bubble";
import { setAgeVerified } from "@/lib/verification";
import { getDisplayName, setDisplayName } from "@/lib/localUser";
import { syncVisitorToSupabase } from "@/lib/identitySync";
import { toast } from "sonner";

/**
 * AgeGate — shown on first visit. Confirms 16+ then asks the user to pick
 * a display name (like monkey.app). The name shows when matched with someone.
 * Locket-style: warm cream canvas, floating stickers, chunky white card.
 */
export const AgeGate = ({ onDone }: { onDone: () => void }) => {
  const [step, setStep] = useState<"age" | "name">("age");
  const [name, setName] = useState(getDisplayName() ?? "");

  const confirmAge = () => {
    setAgeVerified();
    // If they already have a name saved, skip straight through
    if (getDisplayName()) { onDone(); return; }
    setStep("name");
  };

  const pickName = () => {
    const trimmed = name.trim();
    if (!trimmed) { toast.error("Pick a name to show when matching"); return; }
    if (trimmed.length > 20) { toast.error("Keep it under 20 characters"); return; }
    setDisplayName(trimmed);
    // Persist the new visitor row immediately (no auth required)
    void syncVisitorToSupabase();
    toast.success(`Let's go, ${trimmed}!`);
    onDone();
  };

  const cardStyle: React.CSSProperties = {
    maxWidth: 420,
    width: "100%",
    borderRadius: 28,
    background: BUBBLE.card,
    border: `1px solid ${BUBBLE.border}`,
    boxShadow: BUBBLE.cardShadow,
    padding: "32px 28px",
    textAlign: "center",
    position: "relative",
    zIndex: 10,
  };

  const ctaStyleLocal: React.CSSProperties = {
    width: "100%",
    height: 54,
    borderRadius: 27,
    border: "none",
    background: BUBBLE.grad,
    color: "#fff",
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    boxShadow:
      "inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -2.5px 0 rgba(140,80,10,0.20), 0 8px 22px rgba(255,159,10,0.42)",
    transition: "transform 0.18s ease, filter 0.2s ease",
  };

  if (step === "age") {
    return (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center px-4"
        style={{ background: BUBBLE.bg, color: BUBBLE.ink }}
      >
        <FloatingStickers />
        <div className="animate-pop-in" style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <BrandMark size={64} />
          </div>
          <h1 style={{ fontFamily: '"Baloo 2", "Nunito", sans-serif', fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 6 }}>
            welcome to <span style={{ color: BUBBLE.brand }}>facefrenzy</span>
          </h1>
          <p style={{ color: BUBBLE.sub, fontWeight: 600, fontSize: 14, marginBottom: 22 }}>
            Random video chat with real people. Real vibes, real connection.
          </p>

          <div
            style={{
              borderRadius: 18,
              background: "rgba(255,159,10,0.06)",
              border: `1px solid ${BUBBLE.border}`,
              padding: "16px 18px",
              marginBottom: 22,
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <Shield style={{ width: 20, height: 20, color: BUBBLE.brand, flexShrink: 0, marginTop: 2 }} strokeWidth={2.5} />
              <div style={{ fontSize: 13 }}>
                <div style={{ fontWeight: 800, marginBottom: 6, color: BUBBLE.ink }}>Before you enter:</div>
                <ul style={{ color: BUBBLE.sub, fontWeight: 600, lineHeight: 1.7, listStyle: "disc", paddingLeft: 18 }}>
                  <li>You must be <strong style={{ color: BUBBLE.ink }}>16 years or older</strong></li>
                  <li>You'll be matched with <strong style={{ color: BUBBLE.ink }}>real people</strong>, not bots</li>
                  <li>No fake profiles, no creeps</li>
                  <li>Be respectful — AI moderation is active</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={confirmAge}
            className="bub-btn"
            style={ctaStyleLocal}
          >
            I'm 16 or older <ArrowRight style={{ width: 20, height: 20 }} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => { setAgeVerified(); onDone(); }}
            style={{ marginTop: 12, fontSize: 12, fontWeight: 700, color: BUBBLE.faint, background: "none", border: "none", cursor: "pointer" }}
          >
            I'm not 16 yet — exit
          </button>
        </div>
      </div>
    );
  }

  // Name step — pick a display name (monkey.app style)
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ background: BUBBLE.bg, color: BUBBLE.ink }}
    >
      <FloatingStickers />
      <div className="animate-pop-in" style={cardStyle}>
        <div
          style={{
            width: 64, height: 64, borderRadius: 22, margin: "0 auto 16px",
            background: BUBBLE.brandSoft, border: `1px solid rgba(255,159,10,0.3)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <User style={{ width: 30, height: 30, color: BUBBLE.brand }} strokeWidth={2.5} />
        </div>
        <h2 style={{ fontFamily: '"Baloo 2", "Nunito", sans-serif', fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 6 }}>
          pick your name
        </h2>
        <p style={{ color: BUBBLE.sub, fontWeight: 600, fontSize: 14, marginBottom: 22 }}>
          This is what the other person sees when you match. Make it yours.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex, Kai, Nova…"
            maxLength={20}
            autoFocus
            className="input-glass text-center"
            style={{ fontSize: 17, fontWeight: 700 }}
            onKeyDown={(e) => e.key === "Enter" && pickName()}
          />
          <button onClick={pickName} className="bub-btn" style={ctaStyleLocal}>
            Start matching <ArrowRight style={{ width: 20, height: 20 }} strokeWidth={2.5} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: BUBBLE.faint, fontWeight: 600, marginTop: 16 }}>
          You can change this later in your profile.
        </p>
      </div>
    </div>
  );
};
