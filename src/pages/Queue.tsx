import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Radar, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { countryByCode } from "@/lib/countries";
import { toast } from "sonner";

const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const POLL_MS = 2500;
const TIPS = [
  "scanning the globe...",
  "matching vibes...",
  "warming up the camera...",
  "finding someone fun...",
  "almost there...",
];

const Queue = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();

  const countries = useMemo(
    () => params.get("countries")?.split(",").filter(Boolean) ?? [],
    [params]
  );
  const gender = params.get("gender") ?? "Any";
  const interests = useMemo(
    () => params.get("interests")?.split(",").filter(Boolean) ?? [],
    [params]
  );
  const vibe = params.get("vibe") ?? "";

  const [seconds, setSeconds] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);
  const cancelledRef = useRef(false);

  // Tick + cycle tips
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    const tip = setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), 2000);
    return () => {
      clearInterval(t);
      clearInterval(tip);
    };
  }, []);

  // Poll for a match
  useEffect(() => {
    if (!user) return;
    cancelledRef.current = false;

    const findMatch = async () => {
      const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
      let q = supabase
        .from("profiles")
        .select("id, gender, country, interests, last_seen_at")
        .gte("last_seen_at", since)
        .neq("id", user.id)
        .limit(50);

      if (countries.length) q = q.in("country", countries);
      if (gender !== "Any") q = q.eq("gender", gender);

      const { data, error } = await q;
      if (error || cancelledRef.current) return;

      let pool = data ?? [];
      if (interests.length) {
        pool = pool.filter((p) =>
          (p.interests ?? []).some((i: string) => interests.includes(i))
        );
      }
      if (pool.length === 0) return;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      navigate(`/chat/${pick.id}${vibe ? `?vibe=${encodeURIComponent(vibe)}` : ""}`, {
        replace: true,
      });
    };

    // Try immediately, then poll
    findMatch();
    const i = setInterval(findMatch, POLL_MS);
    return () => {
      cancelledRef.current = true;
      clearInterval(i);
    };
  }, [user, countries, gender, interests, vibe, navigate]);

  const cancel = () => {
    toast("Match search cancelled");
    navigate("/lobby");
  };

  const filterCount =
    countries.length + (gender !== "Any" ? 1 : 0) + interests.length;

  return (
    <div className="min-h-screen px-4 md:px-8 py-6">
      <button
        onClick={() => navigate(-1)}
        className="font-display font-bold text-sm flex items-center gap-1 mb-4 hover:underline"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={3} /> back
      </button>

      <div className="max-w-md mx-auto">
        <div className="glass brutal-lg rounded-3xl p-8 text-center space-y-6">
          <div className="sticker bg-destructive text-destructive-foreground mx-auto inline-flex">
            <span className="w-2 h-2 rounded-full bg-background mr-2 animate-pulse" />
            searching
          </div>

          {/* Radar */}
          <div className="relative mx-auto w-48 h-48 rounded-full border-2 border-foreground brutal bg-card flex items-center justify-center overflow-hidden">
            <div className="absolute inset-3 rounded-full border-2 border-foreground/30" />
            <div className="absolute inset-8 rounded-full border-2 border-foreground/30" />
            <div className="absolute inset-14 rounded-full border-2 border-foreground/30" />
            <div
              className="absolute inset-0 origin-center animate-spin"
              style={{ animationDuration: "2s" }}
            >
              <div className="absolute top-1/2 left-1/2 w-1/2 h-1 -translate-y-1/2 bg-gradient-to-r from-primary to-transparent" />
            </div>
            <Radar className="w-10 h-10 relative z-10" strokeWidth={3} />
          </div>

          <div>
            <h1 className="font-display font-bold text-3xl md:text-4xl leading-none mb-2">
              looking for <span className="bg-primary text-primary-foreground border-2 border-foreground brutal px-2 inline-block -rotate-2">your match</span>
            </h1>
            <p className="font-body font-medium text-muted-foreground animate-pulse">
              {TIPS[tipIdx]}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="border-2 border-foreground rounded-xl p-3 brutal-sm bg-card">
              <div className="font-display font-bold text-2xl">
                {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                {String(seconds % 60).padStart(2, "0")}
              </div>
              <div className="font-body text-xs text-muted-foreground">elapsed</div>
            </div>
            <div className="border-2 border-foreground rounded-xl p-3 brutal-sm bg-card">
              <div className="font-display font-bold text-2xl">{filterCount}</div>
              <div className="font-body text-xs text-muted-foreground">filters on</div>
            </div>
          </div>

          {/* Active filters chips */}
          {(countries.length > 0 || gender !== "Any" || vibe) && (
            <div className="flex flex-wrap justify-center gap-2">
              {countries.map((c) => {
                const cc = countryByCode(c);
                return (
                  <span
                    key={c}
                    className="sticker bg-accent text-accent-foreground text-xs"
                  >
                    {cc?.flag} {cc?.name}
                  </span>
                );
              })}
              {gender !== "Any" && (
                <span className="sticker bg-primary text-primary-foreground text-xs">
                  👤 {gender}
                </span>
              )}
              {vibe && <span className="sticker bg-secondary text-xs">⚡ {vibe}</span>}
            </div>
          )}

          <button
            onClick={cancel}
            className="brutal-hover w-full bg-card border-2 border-foreground rounded-2xl py-3 font-display font-bold flex items-center justify-center gap-1"
          >
            <X className="w-4 h-4" strokeWidth={3} /> cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default Queue;
