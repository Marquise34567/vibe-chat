import { useEffect, useState } from "react";
import { Eye, Heart, X, SkipForward } from "lucide-react";
import { GlassCard } from "@/components/glass";

/**
 * AttentionCheck — the "are you still interested?" popup.
 * Triggered by the attention tracking hook when the user appears away.
 */
export const AttentionCheck = ({
  open,
  onStillHere,
  onSkip,
  onClose,
}: {
  open: boolean;
  onStillHere: () => void;
  onSkip: () => void;
  onClose: () => void;
}) => {
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    if (!open) { setCountdown(15); return; }
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          onSkip();
          return 15;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [open, onSkip]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <GlassCard strong className="max-w-sm w-full p-7 text-center animate-pop-in">
        <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
          <Eye className="w-7 h-7 text-primary" strokeWidth={2.5} />
        </div>
        <h2 className="text-xl font-bold mb-2">Are you still here?</h2>
        <p className="text-sm text-muted-foreground mb-5">
          You seem distracted. Want to keep chatting or find someone new?
          <br />
          <span className="font-semibold text-foreground">Auto-skip in {countdown}s</span>
        </p>
        <div className="flex gap-3">
          <button
            onClick={onStillHere}
            className="btn-primary flex-1"
          >
            <Heart className="w-4 h-4" strokeWidth={2.5} /> I'm here
          </button>
          <button
            onClick={onSkip}
            className="btn-glass flex-1"
          >
            <SkipForward className="w-4 h-4" strokeWidth={2.5} /> Next
          </button>
        </div>
        <button onClick={onClose} className="text-xs text-muted-foreground mt-3 hover:text-foreground">
          Dismiss
        </button>
      </GlassCard>
    </div>
  );
};
