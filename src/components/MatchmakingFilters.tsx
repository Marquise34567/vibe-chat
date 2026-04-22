import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sliders, Shuffle, X } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";
import { useAuth } from "@/contexts/AuthContext";

const GENDERS = ["Any", "Woman", "Man", "Non-binary", "Trans", "Genderfluid"];
const INTERESTS = ["Music 🎵", "Gaming 🎮", "Art 🎨", "Sports ⚽", "Anime ✨", "Travel ✈️", "Foodie 🍜", "Memes 💀"];

const STORAGE_KEY = "vibez:filters";

type Filters = {
  countries: string[];
  gender: string;
  interests: string[];
};

const defaultFilters: Filters = { countries: [], gender: "Any", interests: [] };

export const MatchmakingFilters = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [f, setF] = useState<Filters>(defaultFilters);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setF({ ...defaultFilters, ...JSON.parse(saved) });
    } catch {}
  }, []);

  const update = (next: Filters) => {
    setF(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const toggleCountry = (code: string) => {
    update({
      ...f,
      countries: f.countries.includes(code)
        ? f.countries.filter((c) => c !== code)
        : [...f.countries, code],
    });
  };

  const toggleInterest = (i: string) => {
    update({
      ...f,
      interests: f.interests.includes(i)
        ? f.interests.filter((x) => x !== i)
        : [...f.interests, i],
    });
  };

  const clear = () => update(defaultFilters);

  const goToLobby = (random = false) => {
    const params = new URLSearchParams();
    if (f.countries.length) params.set("countries", f.countries.join(","));
    if (f.gender && f.gender !== "Any") params.set("gender", f.gender);
    if (f.interests.length) params.set("interests", f.interests.join(","));
    if (random) params.set("random", "1");
    const qs = params.toString();
    navigate(user ? `/lobby${qs ? `?${qs}` : ""}` : "/auth");
  };

  const activeCount =
    f.countries.length + (f.gender !== "Any" ? 1 : 0) + f.interests.length;

  return (
    <section id="match" className="px-4 md:px-8 py-16">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="sticker bg-accent text-accent-foreground mb-3 inline-flex">
            <Sliders className="w-4 h-4 mr-1" strokeWidth={3} /> matchmaking
          </div>
          <h2 className="font-display font-bold text-5xl md:text-6xl leading-none">
            set your <span className="bg-primary text-primary-foreground border-2 border-foreground brutal px-3 inline-block -rotate-2">filters.</span>
          </h2>
          <p className="font-body font-medium text-muted-foreground mt-3 max-w-md mx-auto">
            Only match with the energy you want. Mix & match — your filters save automatically.
          </p>
        </div>

        <div className="glass brutal-lg rounded-3xl p-6 md:p-8 space-y-6">
          {/* Countries */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-xl">🌍 Countries</h3>
              <span className="text-xs font-body text-muted-foreground font-semibold">
                {f.countries.length === 0 ? "anywhere" : `${f.countries.length} picked`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {COUNTRIES.map((c) => {
                const active = f.countries.includes(c.code);
                return (
                  <button
                    key={c.code}
                    onClick={() => toggleCountry(c.code)}
                    className={`brutal-sm border-2 border-foreground rounded-full px-3 py-2 font-display font-bold text-sm flex items-center gap-1.5 transition-colors ${
                      active ? "bg-accent text-accent-foreground" : "bg-card hover:bg-highlight"
                    }`}
                  >
                    <span>{c.flag}</span>
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gender */}
          <div>
            <h3 className="font-display font-bold text-xl mb-3">👤 Gender</h3>
            <div className="flex flex-wrap gap-2">
              {GENDERS.map((g) => (
                <button
                  key={g}
                  onClick={() => update({ ...f, gender: g })}
                  className={`brutal-sm border-2 border-foreground rounded-full px-3 py-2 font-display font-bold text-sm transition-colors ${
                    f.gender === g ? "bg-primary text-primary-foreground" : "bg-card hover:bg-highlight"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-xl">⚡ Interests</h3>
              <span className="text-xs font-body text-muted-foreground font-semibold">
                {f.interests.length === 0 ? "any vibe" : `${f.interests.length} picked`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => {
                const active = f.interests.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => toggleInterest(i)}
                    className={`brutal-sm border-2 border-foreground rounded-xl px-3 py-2 font-display font-bold text-sm transition-colors ${
                      active ? "bg-secondary text-secondary-foreground" : "bg-card hover:bg-highlight"
                    }`}
                  >
                    {i}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t-2 border-foreground">
            <button
              onClick={() => goToLobby(false)}
              className="brutal-hover flex-1 bg-foreground text-background border-2 border-foreground rounded-2xl py-4 font-display font-bold text-lg flex items-center justify-center gap-2"
            >
              Browse lobby{activeCount > 0 && ` (${activeCount})`}
            </button>
            <button
              onClick={() => goToLobby(true)}
              className="brutal-hover bg-primary text-primary-foreground border-2 border-foreground rounded-2xl px-6 py-4 font-display font-bold text-lg flex items-center justify-center gap-2"
            >
              <Shuffle className="w-5 h-5" strokeWidth={3} /> Random match
            </button>
            {activeCount > 0 && (
              <button
                onClick={clear}
                className="brutal-hover bg-card border-2 border-foreground rounded-2xl px-4 py-4 font-display font-bold text-sm flex items-center justify-center gap-1"
                aria-label="Clear filters"
              >
                <X className="w-4 h-4" strokeWidth={3} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
