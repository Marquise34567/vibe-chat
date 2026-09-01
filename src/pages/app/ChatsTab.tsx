import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Video, MessageCircle, Users, Search, Sparkles, Loader2 } from "lucide-react";
import { GlassCard, GlassSegmented } from "@/components/glass";
import { useAuth } from "@/contexts/AuthContext";
import { gradientFor, initialFor } from "@/lib/config";
import { getThreads, getRecentConnects, type Profile, type ChatThread } from "@/lib/supabaseQueries";
import { countryByCode } from "@/lib/countries";
import { TIER_FEATURES, Tier } from "@/lib/tiers";

type Filter = "all" | "video" | "text" | "group";

const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

type ThreadWithOther = ChatThread & { other?: Profile };

const ChatsTab = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [threads, setThreads] = useState<ThreadWithOther[]>([]);
  const [recents, setRecents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      getThreads(user.id),
      getRecentConnects(user.id),
    ]).then(([t, r]) => {
      setThreads(t);
      setRecents(r);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  const filteredThreads = threads
    .filter((t) => (filter === "all" ? true : t.kind === filter))
    .filter((t) => {
      const name = t.other?.display_name ?? "";
      return search.trim() ? name.toLowerCase().includes(search.toLowerCase()) : true;
    });

  const totalUnread = threads.reduce((a, t) => {
    const isUserA = t.user_a === user?.id;
    return a + (isUserA ? (t.unread_a ?? 0) : (t.unread_b ?? 0));
  }, 0);

  return (
    <div className="min-h-screen px-4 pt-6">
      <div className="max-w-md mx-auto space-y-5">
        {/* Header */}
        <div className="pt-2 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Chats</h1>
            <p className="text-muted-foreground text-sm">{totalUnread} unread</p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="btn-circle btn-circle-sm bg-primary text-primary-foreground"
            aria-label="New video chat"
          >
            <Video className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
            className="input-glass pl-11"
          />
        </div>

        {/* Recent connects */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">Recent connects</div>
          {loading ? (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-16 h-16 rounded-full bg-muted animate-pulse shrink-0" />
              ))}
            </div>
          ) : recents.length === 0 ? (
            <p className="text-sm text-muted-foreground px-1">No recent connects yet. Start matching!</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {recents.map((u) => (
                <button
                  key={u.id}
                  onClick={() => navigate(`/chat/${u.id}`)}
                  className="flex flex-col items-center gap-1 shrink-0"
                >
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradientFor(u.id)} flex items-center justify-center text-white text-xl font-bold ring-2 ring-background overflow-hidden`}>
                      {u.avatar_url ? <img src={u.avatar_url} alt={u.display_name ?? ""} className="w-full h-full object-cover" /> : initialFor(u.display_name ?? "?")}
                    </div>
                    <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background" />
                  </div>
                  <span className="text-xs font-medium truncate max-w-[64px]">{u.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter */}
        <GlassSegmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "video", label: "Video", icon: <Video className="w-3.5 h-3.5" strokeWidth={2.5} /> },
            { value: "text", label: "Text", icon: <MessageCircle className="w-3.5 h-3.5" strokeWidth={2.5} /> },
            { value: "group", label: "Group", icon: <Users className="w-3.5 h-3.5" strokeWidth={2.5} /> },
          ]}
        />

        {/* Threads */}
        <div className="space-y-2.5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <GlassCard className="p-10 text-center" interactive={false}>
              <div className="text-4xl mb-2">💬</div>
              <div className="font-semibold">No conversations yet</div>
              <p className="text-sm text-muted-foreground mt-1">Start a match to begin chatting.</p>
              <button onClick={() => navigate("/")} className="btn-primary mt-4 text-sm py-2 px-4">
                Start matching
              </button>
            </GlassCard>
          ) : (
            filteredThreads.map((t) => {
              const u = t.other;
              if (!u) return null;
              const c = countryByCode(u.country);
              const KindIcon = t.kind === "video" ? Video : t.kind === "group" ? Users : MessageCircle;
              const isUserA = t.user_a === user?.id;
              const unread = isUserA ? (t.unread_a ?? 0) : (t.unread_b ?? 0);
              return (
                <button
                  key={t.id}
                  onClick={() => navigate(`/chat/${u.id}?mode=${t.kind === "group" ? "group" : "solo"}`)}
                  className="w-full text-left"
                >
                  <GlassCard className="p-3.5 flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradientFor(u.id)} flex items-center justify-center text-white font-bold shrink-0 overflow-hidden`}>
                      {u.avatar_url ? <img src={u.avatar_url} alt={u.display_name ?? ""} className="w-full h-full object-cover" /> : initialFor(u.display_name ?? "?")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold truncate">{u.display_name}</span>
                        {u.is_scholar && <span className="text-xs">🎓</span>}
                        {c && <span className="text-sm">{c.flag}</span>}
                        {TIER_FEATURES[u.subscription_tier as Tier].badge && (
                          <span className="text-[10px]">{TIER_FEATURES[u.subscription_tier as Tier].badge}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
                        <KindIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
                        <span className="truncate">{t.last_message ?? "Start chatting"}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground">{relativeTime(t.last_at)}</span>
                      {unread > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">
                          {unread}
                        </span>
                      )}
                    </div>
                  </GlassCard>
                </button>
              );
            })
          )}
        </div>

        {/* Moments teaser */}
        <GlassCard className="p-4 flex items-center gap-3" interactive={false}>
          <span className="w-10 h-10 rounded-2xl bg-secondary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-secondary" strokeWidth={2.5} />
          </span>
          <div className="flex-1">
            <div className="font-semibold text-sm">New moments from your connects</div>
            <div className="text-xs text-muted-foreground">See what they're up to.</div>
          </div>
          <button onClick={() => navigate("/moments")} className="btn-glass text-sm py-2 px-4">
            View
          </button>
        </GlassCard>

        <div className="text-center text-xs text-muted-foreground pt-2">
          Signed in as {user?.email}
        </div>
      </div>
    </div>
  );
};

export default ChatsTab;
