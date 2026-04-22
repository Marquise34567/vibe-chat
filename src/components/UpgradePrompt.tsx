import { Link } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { Tier, TIER_LABEL } from "@/lib/tiers";

type Props = {
  feature: string;
  requiredTier: Tier;
  className?: string;
  compact?: boolean;
};

export const UpgradePrompt = ({ feature, requiredTier, className = "", compact }: Props) => {
  if (compact) {
    return (
      <Link
        to="/#plans"
        className={`inline-flex items-center gap-1 sticker bg-highlight text-xs hover:scale-105 transition-transform ${className}`}
      >
        <Lock className="w-3 h-3" strokeWidth={3} /> {TIER_LABEL[requiredTier]}
      </Link>
    );
  }

  return (
    <div className={`glass brutal rounded-2xl p-4 flex items-center gap-3 ${className}`}>
      <div className="w-10 h-10 rounded-xl bg-highlight border-2 border-foreground brutal-sm flex items-center justify-center flex-shrink-0">
        <Lock className="w-5 h-5" strokeWidth={3} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-sm">{feature}</div>
        <div className="text-xs text-muted-foreground font-medium">
          Unlock with {TIER_LABEL[requiredTier]}
        </div>
      </div>
      <Link
        to="/#plans"
        className="brutal-hover bg-foreground text-background border-2 border-foreground rounded-xl px-3 py-2 font-display font-bold text-xs flex items-center gap-1 flex-shrink-0"
      >
        <Sparkles className="w-3 h-3" strokeWidth={3} /> Upgrade
      </Link>
    </div>
  );
};
