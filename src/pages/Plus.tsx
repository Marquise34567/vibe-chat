import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Crown, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/glass";
import { useTier } from "@/hooks/useTier";
import { PLUS_FEATURES, PLUS_PLANS } from "@/lib/config";
import { TIER_LABEL, Tier } from "@/lib/tiers";
import { toast } from "sonner";

const Plus = () => {
  const navigate = useNavigate();
  const { tier, setTier } = useTier();
  const [selected, setSelected] = useState("yearly");
  const [loading, setLoading] = useState(false);

  const subscribe = async (next: Tier) => {
    setLoading(true);
    setTier(next);
    setLoading(false);
    toast.success(`Welcome to ${TIER_LABEL[next]}! 🎉`);
    navigate("/profile");
  };

  const isPlus = tier !== "free";

  return (
    <div className="min-h-screen px-4 py-6">
      <button onClick={() => navigate(-1)} className="text-sm font-semibold flex items-center gap-1 mb-5 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" strokeWidth={2.5} /> Back
      </button>

      <div className="max-w-md mx-auto space-y-5">
        {/* Hero */}
        <GlassCard strong className="p-8 text-center relative overflow-hidden" interactive={false}>
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-highlight/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative">
            <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-highlight to-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Crown className="w-7 h-7 text-white" strokeWidth={2.5} />
            </span>
            <h1 className="text-3xl font-bold tracking-tight">FaceFrenzy Plus</h1>
            <p className="text-muted-foreground mt-2">Unlock the full vibe. Cancel anytime.</p>
            {isPlus && (
              <div className="badge badge-gold mt-4">You're on {TIER_LABEL[tier]}</div>
            )}
          </div>
        </GlassCard>

        {/* Features */}
        <div className="space-y-2.5">
          {PLUS_FEATURES.map((f) => (
            <GlassCard key={f.title} className="p-4 flex items-center gap-3" interactive={false}>
              <span className="w-10 h-10 rounded-2xl bg-primary/12 flex items-center justify-center text-xl shrink-0">{f.icon}</span>
              <div className="flex-1">
                <div className="font-semibold text-sm">{f.title}</div>
                <div className="text-xs text-muted-foreground">{f.desc}</div>
              </div>
              <Check className="w-5 h-5 text-primary shrink-0" strokeWidth={3} />
            </GlassCard>
          ))}
        </div>

        {/* Plans */}
        <div className="space-y-2.5">
          {PLUS_PLANS.map((p) => (
            <button key={p.id} onClick={() => setSelected(p.id)} className="w-full text-left">
              <GlassCard strong={selected === p.id} className={`p-4 flex items-center gap-3 ${selected === p.id ? "ring-2 ring-primary" : ""}`} interactive={false}>
                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected === p.id ? "border-primary bg-primary" : "border-border"}`}>
                  {selected === p.id && <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />}
                </span>
                <div className="flex-1">
                  <div className="font-semibold flex items-center gap-2">
                    {p.label}
                    {p.save && <span className="badge badge-gold text-[10px]">{p.save}</span>}
                    {p.featured && <span className="badge badge-primary text-[10px]">Best value</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{p.price}</div>
                  <div className="text-xs text-muted-foreground">{p.per}</div>
                </div>
              </GlassCard>
            </button>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => subscribe("plus")}
          disabled={loading || isPlus}
          className="btn-primary w-full text-lg py-4 disabled:opacity-50"
        >
          {loading ? "Processing…" : isPlus ? "You're already Plus ✨" : (
            <> <Crown className="w-5 h-5" strokeWidth={2.5} /> Get Plus now</>
          )}
        </button>

        {/* VIP upsell */}
        <GlassCard className="p-5" interactive={false}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-secondary" strokeWidth={2.5} />
            <span className="font-bold">Want even more? Go VIP</span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Everything in Plus, plus HD video, live captions, rewind last skip, and appear first in the lobby.
          </p>
          <button onClick={() => subscribe("vip")} disabled={loading || tier === "vip"} className="btn-glass w-full">
            {tier === "vip" ? "You're VIP 👑" : "Upgrade to VIP"}
          </button>
        </GlassCard>

        <p className="text-center text-xs text-muted-foreground pb-4">
          This is a demo — no real charges. Tier is set directly on your profile.
        </p>
      </div>
    </div>
  );
};

export default Plus;
