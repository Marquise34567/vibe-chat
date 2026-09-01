import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { countryByCode } from "@/lib/countries";
import { useTier } from "@/hooks/useTier";
import { useCoins } from "@/hooks/useCoins";
import { useContentModeration } from "@/hooks/useContentModeration";
import { useMatchConnectionContext } from "@/contexts/MatchConnectionContext";
import { TIER_FEATURES, Tier } from "@/lib/tiers";
import { addRecentlySeen } from "@/lib/recentlySeen";
import { gradientFor, initialFor, GIFTS } from "@/lib/config";
import { sendGift as sendGiftDb } from "@/lib/supabaseQueries";
import { SOCIAL_PLATFORMS, formatSocialUrl } from "@/lib/socialLinks";
import { GlassCard, GlassCircleButton, GlassSheet } from "@/components/glass";
import { GamePicker } from "@/components/games/GamePicker";
import { AttentionCheck } from "@/components/AttentionCheck";
import { useAttentionTracking } from "@/hooks/useAttentionTracking";
import { toast } from "sonner";
import {
  MicIcon as Mic, MicOffIcon as MicOff, CameraIcon as Video, CameraOffIcon as VideoOff,
  SkipIcon as SkipForward, HeartIcon as Heart, FlagIcon as Flag, ExitIcon as ArrowLeft,
  SparkleIcon as Sparkles, TranslateIcon as Languages, RewindIcon as Rewind, LockIcon as Lock,
  GiftIcon as Gift, GamepadIcon as Gamepad2, CoinsIcon as Coins, CloseIcon as X,
  EyeOffIcon as EyeOff, UsersIcon as Users, PlusIcon as Plus,
} from "@/components/FaceFrenzyIcons";

type Profile = {
  id: string;
  display_name: string | null;
  gender: string | null;
  country: string | null;
  interests: string[] | null;
  avatar_url: string | null;
  subscription_tier: Tier;
  age: number | null;
  bio: string | null;
  mood: string | null;
  is_scholar: boolean | null;
  university: string | null;
  socials: Record<string, string> | null;
};

type Mode = "solo" | "group" | "blind";

const MATCH_SECONDS = 15;
const EXTEND_SECONDS = 120; // 2 minutes when both users agree to extend
const BLIND_REVEAL_SECONDS = 30;

