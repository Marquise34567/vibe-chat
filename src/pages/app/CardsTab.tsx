import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, X, Star, RotateCcw, Video, Globe, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/glass";
import { gradientFor } from "@/lib/config";
import { getDiscoveryProfiles, recordSwipe, checkMutualLike, type Profile } from "@/lib/supabaseQueries";
import { countryByCode } from "@/lib/countries";
import { TIER_FEATURES, Tier } from "@/lib/tiers";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const CardsTab = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deck, setDeck] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [exit, setExit] = useState<null | "left" | "right" | "up">(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  const loadDeck = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const profiles = await getDiscoveryProfiles(user.id, 20);
      setDeck(profiles);
    } catch {
      toast.error("Could not load cards");
    }
    setLoading(false);
  };

  useEffect(() => { loadDeck(); }, [user]);

  const top = deck[0];

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0 });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y });
  };
  const onPointerUp = () => {
    if (!drag) return;
    if (drag.x > 120) return swipe("right");
    if (drag.x < -120) return swipe("left");
    if (drag.y < -120) return swipe("up");
    setDrag(null);
    start.current = null;
  };

  const swipe = async (dir: "left" | "right" | "up") => {
    setExit(dir);
    if (!top || !user) { setTimeout(resetCardState, 260); return; }
    const action = dir === "left" ? "pass" : dir === "up" ? "super" : "like";
    await recordSwipe(user.id, top.id, action).catch(() => {});

    if (dir === "right") {
      toast.success(`Liked ${top.display_name} ❤️`);
      // Check for mutual like
      const mutual = await checkMutualLike(user.id, top.id).catch(() => false);
      if (mutual) toast.success(`🎉 It's a match with ${top.display_name}!`);
    }
    if (dir === "up") toast.success(`Super-liked ${top.display_name} ⭐`);

    setTimeout(resetCardState, 260);
  };

  const resetCardState = () => {
    setDeck((d) => d.slice(1));
    setExit(null);
    setDrag(null);
    start.current = null;
  };

  const dx = drag?.x ?? 0;
  const dy = drag?.y ?? 0;
  const rot = dx / 18;
  const likeOpacity = Math.max(0, Math.min(1, dx / 120));
  const nopeOpacity = Math.max(0, Math.min(1, -dx / 120));
  const superOpacity = Math.max(0, Math.min(1, -dy / 120));

  return (
    <div className="min-h-screen px-4 pt-6">
      <div className="max-w-md mx-auto space-y-5">
        <div className="pt-2">
          <h1 className="text-3xl font-bold tracking-tight">Cards</h1>
          <p className="text-muted-foreground text-sm">Swipe to discover new connections</p>
        </div>

        {/* Deck */}
        <div className="relative h-[480px] select-none">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : deck.length === 0 ? (
            <GlassCard strong className="absolute inset-0 flex flex-col items-center justify-center text-center p-8" interactive={false}>
              <div className="text-5xl mb-3">🎉</div>
              <div className="font-bold text-lg">You're all caught up</div>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Come back later for fresh cards.</p>
              <button onClick={loadDeck} className="btn-glass text-sm py-2 px-4">
                <RotateCcw className="w-4 h-4" strokeWidth={2.5} /> Reshuffle
              </button>
            </GlassCard>
          ) : (
            deck.slice(0, 3).reverse().map((card, i) => {
              const isTop = i === deck.length - 1;
              const offset = (deck.length - 1 - i) * 8;
              return (
                <div
                  key={card.id}
                  className="absolute inset-0"
                  style={{
                    transform: isTop
                      ? exit
                        ? exit === "right" ? "translateX(140%) rotate(20deg)" : exit === "left" ? "translateX(-140%) rotate(-20deg)" : "translateY(-140%)"
                        : `translate(${dx}px, ${dy}px) rotate(${rot}deg) translateY(${offset}px)`
                      : `translateY(${offset}px) scale(${1 - offset * 0.002})`,
                    transition: drag || exit ? "none" : "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                    zIndex: isTop ? 30 : 20 - i,
                    opacity: i < deck.length - 3 ? 0 : 1,
                  }}
                  onPointerDown={isTop && !exit ? onPointerDown : undefined}
                  onPointerMove={isTop && drag ? onPointerMove : undefined}
                  onPointerUp={isTop && drag ? onPointerUp : undefined}
                >
                  <CardFace card={card} likeOpacity={isTop ? likeOpacity : 0} nopeOpacity={isTop ? nopeOpacity : 0} superOpacity={isTop ? superOpacity : 0} />
                </div>
              );
            })
          )}
        </div>

        {/* Action buttons */}
        {deck.length > 0 && !loading && (
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => swipe("left")} className="btn-circle btn-circle-lg bg-card" aria-label="Pass">
              <X className="w-7 h-7 text-destructive" strokeWidth={2.5} />
            </button>
            <button onClick={() => swipe("up")} className="btn-circle bg-card" aria-label="Super like">
              <Star className="w-6 h-6 text-highlight" strokeWidth={2.5} />
            </button>
            <button onClick={() => top && navigate(`/chat/${top.id}`)} className="btn-circle btn-circle-lg bg-primary text-primary-foreground" aria-label="Video chat">
              <Video className="w-6 h-6" strokeWidth={2.5} />
            </button>
            <button onClick={() => swipe("right")} className="btn-circle btn-circle-lg bg-card" aria-label="Like">
              <Heart className="w-7 h-7 text-primary" strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const CardFace = ({
  card, likeOpacity, nopeOpacity, superOpacity,
}: {
  card: Profile;
  likeOpacity: number;
  nopeOpacity: number;
  superOpacity: number;
}) => {
  const c = countryByCode(card.country);
  const tierBadge = TIER_FEATURES[card.subscription_tier as Tier].badge;
  const grad = gradientFor(card.id);
  return (
    <GlassCard strong className="h-full overflow-hidden p-0" interactive={false}>
      <div className={`relative h-full bg-gradient-to-br ${grad} flex flex-col`}>
        {card.avatar_url && <img src={card.avatar_url} alt={card.display_name ?? ""} className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />

        {/* stamp overlays */}
        <div className="absolute top-8 left-6 -rotate-12 border-4 border-emerald-400 text-emerald-400 px-4 py-1.5 text-2xl font-bold rounded-xl" style={{ opacity: likeOpacity }}>
          LIKE
        </div>
        <div className="absolute top-8 right-6 rotate-12 border-4 border-rose-500 text-rose-500 px-4 py-1.5 text-2xl font-bold rounded-xl" style={{ opacity: nopeOpacity }}>
          NOPE
        </div>
        <div className="absolute top-10 left-1/2 -translate-x-1/2 -rotate-6 border-4 border-amber-400 text-amber-400 px-4 py-1.5 text-xl font-bold rounded-xl" style={{ opacity: superOpacity }}>
          SUPER
        </div>

        {/* top row */}
        <div className="relative p-4 flex items-center justify-between">
          <div className="flex gap-1.5">
            {tierBadge && <span className="badge badge-gold">{tierBadge}</span>}
            {card.is_scholar && <span className="badge bg-emerald-500/30 text-emerald-300 border-emerald-400/30">🎓</span>}
          </div>
          {c && (
            <span className="badge bg-black/30 text-white border-white/20 backdrop-blur">
              <Globe className="w-3 h-3" strokeWidth={2.5} /> {c.flag} {c.name}
            </span>
          )}
        </div>

        {/* avatar */}
        <div className="relative flex-1 flex items-center justify-center">
          {!card.avatar_url && (
            <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-5xl font-bold ring-4 ring-white/30">
              {(card.display_name ?? "?").charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* info */}
        <div className="relative p-5 text-white">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{card.display_name ?? "Anonymous"}</h2>
            {card.age && <span className="text-lg opacity-90">{card.age}</span>}
          </div>
          <div className="text-sm opacity-90 mb-2">
            {card.mood ?? ""}{card.mood && card.gender ? " · " : ""}{card.gender ?? ""}
          </div>
          {card.bio && <p className="text-sm opacity-95 line-clamp-2 mb-3">{card.bio}</p>}
          {card.interests && card.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {card.interests.map((i) => (
                <span key={i} className="text-xs font-semibold bg-white/20 backdrop-blur rounded-full px-2.5 py-1">{i}</span>
              ))}
            </div>
          )}
          {card.university && (
            <div className="text-xs opacity-80 mt-2">🎓 {card.university}</div>
          )}
        </div>
      </div>
    </GlassCard>
  );
};

export default CardsTab;
