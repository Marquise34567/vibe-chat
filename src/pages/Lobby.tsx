import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Video, Search, Users, Shuffle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePresence } from "@/hooks/usePresence";
import { Navbar } from "@/components/Navbar";
import { COUNTRIES, countryByCode } from "@/lib/countries";
import { toast } from "sonner";

const GENDERS = ["Any", "Woman", "Man", "Non-binary", "Trans", "Genderfluid"];
const INTERESTS = ["Music 🎵", "Gaming 🎮", "Art 🎨", "Sports ⚽", "Anime ✨", "Travel ✈️", "Foodie 🍜", "Memes 💀"];

type LobbyUser = {
  id: string;
  display_name: string | null;
  gender: string | null;
  country: string | null;
  interests: string[] | null;
  avatar_url: string | null;
  last_seen_at: string;
  subscription_tier: "free" | "plus" | "vip";
};

const ONLINE_WINDOW_MS = 2 * 60 * 1000; // active in last 2 min

const Lobby = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  usePresence();

  const [users, setUsers] = useState<LobbyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Multi-select filters, hydrated from URL
  const [countries, setCountries] = useState<string[]>(
    () => searchParams.get("countries")?.split(",").filter(Boolean) ?? []
  );
  const [gender, setGender] = useState<string>(
    () => searchParams.get("gender") ?? "Any"
  );
  const [interests, setInterests] = useState<string[]>(
    () => searchParams.get("interests")?.split(",").filter(Boolean) ?? []
  );

  // Sync filter state -> URL
  useEffect(() => {
    const next = new URLSearchParams();
    if (countries.length) next.set("countries", countries.join(","));
    if (gender !== "Any") next.set("gender", gender);
    if (interests.length) next.set("interests", interests.join(","));
    setSearchParams(next, { replace: true });
  }, [countries, gender, interests, setSearchParams]);

  const fetchUsers = async () => {
    const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, gender, country, interests, avatar_url, last_seen_at, subscription_tier")
      .gte("last_seen_at", since)
      .order("last_seen_at", { ascending: false })
      .limit(100);

    if (error) {
      toast.error("Could not load lobby");
      return;
    }
    setUsers((data ?? []) as LobbyUser[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
    const i = setInterval(fetchUsers, 20_000);
    return () => clearInterval(i);
  }, []);

  const filtered = useMemo(() => {
    return users
      .filter((u) => u.id !== user?.id)
      .filter((u) => (countries.length ? (u.country ? countries.includes(u.country) : false) : true))
      .filter((u) => (gender !== "Any" ? u.gender === gender : true))
      .filter((u) =>
        interests.length
          ? (u.interests ?? []).some((i) => interests.includes(i))
          : true
      )
      .filter((u) =>
        search.trim()
          ? (u.display_name ?? "").toLowerCase().includes(search.toLowerCase())
          : true
      );
  }, [users, user, countries, gender, interests, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, LobbyUser[]>();
    for (const u of filtered) {
      const key = u.country ?? "??";
      const arr = map.get(key) ?? [];
      arr.push(u);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const countryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of users) {
      if (u.id === user?.id || !u.country) continue;
      map.set(u.country, (map.get(u.country) ?? 0) + 1);
    }
    return map;
  }, [users, user]);

  const startChat = (otherId: string) => {
    navigate(`/chat/${otherId}`);
  };

  const shuffleMatch = () => {
    if (filtered.length === 0) {
      toast("Nobody online matching your filters yet 😢");
      return;
    }
    const random = filtered[Math.floor(Math.random() * filtered.length)];
    startChat(random.id);
  };

  // If arrived with ?random=1, auto-trigger once after first load
  const autoRanRef = useRef(false);
  useEffect(() => {
    if (autoRanRef.current || loading) return;
    if (searchParams.get("random") === "1") {
      autoRanRef.current = true;
      shuffleMatch();
      const next = new URLSearchParams(searchParams);
      next.delete("random");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const toggleCountry = (code: string) =>
    setCountries((p) => (p.includes(code) ? p.filter((c) => c !== code) : [...p, code]));
  const toggleInterest = (i: string) =>
    setInterests((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  const clearFilters = () => {
    setCountries([]);
    setGender("Any");
    setInterests([]);
  };

  const activeCount = countries.length + (gender !== "Any" ? 1 : 0) + interests.length;

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="sticker bg-secondary mb-3 inline-flex">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse mr-2" />
              live lobby
            </div>
            <h1 className="font-display font-bold text-5xl md:text-6xl leading-none">
              who's <span className="bg-primary text-primary-foreground border-2 border-foreground brutal px-3 inline-block -rotate-2">vibing</span> rn?
            </h1>
            <p className="font-body font-medium text-muted-foreground mt-3">
              {users.length} people active in the last 2 min
            </p>
          </div>

          <button
            onClick={shuffleMatch}
            className="brutal-hover bg-foreground text-background border-2 border-foreground rounded-2xl px-6 py-4 font-display font-bold text-lg flex items-center gap-2 self-start"
          >
            <Shuffle className="w-5 h-5" strokeWidth={3} /> Random match
          </button>
        </div>

        {/* Filters */}
        <div className="glass brutal rounded-2xl p-4 mb-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="font-display font-bold text-sm">
              filters {activeCount > 0 && <span className="ml-1 sticker bg-primary text-primary-foreground text-xs">{activeCount} active</span>}
            </div>
            {activeCount > 0 && (
              <button
                onClick={clearFilters}
                className="font-display font-bold text-xs flex items-center gap-1 hover:underline"
              >
                <X className="w-3 h-3" strokeWidth={3} /> clear all
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" strokeWidth={3} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search by name..."
              className="brutal-input pl-9"
            />
          </div>

          {/* Countries (multi-select) */}
          <div>
            <div className="font-display font-bold text-xs uppercase tracking-wide mb-2 text-muted-foreground">🌍 Countries</div>
            <div className="flex flex-wrap gap-2">
              {COUNTRIES.map((c) => {
                const count = countryCounts.get(c.code) ?? 0;
                const active = countries.includes(c.code);
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
                    <span className="opacity-70">·{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gender */}
          <div>
            <div className="font-display font-bold text-xs uppercase tracking-wide mb-2 text-muted-foreground">👤 Gender</div>
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

          {/* Interests */}
          <div>
            <div className="font-display font-bold text-xs uppercase tracking-wide mb-2 text-muted-foreground">⚡ Interests</div>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => {
                const active = interests.includes(i);
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
        </div>

        {/* Body */}
        {loading ? (
          <div className="text-center py-20 font-display font-bold text-2xl animate-pulse">
            loading vibes...
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass brutal rounded-3xl p-12 text-center">
            <div className="text-6xl mb-4">😴</div>
            <h3 className="font-display font-bold text-2xl mb-2">crickets...</h3>
            <p className="font-body text-muted-foreground mb-4">
              No one online matching your filters right now.
            </p>
            {activeCount > 0 && (
              <button
                onClick={clearFilters}
                className="brutal-hover bg-foreground text-background border-2 border-foreground rounded-xl px-4 py-2 font-display font-bold text-sm"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([code, list]) => {
              const c = countryByCode(code);
              return (
                <section key={code}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{c?.flag ?? "🌍"}</span>
                    <h2 className="font-display font-bold text-2xl">{c?.name ?? "Other"}</h2>
                    <span className="sticker bg-highlight text-xs">
                      <Users className="w-3 h-3 mr-1 inline" strokeWidth={3} />
                      {list.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {list.map((u) => (
                      <UserCard key={u.id} user={u} onChat={() => startChat(u.id)} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const COLORS = ["bg-primary", "bg-accent", "bg-secondary", "bg-highlight"];

const UserCard = ({ user, onChat }: { user: LobbyUser; onChat: () => void }) => {
  const c = countryByCode(user.country);
  const colorIdx = (user.id.charCodeAt(0) + user.id.charCodeAt(1)) % COLORS.length;
  const bg = COLORS[colorIdx];
  const initial = (user.display_name ?? "?").charAt(0).toUpperCase();
  const isVip = user.subscription_tier === "vip";

  return (
    <button
      onClick={onChat}
      className="text-left group brutal-hover border-2 border-foreground rounded-2xl overflow-hidden bg-card"
    >
      <div className={`${bg} aspect-[4/3] relative border-b-2 border-foreground flex items-center justify-center overflow-hidden`}>
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.display_name ?? "user"}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="font-display font-bold text-6xl text-foreground/80">{initial}</span>
        )}
        <div className="absolute top-2 left-2 sticker bg-destructive text-destructive-foreground text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-background mr-1 animate-pulse" />
          LIVE
        </div>
        {c && <div className="absolute top-2 right-2 text-2xl">{c.flag}</div>}
        {isVip && (
          <div className="absolute bottom-2 right-2 sticker bg-foreground text-background text-xs">
            👑 VIP
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="font-display font-bold truncate">{user.display_name ?? "Anonymous"}</div>
        <div className="text-xs text-muted-foreground font-semibold truncate">
          {user.gender ?? "—"}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs font-body text-muted-foreground truncate">
            {user.interests?.[0] ?? ""}
          </span>
          <span className="bg-primary text-primary-foreground border-2 border-foreground rounded-lg px-2 py-1 font-display font-bold text-xs flex items-center gap-1 group-hover:scale-110 transition-transform">
            <Video className="w-3 h-3" strokeWidth={3} /> chat
          </span>
        </div>
      </div>
    </button>
  );
};

export default Lobby;
