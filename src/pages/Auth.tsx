import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Sparkles, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const genders = ["Woman", "Man", "Non-binary", "Trans", "Genderfluid", "Prefer not to say"];
const interestOptions = ["Music 🎵", "Gaming 🎮", "Art 🎨", "Sports ⚽", "Anime ✨", "Travel ✈️", "Foodie 🍜", "Memes 💀"];
const countries = [
  { code: "US", flag: "🇺🇸", name: "USA" },
  { code: "BR", flag: "🇧🇷", name: "Brazil" },
  { code: "JP", flag: "🇯🇵", name: "Japan" },
  { code: "KR", flag: "🇰🇷", name: "Korea" },
  { code: "FR", flag: "🇫🇷", name: "France" },
  { code: "MX", flag: "🇲🇽", name: "Mexico" },
  { code: "DE", flag: "🇩🇪", name: "Germany" },
  { code: "IN", flag: "🇮🇳", name: "India" },
  { code: "GB", flag: "🇬🇧", name: "UK" },
  { code: "IT", flag: "🇮🇹", name: "Italy" },
  { code: "ES", flag: "🇪🇸", name: "Spain" },
  { code: "CA", flag: "🇨🇦", name: "Canada" },
];

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);

  const toggleInterest = (i: string) => {
    setInterests((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back ✨");
    navigate("/");
  };

  const handleSignup = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          display_name: displayName,
          gender,
          country,
          interests,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("You're in! Welcome to FaceFrenzy 🎉");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <button
          onClick={() => navigate("/")}
          className="font-display font-bold text-sm flex items-center gap-1 mb-4 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={3} /> back
        </button>

        <div className="glass brutal-lg rounded-3xl p-6 md:p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary border-2 border-foreground brutal-sm flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" strokeWidth={3} />
            </div>
            <span className="font-display font-bold text-2xl">FaceFrenzy</span>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2 mb-6 p-1 border-2 border-foreground rounded-xl bg-background">
            {(["signup", "login"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setStep(1); }}
                className={`flex-1 py-2 font-display font-bold rounded-lg transition-colors ${
                  mode === m ? "bg-foreground text-background" : ""
                }`}
              >
                {m === "signup" ? "Sign up" : "Log in"}
              </button>
            ))}
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="Email">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="brutal-input"
                  placeholder="you@facefrenzy.app"
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="brutal-input"
                  placeholder="••••••••"
                />
              </Field>
              <button
                type="submit"
                disabled={loading}
                className="brutal-hover w-full bg-foreground text-background border-2 border-foreground rounded-2xl py-4 font-display font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? "..." : <>Log in <ArrowRight className="w-5 h-5" strokeWidth={3} /></>}
              </button>
            </form>
          ) : (
            <>
              <StepDots step={step} total={4} />

              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="font-display font-bold text-3xl mb-1">first, the basics</h2>
                  <p className="text-muted-foreground font-medium text-sm mb-4">how do we reach you?</p>
                  <Field label="Display name">
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="brutal-input"
                      placeholder="cooluser123"
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="brutal-input"
                      placeholder="you@facefrenzy.app"
                    />
                  </Field>
                  <Field label="Password">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="brutal-input"
                      placeholder="6+ characters"
                    />
                  </Field>
                  <NextBtn
                    disabled={!email || password.length < 6 || !displayName}
                    onClick={() => setStep(2)}
                  />
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="font-display font-bold text-3xl mb-1">i identify as...</h2>
                  <p className="text-muted-foreground font-medium text-sm mb-4">we'll use this for matching only</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {genders.map((g) => (
                      <button
                        key={g}
                        onClick={() => setGender(g)}
                        className={`brutal-sm border-2 border-foreground rounded-full px-3 py-2 font-display font-bold text-sm transition-colors ${
                          gender === g ? "bg-primary text-primary-foreground" : "bg-card hover:bg-highlight"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  <NextBtn disabled={!gender} onClick={() => setStep(3)} />
                </div>
              )}

              {step === 3 && (
                <div>
                  <h2 className="font-display font-bold text-3xl mb-1">where you at?</h2>
                  <p className="text-muted-foreground font-medium text-sm mb-4">pick your home country</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6 max-h-72 overflow-y-auto">
                    {countries.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => setCountry(c.code)}
                        className={`brutal-sm border-2 border-foreground rounded-2xl p-3 text-center transition-colors ${
                          country === c.code ? "bg-accent text-accent-foreground" : "bg-card hover:bg-highlight"
                        }`}
                      >
                        <div className="text-3xl mb-1">{c.flag}</div>
                        <div className="font-display font-bold text-xs">{c.name}</div>
                      </button>
                    ))}
                  </div>
                  <NextBtn disabled={!country} onClick={() => setStep(4)} />
                </div>
              )}

              {step === 4 && (
                <div>
                  <h2 className="font-display font-bold text-3xl mb-1">your vibe?</h2>
                  <p className="text-muted-foreground font-medium text-sm mb-4">pick at least one</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {interestOptions.map((i) => (
                      <button
                        key={i}
                        onClick={() => toggleInterest(i)}
                        className={`brutal-sm border-2 border-foreground rounded-xl px-3 py-2 font-display font-bold text-sm transition-colors ${
                          interests.includes(i) ? "bg-secondary text-secondary-foreground" : "bg-card hover:bg-highlight"
                        }`}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleSignup}
                    disabled={interests.length === 0 || loading}
                    className="brutal-hover w-full bg-foreground text-background border-2 border-foreground rounded-2xl py-4 font-display font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? "creating..." : <>Let's go <ArrowRight className="w-5 h-5" strokeWidth={3} /></>}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="font-display font-bold text-sm mb-1 block">{label}</span>
    {children}
  </label>
);

const NextBtn = ({ disabled, onClick }: { disabled: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="brutal-hover w-full bg-foreground text-background border-2 border-foreground rounded-2xl py-4 font-display font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
  >
    Next <ArrowRight className="w-5 h-5" strokeWidth={3} />
  </button>
);

const StepDots = ({ step, total }: { step: number; total: number }) => (
  <div className="flex gap-2 mb-6">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className={`h-2 flex-1 rounded-full border-2 border-foreground ${
          i + 1 <= step ? "bg-primary" : "bg-card"
        }`}
      />
    ))}
  </div>
);

export default Auth;
