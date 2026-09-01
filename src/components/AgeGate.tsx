import { useState } from "react";
import { Shield, Sparkles, ArrowRight, User } from "lucide-react";
import { GlassCard } from "@/components/glass";
import { setAgeVerified } from "@/lib/verification";
import { getDisplayName, setDisplayName } from "@/lib/localUser";
import { toast } from "sonner";

/**
 * AgeGate — shown on first visit. Confirms 16+ then asks the user to pick
 * a display name (like monkey.app). The name shows when matched with someone.
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
    toast.success(`Let's go, ${trimmed}!`);
    onDone();
  };

  if (step === "age") {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-app">
        <GlassCard strong className="max-w-md w-full p-8 text-center animate-pop-in">
          <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2 text-white">Welcome to FaceFrenzy</h1>
          <p className="text-white/60 mb-6">
            Random video chat with real people. Real vibes, real connection.
          </p>

          <div className="neu-inset-sm p-5 mb-6 text-left rounded-2xl">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" strokeWidth={2.5} />
              <div className="text-sm">
                <div className="font-semibold mb-1 text-white">Before you enter:</div>
                <ul className="text-white/50 space-y-1 list-disc list-inside">
                  <li>You must be <strong className="text-white/80">16 years or older</strong></li>
                  <li>You'll be matched with <strong className="text-white/80">real people</strong>, not bots</li>
                  <li>No fake profiles, no creeps</li>
                  <li>Be respectful — AI moderation is active</li>
                </ul>
              </div>
            </div>
          </div>

          <button onClick={confirmAge} className="btn-primary w-full text-lg">
            I'm 16 or older <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <button onClick={() => { setAgeVerified(); onDone(); }} className="text-xs text-white/40 mt-3 hover:text-white/70">
            I'm not 16 yet — exit
          </button>
        </GlassCard>
      </div>
    );
  }

  // Name step — pick a display name (monkey.app style)
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-app">
      <GlassCard strong className="max-w-md w-full p-8 animate-pop-in">
        <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center mx-auto mb-5 shadow-lg">
          <User className="w-8 h-8 text-white" strokeWidth={2.5} />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-center mb-2 text-white">Pick your name</h2>
        <p className="text-white/60 text-center mb-6">
          This is what the other person sees when you match. Make it yours.
        </p>

        <div className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex, Kai, Nova…"
            maxLength={20}
            autoFocus
            className="input-glass text-center text-lg"
            onKeyDown={(e) => e.key === "Enter" && pickName()}
          />
          <button onClick={pickName} className="btn-primary w-full">
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} /> Start matching
          </button>
        </div>

        <p className="text-xs text-white/40 text-center mt-4">
          You can change this later in your profile.
        </p>
      </GlassCard>
    </div>
  );
};