const ChatRoom = () => {
  const { otherId } = useParams<{ otherId: string }>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = (params.get("mode") as Mode) ?? "solo";
  const { features } = useTier();
  const { coins, spend } = useCoins();
  // Local + remote video refs come from the shared match connection
  // (lives in MatchConnectionProvider so WebRTC survives navigation).
  // The camera stream is started once in the context — no duplicate getUserMedia.
  const { remoteVideoRef, localVideoRef: pipVideoRef, localStreamRef, state: connState, skip: connSkip, disconnect: connDisconnect, extendRequestFrom, extendAccepted: connExtendAccepted, requestExtend, acceptExtend, declineExtend, peerId: connPeerId, peerCountry: connPeerCountry, peerName: connPeerName } = useMatchConnectionContext();
  const [pipActive, setPipActive] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);

  // Poll to detect when streams get attached to video elements
  useEffect(() => {
    const check = () => {
      setPipActive(!!(pipVideoRef.current?.srcObject));
      setHasRemoteVideo(!!(remoteVideoRef.current?.srcObject));
    };
    check();
    const interval = setInterval(check, 300);
    return () => clearInterval(interval);
  }, [pipVideoRef, remoteVideoRef]);

  const pipStatus = pipActive ? "active" : "requesting";

  // The peer's profile. The match server relays the peer's chosen display
  // name + country. No fake name/socials/age/etc.
  const other: Profile | null = (connPeerCountry || connPeerName)
    ? {
        id: otherId ?? connPeerId ?? "peer",
        display_name: connPeerName,
        gender: null,
        country: connPeerCountry,
        interests: null,
        avatar_url: null,
        subscription_tier: "free",
        age: null,
        bio: null,
        mood: null,
        is_scholar: null,
        university: null,
        socials: null,
      }
    : null;

  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [hdOn, setHdOn] = useState(false);
  const [translateOn, setTranslateOn] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(MATCH_SECONDS);
  const [extended, setExtended] = useState(false);
  const [extendRequested, setExtendRequested] = useState(false);
  const [lastSkipped, setLastSkipped] = useState<string | null>(null);
  const [showGifts, setShowGifts] = useState(false);
  const [showSocials, setShowSocials] = useState(false);
  const [showGames, setShowGames] = useState(false);
  const [skipping, setSkipping] = useState(false); // transition state before returning to matching
  const lastSkippedRef = useRef<string | null>(null);

  // Blind date state
  const isBlind = mode === "blind";
  const [blindRevealed, setBlindRevealed] = useState(false);
  const [blindCountdown, setBlindCountdown] = useState(BLIND_REVEAL_SECONDS);
  const [balloonPopped, setBalloonPopped] = useState(false);

  // Attention tracking — reuses the pip webcam's video element so we
  // don't open a second getUserMedia stream that would kill the first.
  const [showAttentionCheck, setShowAttentionCheck] = useState(false);
  const { state: attentionState, startCamera, hasCamera, cameraDenied, canvasRef, resetActivity } = useAttentionTracking({
    enabled: !isBlind || blindRevealed, // only after blind reveal
    onAway: () => setShowAttentionCheck(true),
    externalVideoRef: pipVideoRef,
  });

  // ── Content moderation — scans both local and remote video for NSFW ──
  const { startScanning: startLocalScan, stopScanning: stopLocalScan, reportViolation } = useContentModeration({ intervalMs: 3000 });
  const { startScanning: startRemoteScan, stopScanning: stopRemoteScan } = useContentModeration({ intervalMs: 4000 });
  const [moderationWarning, setModerationWarning] = useState<string | null>(null);

  // Start scanning local video (your own feed) — prevents YOU from showing NSFW
  useEffect(() => {
    if (pipStatus !== "active" || camOff) return;
    if (isBlind && !blindRevealed) return;

    startLocalScan(pipVideoRef, "local", (report) => {
      console.warn("[moderation] Local violation:", report);
      // Auto-turn off camera + warn
      setCamOff(true);
      setModerationWarning(`Content detected on your camera (${report.class}). Camera disabled.`);
      // Report to server so it counts as a violation
      reportViolation(null, report, undefined);
      // Clear warning after 5s
      setTimeout(() => setModerationWarning(null), 5000);
    });

    return () => stopLocalScan();
  }, [pipStatus, camOff, isBlind, blindRevealed, startLocalScan, stopLocalScan, reportViolation]);

  // Start scanning remote video (partner's feed) — protects you from seeing NSFW
  useEffect(() => {
    if (!hasRemoteVideo) return;
    if (isBlind && !blindRevealed) return;

    startRemoteScan(remoteVideoRef, "remote", (report) => {
      console.warn("[moderation] Remote violation:", report);
      // Auto-skip the partner + report them
      setModerationWarning(`Content detected on partner's camera. Skipping…`);
      reportViolation(null, { ...report, source: "remote" }, otherId ?? undefined);
      // Auto-skip after brief delay
      setTimeout(() => handleSkip(true), 800);
      setTimeout(() => setModerationWarning(null), 3000);
    });

    return () => stopRemoteScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRemoteVideo, isBlind, blindRevealed, otherId]);

  // Camera is already started by the shared match connection context
  // (startCamera was called in Match.tsx or when the connection was established).
  // No need to call getUserMedia again here — that would create a second stream
  // and conflict with the WebRTC tracks.

  // Start camera for attention tracking
  useEffect(() => {
    if (!isBlind || blindRevealed) {
      startCamera();
    }
  }, [isBlind, blindRevealed, startCamera]);

  // 15-second countdown (skip for blind-before-reveal)
  useEffect(() => {
    if (isBlind && !blindRevealed) return; // blind has its own timer
    if (extended) return;
    if (remaining <= 0) {
      handleSkip(true);
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, extended, mode, blindRevealed, isBlind]);

  // Blind date countdown — audio only, then reveal
  useEffect(() => {
    if (!isBlind || blindRevealed) return;
    if (blindCountdown <= 0) {
      setBlindRevealed(true);
      toast.success("🎈 Balloon popped! Cameras revealed!");
      setBalloonPopped(true);
      return;
    }
    const t = setTimeout(() => setBlindCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [blindCountdown, blindRevealed, isBlind]);

  // Live translate captions — only shown when a real remote stream is present.
  // (No fake caption cycling — caption stays null until real captions exist.)
  useEffect(() => {
    if (!translateOn || !hasRemoteVideo) { setCaption(null); return; }
    // TODO: wire real caption source (e.g. WebRTC datachannel or transcription API)
    setCaption(null);
  }, [translateOn, hasRemoteVideo]);

  const handleSkip = (auto = false) => {
    if (skipping) return; // prevent double-skip during delay
    if (otherId) { lastSkippedRef.current = otherId; setLastSkipped(otherId); addRecentlySeen(otherId); }
    if (auto) toast("Time's up — finding someone new…");
    // Tell the match server to skip and search for a new real peer
    connSkip();
    // Show a brief transition overlay, then navigate to matching
    setSkipping(true);
    setTimeout(() => {
      navigate("/match?mode=" + mode, { replace: true });
    }, 1200);
  };

  const handleExtend = () => {
    if (extendRequested) return; // already requested
    setExtendRequested(true);
    requestExtend();
    toast("Extend requested — waiting for their answer…");
  };

  // ── Partner accepted the extend request ──
  useEffect(() => {
    if (connExtendAccepted && !extended) {
      setExtended(true);
      setExtendRequested(false);
      setRemaining(EXTEND_SECONDS);
      toast.success("Chat extended! 2 minutes added 🎉");
    }
  }, [connExtendAccepted, extended]);

  // ── Partner declined the extend request ──
  useEffect(() => {
    if (extendRequested && extendRequestFrom === null && !connExtendAccepted && !extended) {
      // Only show decline if we had requested and got no acceptance
      // (extendRequestFrom is null when declined, but also initially — guard with extendRequested)
    }
  }, [extendRequestFrom, extendRequested, connExtendAccepted, extended]);

  // ── Partner sent us an extend request — show the prompt ──
  // (extendRequestFrom is set by the hook when partner sends extend-request)

  // ── Partner left/skipped — transition back to matching with a delay ──
  useEffect(() => {
    if (connState === "disconnected" && !skipping) {
      toast("Your partner left — finding someone new…");
      setSkipping(true);
      const t = setTimeout(() => {
        navigate("/match?mode=" + mode, { replace: true });
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [connState, skipping, mode, navigate]);

  const handleRewind = () => {
    if (!features.rewindLastSkip) { toast.error("Rewind is a VIP feature."); return; }
    if (!lastSkippedRef.current) { toast("Nothing to rewind to 🤷"); return; }
    navigate(`/chat/${lastSkippedRef.current}?mode=${mode}`);
  };

  const toggleHd = () => {
    if (!features.hdVideo) { toast.error("HD video is a VIP feature."); return; }
    setHdOn((v) => !v);
    toast.success(hdOn ? "HD off" : "HD on 🎥");
  };
  const toggleTranslate = () => {
    if (!features.liveTranslate) { toast.error("Live captions are a VIP feature."); return; }
    setTranslateOn((v) => !v);
  };

  const handleSendGift = async (g: typeof GIFTS[number]) => {
    const ok = await spend(g.cost);
    if (ok) {
      if (otherId) await sendGiftDb("me", otherId, g.id, g.cost);
      toast.success(`Sent ${g.emoji} ${g.name}!`);
      setShowGifts(false);
    } else {
      toast.error("Not enough coins.");
      setShowGifts(false);
    }
  };

  const handleExit = () => {
    connDisconnect();
    navigate("/");
  };

  const c = countryByCode(other?.country);
  const otherTier = other?.subscription_tier ?? "free";
  const otherBadge = TIER_FEATURES[otherTier].badge;
  const isGroup = mode === "group";
  const otherSocials = other?.socials ?? {};

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0B0B14", color: "#fff" }}>
      {/* Hidden canvas for attention tracking (reads frames from the pip webcam video) */}
      <canvas ref={canvasRef} width={160} height={120} className="hidden" />

      {/* Top bar */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <button onClick={handleExit} className="text-sm font-semibold flex items-center gap-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          <ArrowLeft className="w-4 h-4" strokeWidth={2.5} /> Exit
        </button>
        <div className="flex items-center gap-2">
          <span className="badge badge-live"><span className="live-dot" /> LIVE</span>
          {hdOn && <span className="badge badge-gold">HD</span>}
          {isGroup && <span className="badge"><Users className="w-3 h-3" strokeWidth={2.5} /> Group</span>}
          {isBlind && !blindRevealed && <span className="badge badge-gold"><EyeOff className="w-3 h-3" strokeWidth={2.5} /> Blind</span>}
          {attentionState === "idle" && <span className="badge bg-amber-500/20 text-amber-600">idle</span>}
          {attentionState === "away" && <span className="badge bg-rose-500/20 text-rose-600">away</span>}
        </div>
      </div>

      {/* Video stage — tile layout depends on participant count */}
      <div className="flex-1 px-4 pb-4 flex flex-col gap-3">

        {/* ── Games overlay — replaces video, only when pressed ── */}
        {showGames ? (
          <div className="flex-1 flex flex-col animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white">Games</h3>
              <button
                onClick={() => setShowGames(false)}
                className="glass-pill px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2.5} /> Back to chat
              </button>
            </div>
            <div className="flex-1">
              <GamePicker />
            </div>
          </div>
        ) : (
        /* ── Normal video view ── */
        <>
          {/* Blind date: audio-only mode */}
          {isBlind && !blindRevealed ? (
            <div className="relative flex-1 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-fuchsia-900 to-rose-900" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <div className={`text-8xl mb-4 transition-all duration-500 ${balloonPopped ? "scale-0 opacity-0" : "animate-float"}`}>
                  🎈
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Blind Date</h2>
                <p className="text-white/80 mb-4">Audio only — get to know them first!</p>
                <div className="glass-pill px-6 py-3 mb-4">
                  <span className="text-3xl font-bold tabular-nums text-white">{blindCountdown}</span>
                  <span className="text-sm text-white/70 ml-2">sec until reveal</span>
                </div>
                <div className="flex items-end gap-1 h-12">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className="w-1.5 bg-white/60 rounded-full animate-wave" style={{ animationDelay: `${i * 0.1}s`, height: "100%" }} />
                  ))}
                </div>
                <p className="text-white/60 text-xs mt-4">Cameras reveal when the balloon pops 🎉</p>
              </div>
            </div>
          ) : (
            /* ── Tile layout based on participant count ── */
            <VideoTileLayout
              mode={mode}
              groupSize={parseInt(params.get("groupSize") ?? "2", 10) || 2}
              other={other}
              otherId={otherId}
              camOff={camOff}
              pipVideoRef={pipVideoRef}
              pipStatus={pipStatus}
              remoteVideoRef={remoteVideoRef}
              c={c}
              otherBadge={otherBadge}
              otherSocials={otherSocials}
              translateOn={translateOn}
              caption={caption}
              onSocials={() => setShowSocials(true)}
            />
          )}

          {/* Timer — below the video tiles */}
          {(
            <div className="flex items-center justify-center">
              <div className="glass-pill px-4 py-2 flex items-center gap-2">
                {extended ? (
                  <span className="text-sm font-bold text-emerald-500 flex items-center gap-1">
                    <Heart className="w-4 h-4" strokeWidth={2.5} /> Extended
                  </span>
                ) : (
                  <>
                    <span className="text-2xl font-bold tabular-nums text-white">{remaining}</span>
                    <span className="text-xs text-white/50">sec</span>
                    {!extendRequested && (
                      <button onClick={handleExtend} className="ml-1 chip chip-selected text-xs py-1 px-2.5">
                        <Plus className="w-3 h-3" strokeWidth={2.5} /> Extend
                      </button>
                    )}
                    {extendRequested && <span className="text-xs text-white/50 animate-pulse">waiting…</span>}
                  </>
                )}
              </div>
            </div>
          )}
        </>
        )}

        {/* Controls bar */}
        <GlassCard strong className="p-3 flex items-center justify-center gap-2 md:gap-3" interactive={false}>
          <GlassCircleButton onClick={() => setMuted((m) => !m)} active={muted} aria-label="Mic">
            {muted ? <MicOff className="w-5 h-5" strokeWidth={2.5} /> : <Mic className="w-5 h-5" strokeWidth={2.5} />}
          </GlassCircleButton>
          {(!isBlind || blindRevealed) && (
            <GlassCircleButton onClick={() => setCamOff((v) => !v)} active={camOff} aria-label="Camera">
              {camOff ? <VideoOff className="w-5 h-5" strokeWidth={2.5} /> : <Video className="w-5 h-5" strokeWidth={2.5} />}
            </GlassCircleButton>
          )}
          <GlassCircleButton onClick={toggleHd} active={hdOn} aria-label="HD">
            <Sparkles className="w-5 h-5" strokeWidth={2.5} />
            {!features.hdVideo && <Lock className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5" strokeWidth={3} />}
          </GlassCircleButton>
          {(!isBlind || blindRevealed) && (
            <GlassCircleButton onClick={toggleTranslate} active={translateOn} aria-label="Translate">
              <Languages className="w-5 h-5" strokeWidth={2.5} />
              {!features.liveTranslate && <Lock className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5" strokeWidth={3} />}
            </GlassCircleButton>
          )}
          <GlassCircleButton onClick={() => setShowGifts(true)} aria-label="Gift">
            <Gift className="w-5 h-5" strokeWidth={2.5} />
          </GlassCircleButton>
          <GlassCircleButton onClick={() => setShowGames((v) => !v)} active={showGames} aria-label="Games">
            <Gamepad2 className="w-5 h-5" strokeWidth={2.5} />
          </GlassCircleButton>
          <GlassCircleButton onClick={() => toast("Added to favorites ❤️")} className="bg-primary/15" aria-label="Favorite">
            <Heart className="w-5 h-5 text-primary" strokeWidth={2.5} />
          </GlassCircleButton>
          {(
            <GlassCircleButton onClick={handleRewind} aria-label="Rewind">
              <Rewind className="w-5 h-5" strokeWidth={2.5} />
              {!features.rewindLastSkip && <Lock className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5" strokeWidth={3} />}
            </GlassCircleButton>
          )}
          <GlassCircleButton onClick={() => handleSkip()} size="lg" className="bg-primary text-primary-foreground" aria-label="Skip">
            <SkipForward className="w-6 h-6" strokeWidth={2.5} />
          </GlassCircleButton>
          <GlassCircleButton onClick={() => toast("Reported. Thanks for keeping FaceFrenzy safe.")} aria-label="Report">
            <Flag className="w-5 h-5" strokeWidth={2.5} />
          </GlassCircleButton>
        </GlassCard>

        {cameraDenied && (
          <div className="text-center text-xs text-amber-500">Camera blocked — attention tracking using activity instead.</div>
        )}
      </div>

      {/* Gifts sheet */}
      <GlassSheet open={showGifts} onClose={() => setShowGifts(false)} title="Send a gift">
        <div className="flex items-center justify-center gap-2 mb-4 text-highlight font-bold">
          <Coins className="w-5 h-5" strokeWidth={2.5} /> {coins} coins
        </div>
        <div className="grid grid-cols-3 gap-3">
          {GIFTS.map((g) => {
            const afford = coins >= g.cost;
            return (
              <button key={g.id} onClick={() => handleSendGift(g)} disabled={!afford} className="text-center disabled:opacity-40">
                <GlassCard className="p-4 flex flex-col items-center gap-1">
                  <span className="text-4xl">{g.emoji}</span>
                  <span className="text-xs font-semibold">{g.name}</span>
                  <span className="text-xs text-highlight font-bold flex items-center gap-0.5">
                    <Coins className="w-3 h-3" strokeWidth={2.5} /> {g.cost}
                  </span>
                </GlassCard>
              </button>
            );
          })}
        </div>
      </GlassSheet>

      {/* Socials sheet */}
      <GlassSheet open={showSocials} onClose={() => setShowSocials(false)} title={`${other?.display_name ?? "User"}'s socials`}>
        <div className="space-y-3">
          {SOCIAL_PLATFORMS.filter((p) => otherSocials[p.id]).map((p) => {
            const handle = otherSocials[p.id];
            const url = formatSocialUrl(p, handle);
            return (
              <a key={p.id} href={url} target="_blank" rel="noopener noreferrer" className="block">
                <GlassCard className="p-4 flex items-center gap-3">
                  <span className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center text-lg shadow`}>
                    {p.icon}
                  </span>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{handle}</div>
                  </div>
                  <span className="text-xs text-primary font-semibold">Open →</span>
                </GlassCard>
              </a>
            );
          })}
          {other?.university && (
            <GlassCard className="p-4 flex items-center gap-3" interactive={false}>
              <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-lg shadow">🎓</span>
              <div>
                <div className="font-semibold text-sm">Scholar</div>
                <div className="text-xs text-muted-foreground">{other.university}</div>
              </div>
            </GlassCard>
          )}
        </div>
      </GlassSheet>

      {/* Attention check popup */}
      <AttentionCheck
        open={showAttentionCheck}
        onStillHere={() => { setShowAttentionCheck(false); resetActivity(); }}
        onSkip={() => { setShowAttentionCheck(false); handleSkip(true); }}
        onClose={() => { setShowAttentionCheck(false); resetActivity(); }}
      />

      {/* Moderation warning banner */}
      {moderationWarning && (
        <div style={{
          position: "fixed", top: "calc(env(safe-area-inset-top, 0px) + 70px)", left: "50%",
          transform: "translateX(-50%)", zIndex: 200,
          padding: "12px 20px", borderRadius: 16, maxWidth: "90vw",
          background: "rgba(220,38,38,0.9)", backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.15)",
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 8px 32px rgba(220,38,38,0.4)",
          animation: "ff-slide-up 0.3s ease",
        }}>
          <Flag className="w-4 h-4" style={{ color: "#fff", flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{moderationWarning}</span>
        </div>
      )}

      {/* ── Skip transition overlay — brief delay before returning to matching ── */}
      {skipping && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
          background: "rgba(5,5,8,0.85)", backdropFilter: "blur(12px)",
          animation: "ff-slide-up 0.3s ease",
        }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SkipForward style={{ width: 28, height: 28, color: "#FFD60A" }} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>Finding someone new…</span>
          <div style={{ width: 120, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
            <div style={{ width: "100%", height: "100%", background: "#FFD60A", animation: "ff-shimmer 1.2s ease-in-out" }} />
          </div>
        </div>
      )}

      {/* ── Extend request modal — partner wants to keep talking ── */}
      {extendRequestFrom && !skipping && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
          animation: "ff-slide-up 0.3s ease",
        }}>
          <div style={{
            width: "85%", maxWidth: 340, borderRadius: 24, padding: 28,
            background: "linear-gradient(160deg, #14142A 0%, #0A0A14 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center",
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 32,
              background: "linear-gradient(135deg, rgba(255,77,141,0.2), rgba(124,92,255,0.2))",
              border: "1px solid rgba(255,77,141,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "ff-core-pulse 1.5s ease-in-out infinite",
            }}>
              <Heart style={{ width: 28, height: 28, color: "#FF4D8D" }} />
            </div>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Extend the chat?</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
                Your partner wants to keep talking. Extend for 2 more minutes?
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <button onClick={declineExtend}
                style={{
                  flex: 1, height: 48, borderRadius: 24,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: 700, cursor: "pointer",
                  transition: "transform 0.15s ease",
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                No thanks
              </button>
              <button onClick={acceptExtend}
                style={{
                  flex: 1, height: 48, borderRadius: 24,
                  background: "linear-gradient(180deg, #FFE45E 0%, #F5D000 100%)",
                  color: "#0A0A0F", fontSize: 15, fontWeight: 800, border: "none", cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(245,208,0,0.3)",
                  transition: "transform 0.15s ease",
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                Let's talk!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatRoom;

/* ════════════════════════════════════════════════════════════════
   VideoTileLayout — picks the tile split based on participant count.

   2 people (solo):  perfect 50/50 left/right split
   3 people (duo):   side-by-side — stranger gets own 50% container (left),
                     you + friend side-by-side on the right (50%)
   4 people (group): 2v2 — 50/50 left/right split, each side stacked
                     top/bottom 50/50 (stranger + their friend | you + your friend)
   ════════════════════════════════════════════════════════════════ */

type TilePerson = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  isScholar?: boolean | null;
  university?: string | null;
  flag?: string;
  age?: number | null;
  mood?: string | null;
  badge?: string;
  socials?: Record<string, string>;
  isYou?: boolean;
  isFriend?: boolean;
};

type VideoTileLayoutProps = {
  mode: string;
  groupSize: number;
  other: Profile | null;
  otherId: string | undefined;
  camOff: boolean;
  pipVideoRef: React.RefObject<HTMLVideoElement>;
  pipStatus: string;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  c: ReturnType<typeof countryByCode>;
  otherBadge: string;
  otherSocials: Record<string, string>;
  translateOn: boolean;
  caption: string | null;
  onSocials: () => void;
};

const VideoTileLayout = ({
  mode, groupSize, other, otherId, camOff, pipVideoRef, pipStatus, remoteVideoRef,
  c, otherBadge, otherSocials, translateOn, caption, onSocials,
}: VideoTileLayoutProps) => {
  // Build the participant list based on mode
  const otherPerson: TilePerson = {
    id: otherId ?? "other",
    name: other?.display_name ?? "…",
    avatarUrl: other?.avatar_url,
    isScholar: other?.is_scholar,
    university: other?.university,
    flag: c?.flag,
    age: other?.age,
    mood: other?.mood,
    badge: otherBadge,
    socials: otherSocials,
  };
  const you: TilePerson = { id: "you", name: "You", isYou: true };

  // Group mode is dynamic: 2, 3, or 4 people. Solo is always 2. Blind is 2.
  const participantCount = mode === "group" ? Math.min(Math.max(groupSize, 2), 4) : 2;

  if (participantCount === 2) {
    // ── 2 people: perfect 50/50 vertical split ──
    return (
      <div className="relative flex-1 rounded-2xl overflow-hidden flex gap-0.5 items-stretch" style={{ background: "#111119" }}>
        {/* Left tile — other person (50%) */}
        <div style={{ width: "50%", position: "relative" }}>
          <VideoTile person={otherPerson} gradientSeed={otherId ?? "x"} remoteVideoRef={remoteVideoRef} translateOn={translateOn} caption={caption} onSocials={onSocials} />
        </div>
        {/* Right tile — you (50%) */}
        <div style={{ width: "50%", position: "relative" }}>
          <VideoTile person={you} camOff={camOff} pipVideoRef={pipVideoRef} pipStatus={pipStatus} />
        </div>
      </div>
    );
  }

  if (participantCount === 3) {
    // ── 3 people (group of 3): Stranger gets their own full-height
    //    container on the left. You + friend side-by-side on the right. ──
    return (
      <div className="relative flex-1 rounded-2xl overflow-hidden flex gap-0.5 items-stretch" style={{ background: "#111119" }}>
        {/* Left — 50%, stranger's own full container */}
        <div style={{ width: "50%", position: "relative" }}>
          <VideoTile person={otherPerson} gradientSeed={otherId ?? "x"} remoteVideoRef={remoteVideoRef} translateOn={translateOn} caption={caption} onSocials={onSocials} />
        </div>
        {/* Right — 50%, you + friend side by side */}
        <div style={{ width: "50%", display: "flex", gap: 2 }}>
          <div style={{ width: "50%", position: "relative" }}>
            <VideoTile person={you} camOff={camOff} pipVideoRef={pipVideoRef} pipStatus={pipStatus} />
          </div>
          <div style={{ width: "50%", position: "relative" }}>
            <VideoTile person={{ id: "friend", name: "Friend", isFriend: true }} gradientSeed="friend" />
          </div>
        </div>
      </div>
    );
  }

  // ── 4 people (group of 4): 2v2 — your team on one side, their team on the other.
  //    Each side 50/50, split top/bottom 50/50. ──
  return (
    <div className="relative flex-1 rounded-2xl overflow-hidden flex gap-0.5 items-stretch" style={{ background: "#111119" }}>
      {/* Left side — 50%, stranger's team: stranger (top) + their friend (bottom) */}
      <div style={{ width: "50%", display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ height: "50%", position: "relative" }}>
          <VideoTile person={otherPerson} gradientSeed={otherId ?? "x"} remoteVideoRef={remoteVideoRef} translateOn={translateOn} caption={caption} onSocials={onSocials} />
        </div>
        <div style={{ height: "50%", position: "relative" }}>
          <VideoTile person={{ id: "stranger-friend", name: "Their Friend", isFriend: true }} gradientSeed="stranger-friend" />
        </div>
      </div>
      {/* Right side — 50%, your team: you (top) + your friend (bottom) */}
      <div style={{ width: "50%", display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ height: "50%", position: "relative" }}>
          <VideoTile person={you} camOff={camOff} pipVideoRef={pipVideoRef} pipStatus={pipStatus} />
        </div>
        <div style={{ height: "50%", position: "relative" }}>
          <VideoTile person={{ id: "friend", name: "Friend", isFriend: true }} gradientSeed="friend" />
        </div>
      </div>
    </div>
  );
};

/* ── Single video tile ── */
const VideoTile = ({
  person,
  gradientSeed,
  camOff,
  pipVideoRef,
  pipStatus,
  remoteVideoRef,
  translateOn,
  caption,
  onSocials,
}: {
  person: TilePerson;
  gradientSeed?: string;
  camOff?: boolean;
  pipVideoRef?: React.RefObject<HTMLVideoElement>;
  pipStatus?: string;
  remoteVideoRef?: React.RefObject<HTMLVideoElement>;
  translateOn?: boolean;
  caption?: string | null;
  onSocials?: () => void;
}) => {
  const grad = gradientFor(gradientSeed ?? "x");
  const initial = initialFor(person.name ?? "?");
  const [hasRemote, setHasRemote] = useState(false);

  // Check if remote stream is attached
  useEffect(() => {
    if (!remoteVideoRef?.current) return;
    const check = () => setHasRemote(!!remoteVideoRef.current?.srcObject);
    check();
    const interval = setInterval(check, 500);
    return () => clearInterval(interval);
  }, [remoteVideoRef]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Background */}
      {person.isYou ? (
        camOff ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-accent to-secondary" />
            <div className="absolute inset-0 flex items-center justify-center text-white/90 text-sm font-semibold">📷 cam off</div>
          </>
        ) : (
          <>
            {/* Always mount the video so the ref is available when the
                stream resolves. Fallback overlay sits on top until active. */}
            <video
              ref={pipVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: "scaleX(-1)", objectPosition: "center top" }}
            />
            {pipStatus !== "active" && (
              <div className="absolute inset-0 bg-gradient-to-br from-accent to-secondary flex items-center justify-center">
                <span className="text-white/90 text-sm font-semibold">
                  Starting camera…
                </span>
              </div>
            )}
          </>
        )
      ) : (
        <>
          {/* Remote WebRTC video (real peer stream) — always mounted so ref is available.
              NOT muted so we can hear the peer's audio. */}
          {remoteVideoRef && (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={false}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: "center top" }}
            />
          )}
          {/* Fallback gradient + initial — shown when no remote stream */}
          {!hasRemote && (
            <>
              <div className={`absolute inset-0 bg-gradient-to-br ${grad}`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
              {person.avatarUrl && (
                <img src={person.avatarUrl} alt={person.name} className="absolute inset-0 w-full h-full object-cover" />
              )}
              {!person.avatarUrl && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white/90 text-5xl font-bold drop-shadow-lg">{initial}</span>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Live indicator — top left */}
      <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/50">
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />
        <span className="text-[8px] font-bold text-white uppercase">{person.isYou ? "You" : "Live"}</span>
      </div>

      {/* Socials button — top right (only for other person) */}
      {person.socials && typeof person.socials === "object" && Object.keys(person.socials).length > 0 && onSocials && (
        <button
          onClick={onSocials}
          className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-black/50 text-[9px] font-semibold text-white"
        >
          @
        </button>
      )}

      {/* Caption — below live indicator */}
      {translateOn && caption && !person.isYou && (
        <div className="absolute top-8 left-1.5 right-1.5">
          <div className="rounded-lg px-2 py-1" style={{ background: "rgba(0,0,0,0.6)" }}>
            <div className="text-[8px] font-semibold text-white/60 flex items-center gap-0.5 mb-0.5">
              <Languages className="w-2 h-2" strokeWidth={2.5} /> caption
            </div>
            <div className="text-[10px] font-medium text-white">{caption}</div>
          </div>
        </div>
      )}

      {/* Name pill — bottom */}
      <div className="absolute bottom-1.5 left-1.5 right-1.5">
        <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.5)" }}>
          <span className="font-semibold text-[11px] text-white truncate">{person.name}</span>
          {person.isScholar && <span className="text-[10px]" title={person.university ?? ""}>🎓</span>}
          {person.flag && <span className="text-[10px]">{person.flag}</span>}
          {person.age && <span className="text-[9px] text-white/50">{person.age}</span>}
        </div>
        {person.mood && (
          <div className="mt-0.5">
            <span className="text-[9px] text-white/60 px-2 py-0.5 rounded-full inline-block" style={{ background: "rgba(0,0,0,0.4)" }}>{person.mood}</span>
          </div>
        )}
      </div>

      {/* FaceFrenzy watermark — only on "you" tile, subtle */}
      {person.isYou && (
        <div className="absolute pointer-events-none select-none" style={{ bottom: 38, right: 6, opacity: 0.22 }}>
          <span className="ff-wordmark" style={{ fontSize: 9 }}>facefrenzy</span>
        </div>
      )}
    </div>
  );
};
