import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Mic, Video, SkipForward, Heart, Flag, ArrowLeft, MicOff, VideoOff, Sparkles, Languages, Rewind, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { countryByCode } from "@/lib/countries";
import { useTier } from "@/hooks/useTier";
import { TIER_FEATURES, Tier } from "@/lib/tiers";
import { addRecentlySeen } from "@/lib/recentlySeen";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { toast } from "sonner";

type Profile = {
  id: string;
  display_name: string | null;
  gender: string | null;
  country: string | null;
  interests: string[] | null;
  avatar_url: string | null;
  subscription_tier: Tier;
};

const FAKE_CAPTIONS = [
  "Hey! Where are you from?",
  "I love your energy ✨",
  "What kind of music do you like?",
  "That's so cool, tell me more",
];

const ChatRoom = () => {
  const { otherId } = useParams<{ otherId: string }>();
  const navigate = useNavigate();
  const { features } = useTier();

  const [other, setOther] = useState<Profile | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [hdOn, setHdOn] = useState(false);
  const [translateOn, setTranslateOn] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);
  const lastSkippedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!otherId) return;
    supabase
      .from("profiles")
      .select("id, display_name, gender, country, interests, avatar_url, subscription_tier")
      .eq("id", otherId)
      .maybeSingle()
      .then(({ data }) => setOther(data as Profile | null));
  }, [otherId]);

  // Simulated translated captions
  useEffect(() => {
    if (!translateOn) {
      setCaption(null);
      return;
    }
    let i = 0;
    setCaption(FAKE_CAPTIONS[0]);
    const interval = setInterval(() => {
      i = (i + 1) % FAKE_CAPTIONS.length;
      setCaption(FAKE_CAPTIONS[i]);
    }, 4000);
    return () => clearInterval(interval);
  }, [translateOn]);

  const handleSkip = () => {
    if (otherId) {
      lastSkippedRef.current = otherId;
      addRecentlySeen(otherId);
    }
    navigate("/queue");
  };

  const handleRewind = () => {
    if (!features.rewindLastSkip) {
      toast.error("Rewind is a VIP feature. Upgrade to bring back your last skip!");
      return;
    }
    if (!lastSkippedRef.current) {
      toast("Nothing to rewind to yet 🤷");
      return;
    }
    navigate(`/chat/${lastSkippedRef.current}`);
  };

  const toggleHd = () => {
    if (!features.hdVideo) {
      toast.error("HD video is a VIP feature. Upgrade to crystal clarity!");
      return;
    }
    setHdOn((v) => !v);
    toast.success(hdOn ? "HD off" : "HD on 🎥");
  };

  const toggleTranslate = () => {
    if (!features.liveTranslate) {
      toast.error("Live captions are a VIP feature. Upgrade to break the language barrier!");
      return;
    }
    setTranslateOn((v) => !v);
  };

  const c = countryByCode(other?.country);
  const otherTier = other?.subscription_tier ?? "free";
  const otherBadge = TIER_FEATURES[otherTier].badge;
  const otherBadgeBg = TIER_FEATURES[otherTier].badgeBg;

  return (
    <div className="min-h-screen px-4 md:px-8 py-6">
      <button
        onClick={() => navigate("/lobby")}
        className="font-display font-bold text-sm flex items-center gap-1 mb-4 hover:underline"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={3} /> back to lobby
      </button>

      <div className="max-w-5xl mx-auto">
        <div className="glass brutal-lg rounded-3xl p-4 md:p-6">
          <div className="flex flex-col gap-4 mb-4">
            {/* Their tile (top) */}
            <div className="bg-primary aspect-video rounded-2xl border-2 border-foreground brutal relative overflow-hidden flex items-center justify-center">
              {other?.avatar_url ? (
                <img
                  src={other.avatar_url}
                  alt={other.display_name ?? ""}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <span className="font-display font-bold text-8xl text-foreground/80">
                  {(other?.display_name ?? "?").charAt(0).toUpperCase()}
                </span>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent pointer-events-none" />

              <div className="absolute top-3 left-3 flex gap-2">
                <span className="sticker bg-destructive text-destructive-foreground text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-background mr-1 animate-pulse" />
                  LIVE
                </span>
                {hdOn && <span className="sticker bg-highlight text-xs">HD</span>}
              </div>

              <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
                {c && <div className="text-3xl">{c.flag}</div>}
                {otherBadge && <span className={`sticker ${otherBadgeBg} text-xs`}>{otherBadge}</span>}
              </div>

              <div className="absolute bottom-3 left-3 right-3">
                {translateOn && caption && (
                  <div className="mb-2 inline-block glass-dark border-2 border-background rounded-xl px-3 py-2 max-w-full">
                    <div className="text-[10px] font-display font-bold opacity-70 flex items-center gap-1 mb-0.5">
                      <Languages className="w-3 h-3" strokeWidth={3} /> live caption
                    </div>
                    <div className="text-sm font-body font-medium">{caption}</div>
                  </div>
                )}
                <div className="text-background">
                  <div className="font-display font-bold text-2xl">{other?.display_name ?? "..."}</div>
                  <div className="text-sm font-semibold opacity-80">{other?.gender ?? ""}</div>
                </div>
              </div>
            </div>

            {/* Your tile (bottom) */}
            <div className="bg-accent aspect-video rounded-2xl border-2 border-foreground brutal relative overflow-hidden flex items-center justify-center">
              <span className="font-display font-bold text-3xl text-accent-foreground text-center px-4">
                {camOff ? "📷 cam off" : "📹 your camera"}
              </span>
              <div className="absolute bottom-3 left-3 sticker text-xs">you</div>
            </div>
          </div>

          {/* Controls */}
          <div className="glass-dark rounded-2xl p-3 flex flex-wrap items-center justify-center gap-2 md:gap-3">
            <CtrlBtn onClick={() => setMuted((m) => !m)} active={muted} label="Mute">
              {muted ? <MicOff className="w-5 h-5" strokeWidth={3} /> : <Mic className="w-5 h-5" strokeWidth={3} />}
            </CtrlBtn>
            <CtrlBtn onClick={() => setCamOff((v) => !v)} active={camOff} label="Camera">
              {camOff ? <VideoOff className="w-5 h-5" strokeWidth={3} /> : <Video className="w-5 h-5" strokeWidth={3} />}
            </CtrlBtn>

            {/* VIP: HD video */}
            <CtrlBtn onClick={toggleHd} active={hdOn} locked={!features.hdVideo} label="HD">
              <Sparkles className="w-5 h-5" strokeWidth={3} />
            </CtrlBtn>

            {/* VIP: Translate */}
            <CtrlBtn onClick={toggleTranslate} active={translateOn} locked={!features.liveTranslate} label="Translate">
              <Languages className="w-5 h-5" strokeWidth={3} />
            </CtrlBtn>

            <CtrlBtn onClick={() => toast("added to favs ❤️")} primary label="Favorite">
              <Heart className="w-5 h-5" strokeWidth={3} />
            </CtrlBtn>

            {/* VIP: Rewind */}
            <CtrlBtn onClick={handleRewind} locked={!features.rewindLastSkip} label="Rewind">
              <Rewind className="w-5 h-5" strokeWidth={3} />
            </CtrlBtn>

            <CtrlBtn onClick={handleSkip} label="Skip">
              <SkipForward className="w-5 h-5" strokeWidth={3} />
            </CtrlBtn>
            <CtrlBtn onClick={() => toast("reported. thanks for keeping FaceFrenzy safe.")} label="Report">
              <Flag className="w-5 h-5" strokeWidth={3} />
            </CtrlBtn>
          </div>

          {/* Upsell row for free users */}
          {(!features.hdVideo || !features.liveTranslate || !features.rewindLastSkip) && (
            <div className="mt-4">
              <UpgradePrompt
                feature="Unlock HD video, live captions & rewind with VIP"
                requiredTier="vip"
              />
            </div>
          )}

          <div className="mt-4 text-center text-sm font-body text-muted-foreground">
            🎥 Real video streaming needs LiveKit or Agora — wire one up next!
          </div>
        </div>
      </div>
    </div>
  );
};

const CtrlBtn = ({
  onClick,
  children,
  primary,
  active,
  locked,
  label,
}: {
  onClick: () => void;
  children: React.ReactNode;
  primary?: boolean;
  active?: boolean;
  locked?: boolean;
  label?: string;
}) => (
  <button
    onClick={onClick}
    title={label}
    aria-label={label}
    className={`relative w-12 h-12 md:w-14 md:h-14 rounded-xl border-2 border-background flex items-center justify-center hover:scale-110 transition-transform ${
      active
        ? "bg-primary text-primary-foreground"
        : primary
        ? "bg-primary text-primary-foreground"
        : "bg-background text-foreground"
    } ${locked ? "opacity-60" : ""}`}
  >
    {children}
    {locked && (
      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-highlight border-2 border-foreground flex items-center justify-center">
        <Lock className="w-2.5 h-2.5" strokeWidth={4} />
      </span>
    )}
  </button>
);

export default ChatRoom;
