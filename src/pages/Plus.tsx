import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Crown } from "lucide-react";
import { GlassCard } from "@/components/glass";
import { useTier } from "@/hooks/useTier";
import { PLUS_FEATURES, PLUS_PLANS, VIP_PLANS, apiBase } from "@/lib/config";
import { TIER_LABEL } from "@/lib/tiers";
import { isHalloweenSeason, HALLOWEEN } from "@/lib/halloween";
import { FREE_DAILY_MATCH_LIMIT } from "@/lib/limits";
import { toast } from "sonner";

const REASON_COPY: Record<string, string> = {
  limit: `You used all ${FREE_DAILY_MATCH_LIMIT} free matches today. Go Plus and never wait again.`,
  gender: "Gender filters are a Plus feature. Upgrade to choose exactly who you meet.",
  region: "Region filters are a Plus feature. Upgrade to pick any part of the world.",
};

const Plus = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reason = params.get("reason") ?? "";
  const { tier, setTier } = useTier();
  const spooky = isHalloweenSeason();

  const [tierTab, setTierTab] = useState<"plus" | "vip">("plus");
  const [selected, setSelected] = useState("plus-yearly");
  const [loading, setLoading] = useState(false);
  const [devGranting, setDevGranting] = useState(false);

  const plans = tierTab === "vip" ? VIP_PLANS : PLUS_PLANS;
  const selectedPlan = plans.find((p) => p.id === selected) ?? plans[0];

  // Real Stripe Checkout — the worker creates a subscription session and we
  // redirect to it. On success Stripe returns to /?plus=success&session_id=…
  // where the app verifies the session server-side before granting the tier.
  const subscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase()}/api/sponsor-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan.id }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error(data.error || "Checkout failed to start");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not connect to payment server");
      setLoading(false);
    }
  };

  // Dev-only: local testing without Stripe (requires no payment server)
  const grantDev = () => {
    setDevGranting(true);
    setTier(tierTab);
    toast.success(`Dev grant: ${TIER_LABEL[tierTab]} activated`);
    navigate("/");
  };

  const isPlus = tier !== "free";
  const accent = spooky ? HALLOWEEN.pumpkin : "#FFD60A";

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
          {spooky && (
            <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${HALLOWEEN.pumpkin}1f 0%, transparent 60%)` }} />
          )}
          <div className="relative">
            <span className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ background: `linear-gradient(135deg, ${accent}, ${spooky ? HALLOWEEN.purple : "hsl(var(--primary))"})` }}>
              <Crown className="w-7 h-7 text-white" strokeWidth={2.5} />
            </span>
            {spooky && <div className="text-3xl mb-2">🎃</div>}
            <h1 className={`text-3xl font-bold tracking-tight ${spooky ? "ff-spooky-glow" : ""}`}>
              FaceFrenzy {tierTab === "vip" ? "VIP" : "Plus"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {REASON_COPY[reason] ?? "Unlock the full vibe. Cancel anytime."}
            </p>
            {isPlus && (
              <div className="badge badge-gold mt-4">You're on {TIER_LABEL[tier]}</div>
            )}
          </div>
        </GlassCard>

        {/* Tier toggle */}
        <div className="glass-segmented w-full">
          {(["plus", "vip"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTierTab(t); setSelected(t === "vip" ? "vip-yearly" : "plus-yearly"); }}
              className={`glass-segment flex-1 ${tierTab === t ? "selected" : ""}`}
            >
              {t === "vip" ? "👑 VIP" : "⭐ Plus"}
            </button>
          ))}
        </div>

        {/* Features */}
        <div className="space-y-2.5">
          {(tierTab === "vip" ? VIP_FEATURES : PLUS_FEATURES).map((f) => (
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
          {plans.map((p) => (
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

        {/* CTA — real Stripe subscription checkout */}
        <button
          onClick={subscribe}
          disabled={loading || tier === tierTab}
          className="btn-primary w-full text-lg py-4 disabled:opacity-50"
          style={spooky ? { background: `linear-gradient(135deg, #FFB347, ${HALLOWEEN.pumpkin})`, boxShadow: `0 6px 24px ${HALLOWEEN.pumpkin}55` } : undefined}
        >
          {loading ? "Redirecting to Stripe…" : tier === tierTab ? `You're already ${TIER_LABEL[tier]} ✨` : (
            <> <Crown className="w-5 h-5" strokeWidth={2.5} /> {spooky ? "Unleash" : "Get"} {TIER_LABEL[tierTab]} — {selectedPlan.price}{selectedPlan.per}</>
          )}
        </button>

        {/* Dev grant — only on localhost */}
        {(location.hostname === "localhost" || location.hostname === "127.0.0.1") && (
          <button onClick={grantDev} disabled={devGranting} className="btn-glass w-full text-sm opacity-70">
            {devGranting ? "Granting…" : "Dev: grant without payment"}
          </button>
        )}

        <p className="text-center text-xs text-muted-foreground pb-4">
          Secure checkout via Stripe. Cancel anytime from your profile.
        </p>
      </div>
    </div>
  );
};

const VIP_FEATURES = [
  { icon: "⭐", title: "Everything in Plus", desc: "Unlimited matches, all filters, no ads, priority queue." },
  { icon: "🎥", title: "HD video", desc: "Crystal-clear streams." },
  { icon: "💬", title: "Live captions", desc: "Real-time translated captions." },
  { icon: "⏪", title: "Rewind last skip", desc: "Go back to the person you skipped." },
  { icon: "🥇", title: "Appear first", desc: "Show up first in the lobby and queue." },
];

export default Plus;
