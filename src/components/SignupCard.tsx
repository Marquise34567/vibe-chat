import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

const genders = ["Woman", "Man", "Non-binary", "Trans", "Genderfluid", "Prefer not to say"];
const interests = ["Music 🎵", "Gaming 🎮", "Art 🎨", "Sports ⚽", "Anime ✨", "Travel ✈️", "Foodie 🍜", "Memes 💀"];

export const SignupCard = () => {
  const [gender, setGender] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

  const toggle = (i: string) => {
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  };

  return (
    <section className="px-4 md:px-8 py-20">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 items-center">
        <div>
          <div className="sticker bg-primary text-primary-foreground mb-4 inline-flex">join the chaos</div>
          <h2 className="font-display font-bold text-5xl md:text-6xl mb-4 leading-none">
            sign up in <br />
            <span className="bg-secondary border-2 border-foreground brutal px-3 inline-block rotate-1">30 seconds.</span>
          </h2>
          <p className="font-body font-medium text-muted-foreground text-lg mb-6">
            Tell us your vibe, we'll match you with the right energy. No long forms, no boring questions.
          </p>
          <ul className="space-y-3 font-body font-semibold">
            {["Verified humans only — no bots", "Inclusive gender & pronoun options", "Block, report & moderation 24/7"].map((f) => (
              <li key={f} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-secondary border-2 border-foreground flex items-center justify-center brutal-sm">
                  <Check className="w-4 h-4" strokeWidth={4} />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="glass brutal-lg rounded-3xl p-6 md:p-8 -rotate-1">
          <div className="font-display font-bold text-xl mb-4">i identify as...</div>
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

          <div className="font-display font-bold text-xl mb-4">my vibe is... <span className="text-sm font-body text-muted-foreground">(pick a few)</span></div>
          <div className="flex flex-wrap gap-2 mb-6">
            {interests.map((i) => (
              <button
                key={i}
                onClick={() => toggle(i)}
                className={`brutal-sm border-2 border-foreground rounded-xl px-3 py-2 font-display font-bold text-sm transition-colors ${
                  picked.includes(i) ? "bg-accent text-accent-foreground" : "bg-card hover:bg-highlight"
                }`}
              >
                {i}
              </button>
            ))}
          </div>

          <button className="brutal-hover w-full bg-foreground text-background border-2 border-foreground rounded-2xl py-4 font-display font-bold text-lg flex items-center justify-center gap-2">
            Let's go <ArrowRight className="w-5 h-5" strokeWidth={3} />
          </button>
        </div>
      </div>
    </section>
  );
};
