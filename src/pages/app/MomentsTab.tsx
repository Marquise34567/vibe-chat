import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, Heart, Eye, Sparkles, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/glass";
import { gradientFor, initialFor } from "@/lib/config";
import { getMoments, type Moment, type Profile } from "@/lib/supabaseQueries";
import { countryByCode } from "@/lib/countries";

type MomentWithUser = Moment & { user?: Profile };

const MomentsTab = () => {
  const navigate = useNavigate();
  const [viewing, setViewing] = useState<number | null>(null);
  const [moments, setMoments] = useState<MomentWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMoments(50)
      .then((m) => { setMoments(m); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Group by user (story rings)
  const byUser = moments.reduce<Record<string, MomentWithUser[]>>((acc, m) => {
    (acc[m.user_id] ??= []).push(m);
    return acc;
  }, {});
  const usersWithMoments = Object.keys(byUser);

  return (
    <div className="min-h-screen px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="pt-2 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Moments</h1>
            <p className="text-muted-foreground text-sm">Short videos from the community</p>
          </div>
          <button className="btn-circle btn-circle-sm bg-primary text-primary-foreground" aria-label="Add moment">
            <Plus className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Story rings */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">From your connects</div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
            {/* Add your own */}
            <button className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
                <Plus className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <span className="text-xs font-medium">Add</span>
            </button>
            {usersWithMoments.map((uid) => {
              const u = byUser[uid][0]?.user;
              if (!u) return null;
              return (
                <button
                  key={uid}
                  onClick={() => {
                    const firstIdx = moments.findIndex((m) => m.user_id === uid);
                    if (firstIdx >= 0) setViewing(firstIdx);
                  }}
                  className="flex flex-col items-center gap-1 shrink-0"
                >
                  <div className="p-0.5 rounded-full bg-gradient-to-br from-primary via-secondary to-accent">
                    <div className="p-0.5 rounded-full bg-background">
                      <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${gradientFor(u.id)} flex items-center justify-center text-white text-lg font-bold overflow-hidden`}>
                        {u.avatar_url ? <img src={u.avatar_url} alt={u.display_name ?? ""} className="w-full h-full object-cover" /> : initialFor(u.display_name ?? "?")}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-medium truncate max-w-[64px]">{u.display_name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Feed grid */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">Discover</div>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : moments.length === 0 ? (
            <GlassCard className="p-10 text-center" interactive={false}>
              <div className="text-4xl mb-2">✨</div>
              <div className="font-semibold">No moments yet</div>
              <p className="text-sm text-muted-foreground mt-1">Be the first to share a moment!</p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {moments.map((m, i) => {
                const u = m.user;
                const grad = gradientFor(m.user_id);
                return (
                  <button
                    key={m.id}
                    onClick={() => setViewing(i)}
                    className="relative aspect-[9/14] rounded-2xl overflow-hidden group"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${grad}`} />
                    {m.media_url && <img src={m.media_url} alt={m.caption ?? ""} className="absolute inset-0 w-full h-full object-cover" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white text-xs font-bold ring-2 ring-white/30 overflow-hidden`}>
                        {u?.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : initialFor(u?.display_name ?? "?")}
                      </div>
                      <span className="text-white text-xs font-semibold drop-shadow">{u?.display_name ?? "Unknown"}</span>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 text-white">
                      {m.caption && <p className="text-xs font-medium line-clamp-2 drop-shadow">{m.caption}</p>}
                      <div className="flex items-center gap-2 mt-1 text-[10px] opacity-90">
                        <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" strokeWidth={2.5} /> {m.views ?? 0}</span>
                        <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" strokeWidth={2.5} /> {Math.floor((m.views ?? 0) * 0.12)}</span>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-white" strokeWidth={2.5} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Full-screen viewer */}
      {viewing !== null && moments.length > 0 && (
        <MomentViewer
          moments={moments}
          start={viewing}
          onClose={() => setViewing(null)}
          onProfile={(uid) => navigate(`/chat/${uid}`)}
        />
      )}
    </div>
  );
};

const MomentViewer = ({
  moments, start, onClose, onProfile,
}: {
  moments: MomentWithUser[];
  start: number;
  onClose: () => void;
  onProfile: (uid: string) => void;
}) => {
  const [idx, setIdx] = useState(start);
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const m = moments[idx];
  const u = m?.user;
  const c = u ? countryByCode(u.country) : null;
  const duration = m?.duration_sec ?? 15;
  const grad = gradientFor(m?.user_id ?? "x");

  useEffect(() => {
    setProgress(0);
    if (timer.current) clearInterval(timer.current);
    const step = 100 / (duration * 20);
    timer.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          if (idx < moments.length - 1) setIdx((i) => i + 1);
          else onClose();
          return 0;
        }
        return p + step;
      });
    }, 50);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [idx, duration, moments.length, onClose]);

  if (!m) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center animate-fade-in">
      <div className={`absolute inset-0 bg-gradient-to-br ${grad}`} />
      {m.media_url && <img src={m.media_url} alt={m.caption ?? ""} className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-black/20" />

      {/* progress bars */}
      <div className="absolute top-0 inset-x-0 p-3 flex gap-1 z-10">
        {moments.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
            <div
              className="h-full bg-white transition-[width] duration-75 ease-linear"
              style={{ width: i < idx ? "100%" : i === idx ? `${progress}%` : "0%" }}
            />
          </div>
        ))}
      </div>

      {/* top bar */}
      <div className="absolute top-6 inset-x-0 px-4 flex items-center justify-between z-10 pt-2">
        <button onClick={() => u && onProfile(u.id)} className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold ring-2 ring-white/40 overflow-hidden`}>
            {u?.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : initialFor(u?.display_name ?? "?")}
          </div>
          <div className="text-left text-white">
            <div className="font-semibold text-sm drop-shadow flex items-center gap-1">
              {u?.display_name ?? "Unknown"} {c?.flag}
              {u?.is_scholar && <span>🎓</span>}
            </div>
            <div className="text-[11px] opacity-80 drop-shadow">{u?.mood}</div>
          </div>
        </button>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-black/30 backdrop-blur flex items-center justify-center text-white">
          <X className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </div>

      {/* caption */}
      <div className="absolute bottom-24 inset-x-0 px-6 z-10">
        {m.caption && <p className="text-white text-lg font-medium drop-shadow-lg">{m.caption}</p>}
        <div className="flex items-center gap-4 mt-3 text-white text-sm">
          <button className="flex items-center gap-1.5 hover:scale-110 transition-transform">
            <Heart className="w-6 h-6" strokeWidth={2.5} /> {Math.floor((m.views ?? 0) * 0.12)}
          </button>
          <span className="flex items-center gap-1.5 opacity-80"><Eye className="w-5 h-5" strokeWidth={2.5} /> {m.views ?? 0}</span>
        </div>
      </div>

      {/* tap zones */}
      <button
        className="absolute left-0 top-0 bottom-0 w-1/3 z-[5]"
        onClick={() => idx > 0 && setIdx(idx - 1)}
        aria-label="Previous"
      />
      <button
        className="absolute right-0 top-0 bottom-0 w-1/3 z-[5]"
        onClick={() => idx < moments.length - 1 ? setIdx(idx + 1) : onClose()}
        aria-label="Next"
      />
    </div>
  );
};

export default MomentsTab;
