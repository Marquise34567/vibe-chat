import { useState } from "react";
import { Shield, GraduationCap, Sparkles, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/glass";
import { setAgeVerified, setScholarVerified, isScholarEmail } from "@/lib/verification";
import { toast } from "sonner";

/**
 * AgeGate — shown on first visit. Confirms 16+ and optionally verifies
 * scholar status (.edu email). FaceFrenzy is "scholars only".
 */
export const AgeGate = ({ onDone }: { onDone: () => void }) => {
  const [step, setStep] = useState<"age" | "scholar">("age");
  const [email, setEmail] = useState("");
  const [skipScholar, setSkipScholar] = useState(false);

  const confirmAge = () => {
    setAgeVerified();
    setStep("scholar");
  };

  const verifyScholar = () => {
    if (!email.trim()) { toast.error("Enter your student email"); return; }
    if (!isScholarEmail(email)) {
      toast.error("That doesn't look like a student email (.edu, .ac.uk, etc.)");
      return;
    }
    setScholarVerified(email.trim());
    toast.success("Scholar verified! 🎓");
    onDone();
  };

  const skip = () => {
    setSkipScholar(true);
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
            Random video chat for scholars. Real people, real vibes, real connection.
          </p>

          <div className="neu-inset-sm p-5 mb-6 text-left rounded-2xl">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" strokeWidth={2.5} />
              <div className="text-sm">
                <div className="font-semibold mb-1 text-white">Before you enter:</div>
                <ul className="text-white/50 space-y-1 list-disc list-inside">
                  <li>You must be <strong className="text-white/80">16 years or older</strong></li>
                  <li>You'll be matched with other <strong className="text-white/80">verified scholars</strong></li>
                  <li>No bots, no fake profiles, no creeps</li>
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

  // Scholar step
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-app">
      <GlassCard strong className="max-w-md w-full p-8 animate-pop-in">
        <div className="w-16 h-16 rounded-3xl bg-secondary flex items-center justify-center mx-auto mb-5 shadow-lg">
          <GraduationCap className="w-8 h-8 text-white" strokeWidth={2.5} />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-center mb-2 text-white">Scholars Only</h2>
        <p className="text-white/60 text-center mb-6">
          Verify with your student email to get the <span className="badge badge-gold">🎓 Scholar</span> badge
          and match with other verified students.
        </p>

        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="yourname@university.edu"
            className="input-glass"
            onKeyDown={(e) => e.key === "Enter" && verifyScholar()}
          />
          <button onClick={verifyScholar} className="btn-primary w-full">
            <GraduationCap className="w-4 h-4" strokeWidth={2.5} /> Verify student email
          </button>
          <button onClick={skip} className="btn-glass w-full text-sm">
            Skip for now — I'll verify later
          </button>
        </div>

        <p className="text-xs text-white/40 text-center mt-4">
          We accept .edu, .ac.uk, .ac.jp, and other university domains.
          {!skipScholar && " You can still browse without verifying."}
        </p>
      </GlassCard>
    </div>
  );
};
