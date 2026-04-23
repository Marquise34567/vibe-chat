import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Video, Mic, Globe, User, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { COUNTRIES, countryByCode } from "@/lib/countries";
import { toast } from "sonner";

const GENDERS = ["Woman", "Man", "Non-binary", "Trans", "Genderfluid", "Prefer not to say"];
const VIBES = ["Chill 😌", "Hype 🔥", "Flirty 😏", "Deep 🧠", "Funny 😂", "Curious 🤔"];

type Profile = {
  id: string;
  display_name: string | null;
  country: string | null;
  gender: string | null;
  avatar_url: string | null;
};

const PreRoom = () => {
  const { otherId } = useParams<{ otherId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();

  const [other, setOther] = useState<Profile | null>(null);
  const [country, setCountry] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [vibe, setVibe] = useState<string>("Chill 😌");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: me }, { data: them }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, country, gender, avatar_url")
          .eq("id", user.id)
          .maybeSingle(),
        otherId
          ? supabase
              .from("profiles")
              .select("id, display_name, country, gender, avatar_url")
              .eq("id", otherId)
              .maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      if (me) {
        setCountry(me.country ?? "");
        setGender(me.gender ?? "");
      }
      if (them) setOther(them as Profile);
      setLoading(false);
    };
    load();
  }, [user, otherId]);

  const join = async () => {
    if (!user) return;
    if (!country || !gender) {
      toast.error("Pick a country and gender first");
      return;
    }
    // Persist confirmed setup to profile
    await supabase
      .from("profiles")
      .update({ country, gender })
      .eq("id", user.id);

    if (otherId) {
      navigate(`/chat/${otherId}?vibe=${encodeURIComponent(vibe)}`);
    } else {
      // No specific target — head to queue with the chosen filters
      const sp = new URLSearchParams(params);
      sp.set("vibe", vibe);
      navigate(`/queue?${sp.toString()}`);
    }
  };

  const otherCountry = countryByCode(other?.country);

  return (
    <div className="min-h-screen px-4 md:px-8 py-6">
      <button
        onClick={() => navigate(-1)}
        className="font-display font-bold text-sm flex items-center gap-1 mb-4 hover:underline"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={3} /> back
      </button>

      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="sticker bg-accent text-accent-foreground mb-3 inline-flex">
            <Sparkles className="w-4 h-4 mr-1" strokeWidth={3} /> pre-room check
          </div>
          <h1 className="font-display font-bold text-4xl md:text-5xl leading-none">
            ready to <span className="bg-primary text-primary-foreground border-2 border-foreground brutal px-2 inline-block -rotate-2">vibe?</span>
          </h1>
          {other && (
            <p className="font-body font-medium text-muted-foreground mt-3">
              joining {other.display_name ?? "someone"} {otherCountry?.flag ?? ""}
            </p>
          )}
        </div>

        <div className="glass brutal-lg rounded-3xl p-5 md:p-7 space-y-6">
          {/* Camera preview */}
          <div className="bg-accent aspect-video rounded-2xl border-2 border-foreground brutal-sm relative overflow-hidden flex items-center justify-center">
            <span className="font-display font-bold text-2xl text-accent-foreground text-center px-4">
              {camOn ? "📹 camera preview" : "📷 cam off"}
            </span>
            <div className="absolute bottom-3 left-3 flex gap-2">
              <button
                onClick={() => setMicOn((v) => !v)}
                className={`w-10 h-10 rounded-xl border-2 border-foreground brutal-sm flex items-center justify-center font-bold ${
                  micOn ? "bg-primary text-primary-foreground" : "bg-card"
                }`}
                aria-label="Toggle mic"
              >
                <Mic className="w-4 h-4" strokeWidth={3} />
              </button>
              <button
                onClick={() => setCamOn((v) => !v)}
                className={`w-10 h-10 rounded-xl border-2 border-foreground brutal-sm flex items-center justify-center font-bold ${
                  camOn ? "bg-primary text-primary-foreground" : "bg-card"
                }`}
                aria-label="Toggle cam"
              >
                <Video className="w-4 h-4" strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* Country */}
          <div>
            <h3 className="font-display font-bold text-sm uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
              <Globe className="w-4 h-4" strokeWidth={3} /> Country
            </h3>
            <div className="flex flex-wrap gap-2">
              {COUNTRIES.map((c) => {
                const active = country === c.code;
                return (
                  <button
                    key={c.code}
                    onClick={() => setCountry(c.code)}
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
            <h3 className="font-display font-bold text-sm uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
              <User className="w-4 h-4" strokeWidth={3} /> Gender
            </h3>
            <div className="flex flex-wrap gap-2">
              {GENDERS.map((g) => (
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
          </div>

          {/* Vibe */}
          <div>
            <h3 className="font-display font-bold text-sm uppercase tracking-wide text-muted-foreground mb-2">
              ⚡ Tonight's vibe
            </h3>
            <div className="flex flex-wrap gap-2">
              {VIBES.map((v) => (
                <button
                  key={v}
                  onClick={() => setVibe(v)}
                  className={`brutal-sm border-2 border-foreground rounded-xl px-3 py-2 font-display font-bold text-sm transition-colors ${
                    vibe === v ? "bg-secondary text-secondary-foreground" : "bg-card hover:bg-highlight"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={join}
            disabled={loading}
            className="brutal-hover w-full bg-foreground text-background border-2 border-foreground rounded-2xl py-4 font-display font-bold text-lg disabled:opacity-50"
          >
            {otherId ? "Join the room →" : "Find me a match →"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreRoom;
