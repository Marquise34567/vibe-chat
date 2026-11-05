import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { usePostHog } from "posthog-js/react";
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
import { BUBBLE, chipStyle } from "@/lib/bubble";
import { matchesLeft } from "@/lib/limits";
import { loadSlider, loadAdsterra } from "@/lib/videoAd";
import { capturePostHogEvent } from "@/lib/posthogLogs";
import { PeerGames } from "@/components/games/PeerGames";
import { AttentionCheck } from "@/components/AttentionCheck";
import { useAttentionTracking } from "@/hooks/useAttentionTracking";

import { toast } from "sonner";
import {
  SkipIcon as SkipForward, HeartIcon as Heart, FlagIcon as Flag, ExitIcon as ArrowLeft,
  SparkleIcon as Sparkles, TranslateIcon as Languages, RewindIcon as Rewind, LockIcon as Lock,
  GiftIcon as Gift, CoinsIcon as Coins,
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

type Mode = "solo" | "group" | "blind" | "text";

const MATCH_SECONDS = 15;
const EXTEND_SECONDS = 120; // 2 minutes when both users agree to extend
const BLIND_REVEAL_SECONDS = 30;

const ChatRoom = () => {
  const { otherId } = useParams<{ otherId: string }>();
  const navigate = useNavigate();
  const posthog = usePostHog();
  const [params] = useSearchParams();
  const mode = (params.get("mode") as Mode) ?? "solo";
  const { features } = useTier();
  const { coins, spend } = useCoins();
  // Local + remote video refs come from the shared match connection
  // (lives in MatchConnectionProvider so WebRTC survives navigation).
  // The camera stream is started once in the context — no duplicate getUserMedia.
  const { remoteVideoRef, localVideoRef: pipVideoRef, localStreamRef, state: connState, skip: connSkip, disconnect: connDisconnect, extendRequestFrom, extendAccepted: connExtendAccepted, requestExtend, acceptExtend, declineExtend, peerId: connPeerId, peerCountry: connPeerCountry, peerName: connPeerName, peerAge: connPeerAge, sendPeerMessage, onPeerMessage, setHd } = useMatchConnectionContext();
  // Text mode — pure chat, zero permissions. Messages ride the peer
  // datachannel when it's up, else the match-server game-relay.
  const [msgs, setMsgs] = useState<{ me: boolean; text: string }[]>([]);
  const [draft, setDraft] = useState("");
  const msgsEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mode !== "text") return;
    return onPeerMessage((d: any) => {
      if (d?.type === "chat-text" && typeof d.text === "string") {
        setMsgs((m) => [...m, { me: false, text: d.text.slice(0, 500) }]);
      }
    });
  }, [mode, onPeerMessage]);
  useEffect(() => { msgsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  const [pipActive, setPipActive] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);

  // Poll to detect when streams get attached to video elements
  // Also force the remote video to stay unmuted so we can hear the peer
  useEffect(() => {
    const check = () => {
      setPipActive(!!(pipVideoRef.current?.srcObject));
      setHasRemoteVideo(!!(remoteVideoRef.current?.srcObject));
      // Force remote video unmuted + playing
      if (remoteVideoRef.current?.srcObject) {
        if (remoteVideoRef.current.muted) {
          remoteVideoRef.current.muted = false;
        }
        if (remoteVideoRef.current.paused) {
          remoteVideoRef.current.play().catch(() => {});
        }
      }
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
        age: connPeerAge,
        bio: null,
        mood: null,
        is_scholar: null,
        university: null,
        socials: null,
      }
    : null;

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
    loadSlider(); // skip = constant churn — HillTopAds slot
    if (skipping) return; // prevent double-skip during delay
    if (!auto) capturePostHogEvent(posthog, "chat_skipped", { match_mode: mode });
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
    loadSlider(); // wants to keep talking = peak engagement — slider slot
    setExtendRequested(true);
    requestExtend();
    toast("Extend requested — waiting for their answer…");
  };

  // ── Repeat matcher (≥2 free matches used today) — monetize engaged users ──
  useEffect(() => {
    if (matchesLeft() <= 8) loadAdsterra();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Partner accepted the extend request ──
  useEffect(() => {
    if (connExtendAccepted && !extended) {
      setExtended(true);
      setExtendRequested(false);
      setRemaining(EXTEND_SECONDS);
      capturePostHogEvent(posthog, "chat_extended", { match_mode: mode });
      toast.success("Chat extended! 2 minutes added 🎉");
    }
  }, [connExtendAccepted, extended, mode, posthog]);

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
    const next = !hdOn;
    setHdOn(next);
    void setHd(next); // real bitrate/fps upgrade on the outbound track
    toast.success(next ? "HD on 🎥" : "HD off");
  };
  const toggleTranslate = () => {
    if (!features.liveTranslate) { toast.error("Live captions are a VIP feature."); return; }
    setTranslateOn((v) => !v);
  };

  const handleSendGift = async (g: typeof GIFTS[number]) => {
    const ok = await spend(g.cost);
    if (ok) {
      if (otherId) await sendGiftDb("me", otherId, g.id, g.cost);
      capturePostHogEvent(posthog, "gift_sent", { gift_id: g.id, gift_cost: g.cost, match_mode: mode });
      toast.success(`Sent ${g.emoji} ${g.name}!`);
      setShowGifts(false);
    } else {
      toast.error("Not enough coins.");
      setShowGifts(false);
    }
  };

  const handleExit = () => {
    loadAdsterra(); // leaving = natural break — Adsterra slot
    connDisconnect();
    navigate("/");
  };

  const c = countryByCode(other?.country);
  const otherTier = other?.subscription_tier ?? "free";
  const otherBadge = TIER_FEATURES[otherTier].badge;
  const isGroup = mode === "group";
  const otherSocials = other?.socials ?? {};

  // ── Text mode — pure chat screen. No video, no camera, zero permissions. ──
  if (mode === "text") {
    const sendMsg = () => {
      const t = draft.trim().slice(0, 500);
      if (!t) return;
      sendPeerMessage({ type: "chat-text", text: t, t: Date.now() });
      setMsgs((m) => [...m, { me: true, text: t }]);
      setDraft("");
    };
    return (
      <div className="flex flex-col" style={{ height: "100dvh", background: BUBBLE.bg, color: BUBBLE.ink }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "calc(env(safe-area-inset-top, 0px) + 14px) 16px 12px", borderBottom: `1px solid ${BUBBLE.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>💬</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{connPeerName || "Stranger"}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: BUBBLE.sub }}>text chat · no camera</div>
            </div>
          </div>
          <button onClick={handleExit} className="bub-btn" style={{ width: 38, height: 38, borderRadius: "50%", border: `1px solid ${BUBBLE.border}`, background: BUBBLE.card, color: "#FF4D8D", fontSize: 16, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {msgs.length === 0 && (
            <div style={{ textAlign: "center", marginTop: 40, color: BUBBLE.sub }}>
              <div style={{ fontSize: 44, marginBottom: 10, animation: "ff-breathe 2.4s ease-in-out infinite" }}>💬</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Say hi — they're a real person!</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Be respectful — AI moderation is active.</div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.me ? "flex-end" : "flex-start",
              maxWidth: "78%",
              padding: "9px 14px",
              borderRadius: m.me ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: m.me ? BUBBLE.brand : BUBBLE.card,
              color: m.me ? "#fff" : BUBBLE.ink,
              border: m.me ? "none" : `1px solid ${BUBBLE.border}`,
              fontSize: 14, fontWeight: 600,
              animation: "ff-slide-up 0.25s ease",
            }}>{m.text}</div>
          ))}
          <div ref={msgsEndRef} />
        </div>

        {/* Input row */}
        <div style={{ padding: "10px 12px calc(env(safe-area-inset-bottom, 0px) + 12px)", borderTop: `1px solid ${BUBBLE.border}`, display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => { connSkip(); navigate("/match?mode=text", { replace: true }); }}
            className="bub-btn"
            style={{ height: 44, padding: "0 14px", borderRadius: 22, border: `1px solid ${BUBBLE.border}`, background: BUBBLE.card, fontSize: 13, fontWeight: 800, color: BUBBLE.sub, cursor: "pointer", whiteSpace: "nowrap" }}
          >⏭ Next</button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendMsg(); }}
            placeholder="Say something…"
            autoFocus
            maxLength={500}
            style={{ flex: 1, height: 44, borderRadius: 22, border: `1px solid ${BUBBLE.border}`, background: BUBBLE.card, padding: "0 16px", fontSize: 14, fontWeight: 600, color: BUBBLE.ink, outline: "none" }}
          />
          <button
            onClick={sendMsg}
            className="bub-btn bub-btn-primary"
            style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: BUBBLE.brand, color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >➤</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col relative overflow-hidden" style={{ height: "100dvh", background: BUBBLE.bg, color: BUBBLE.ink }}>
      {/* Hidden canvas for attention tracking (reads frames from the pip webcam video) */}
      <canvas ref={canvasRef} width={160} height={120} className="hidden" />

      {/* Top bar — Exit | countdown | status chips */}
      <div className="px-4 pb-2 flex items-center justify-between" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)", position: "relative", minHeight: 44 }}>
        <button
          onClick={handleExit}
          className="bub-btn text-sm font-semibold flex items-center gap-1.5"
          style={{ ...chipStyle, padding: "7px 14px", color: BUBBLE.ink }}
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2.5} /> Exit
        </button>

        {/* Center countdown — ome.tv-style clock at top center */}
        <div
          style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)",
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <div
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "7px 15px", borderRadius: 999,
              background: BUBBLE.card,
              border: `1px solid ${extended ? "rgba(34,197,94,0.4)" : BUBBLE.border}`,
              boxShadow: "inset 0 -2px 0 rgba(120,72,20,0.05), 0 2px 8px rgba(120,72,20,0.06)",
            }}
          >
            {extended ? (
              <span className="text-sm font-bold flex items-center gap-1" style={{ color: BUBBLE.green }}>
                <Heart className="w-4 h-4" strokeWidth={2.5} /> Extended
              </span>
            ) : (
              <span style={{ fontSize: 17, fontWeight: 900, color: remaining <= 5 ? "#FF5C5C" : BUBBLE.ink, fontVariantNumeric: "tabular-nums", letterSpacing: "0.5px" }}>
                {String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}
              </span>
            )}
          </div>
          {!extended && !extendRequested && !(isBlind && !blindRevealed) && (
            <button
              onClick={handleExtend}
              className="bub-btn"
              style={{
                padding: "7px 13px", borderRadius: 999,
                background: BUBBLE.brandSoft, border: "1px solid rgba(255,159,10,0.40)",
                color: BUBBLE.brand, fontSize: 11, fontWeight: 800, cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
              }}
            >
              <Plus className="w-3 h-3" strokeWidth={2.5} /> Extend
            </button>
          )}
          {extendRequested && !extended && (
            <span style={{ ...chipStyle, padding: "7px 12px", fontSize: 11, color: BUBBLE.faint }} className="animate-pulse">waiting…</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span style={{ ...chipStyle, gap: 6, padding: "5px 12px", fontSize: 11, color: "#FF5C5C", border: "1px solid rgba(255,92,92,0.30)", background: "rgba(255,92,92,0.10)" }}><span className="live-dot" /> LIVE</span>
          {hdOn && <span style={{ ...chipStyle, padding: "5px 12px", fontSize: 11, color: BUBBLE.brand, border: "1px solid rgba(255,159,10,0.35)", background: BUBBLE.brandSoft }}>HD</span>}
          {isGroup && <span style={{ ...chipStyle, gap: 5, padding: "5px 12px", fontSize: 11 }}><Users className="w-3 h-3" strokeWidth={2.5} /> Group</span>}
          {isBlind && !blindRevealed && <span style={{ ...chipStyle, gap: 5, padding: "5px 12px", fontSize: 11, color: BUBBLE.pink, border: "1px solid rgba(255,77,141,0.35)", background: "rgba(255,77,141,0.10)" }}><EyeOff className="w-3 h-3" strokeWidth={2.5} /> Blind</span>}
          {attentionState === "idle" && <span style={{ ...chipStyle, padding: "5px 12px", fontSize: 11, color: "#F5B400", border: "1px solid rgba(245,180,0,0.35)", background: "rgba(245,180,0,0.10)" }}>idle</span>}
          {attentionState === "away" && <span style={{ ...chipStyle, padding: "5px 12px", fontSize: 11, color: "#FF5C5C", border: "1px solid rgba(255,92,92,0.35)", background: "rgba(255,92,92,0.10)" }}>away</span>}
        </div>
      </div>

      {/* Video stage — tile layout depends on participant count.
          min-h-0 is required so flex children shrink instead of overflowing
          the fixed-height mobile viewport (100dvh). */}
      <div className="flex-1 min-h-0 px-4 flex flex-col gap-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)" }}>

        {/* Games overlay lives in <PeerGames/> (fixed position) — the video
            stage always stays mounted so streams never detach. */}
        <>
          {/* Blind date: audio-only mode */}
          {isBlind && !blindRevealed ? (
            <div className="relative flex-1 min-h-0 overflow-hidden" style={{ borderRadius: 24, border: `4px solid ${BUBBLE.card}`, boxShadow: BUBBLE.cardShadow }}>
              <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, #FFE8CC 0%, #FFE3EC 55%, #FFF0D6 100%)" }} />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <div className={`text-8xl mb-4 transition-all duration-500 ${balloonPopped ? "scale-0 opacity-0" : "animate-float"}`}>
                  🎈
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: BUBBLE.ink }}>Blind Date</h2>
                <p className="mb-4" style={{ color: BUBBLE.sub }}>Audio only — get to know them first!</p>
                <div style={{ ...chipStyle, padding: "12px 24px", marginBottom: 16 }}>
                  <span style={{ fontSize: 30, fontWeight: 900, color: BUBBLE.ink, fontVariantNumeric: "tabular-nums" }}>{blindCountdown}</span>
                  <span style={{ fontSize: 14, color: BUBBLE.sub, fontWeight: 700, marginLeft: 4 }}>sec until reveal</span>
                </div>
                <div className="flex items-end gap-1 h-12">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className="w-1.5 rounded-full animate-wave" style={{ animationDelay: `${i * 0.1}s`, height: "100%", background: "rgba(255,77,141,0.45)" }} />
                  ))}
                </div>
                <p className="text-xs mt-4" style={{ color: BUBBLE.faint }}>Cameras reveal when the balloon pops 🎉</p>
              </div>
            </div>
          ) : (
            /* ── Tile layout based on participant count ── */
            <div className="relative flex-1 min-h-0 flex flex-col md:px-4">
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
              {/* FaceFrenzy watermark — like Omegle's, bottom-right of video stage */}
              <div className="absolute bottom-2 right-2 pointer-events-none select-none z-10">
                <span
                  className="font-black tracking-tight text-white/70 text-sm md:text-base drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                  style={{
                    fontFamily: '"Baloo 2", "Nunito", system-ui, sans-serif',
                    letterSpacing: "-0.04em",
                    textShadow: "0 0 12px rgba(255,159,10,0.4)",
                  }}
                >
                  face<span className="text-white/50">frenzy</span>
                </span>
              </div>
            </div>
          )}

        </>

        {/* Controls bar — Games, Skip */}
        <div
          className="p-3 flex items-center justify-center gap-3 md:gap-4"
          style={{
            borderRadius: 28,
            background: BUBBLE.card,
            border: `1px solid ${BUBBLE.border}`,
            boxShadow: BUBBLE.cardShadow,
          }}
        >
          <PeerGames triggerStyle={callTriggerStyle} />
          <CallBtn onClick={() => handleSkip()} size="lg" primary aria-label="Next person">
            <span style={{ fontSize: 26, lineHeight: 1 }}>⏭️</span>
          </CallBtn>
        </div>

        {cameraDenied && (
          <div className="text-center text-xs text-amber-500">Camera blocked — attention tracking using activity instead.</div>
        )}
      </div>

      {/* Gifts sheet */}
      <BubbleSheet open={showGifts} onClose={() => setShowGifts(false)} title="Send a gift">
        <div className="flex items-center justify-center gap-2 mb-4 font-bold" style={{ color: "#D97706" }}>
          <Coins className="w-5 h-5" strokeWidth={2.5} /> {coins} coins
        </div>
        <div className="grid grid-cols-3 gap-3">
          {GIFTS.map((g) => {
            const afford = coins >= g.cost;
            return (
              <button key={g.id} onClick={() => handleSendGift(g)} disabled={!afford} className="text-center disabled:opacity-40">
                <div className="p-4 flex flex-col items-center gap-1" style={{ borderRadius: 18, background: "rgba(255,159,10,0.04)", border: `1px solid ${BUBBLE.border}` }}>
                  <span className="text-4xl">{g.emoji}</span>
                  <span className="text-xs font-bold" style={{ color: BUBBLE.ink }}>{g.name}</span>
                  <span className="text-xs font-bold flex items-center gap-0.5" style={{ color: BUBBLE.brand }}>
                    <Coins className="w-3 h-3" strokeWidth={2.5} /> {g.cost}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </BubbleSheet>

      {/* Socials sheet */}
      <BubbleSheet open={showSocials} onClose={() => setShowSocials(false)} title={`${other?.display_name ?? "User"}'s socials`}>
        <div className="space-y-3">
          {SOCIAL_PLATFORMS.filter((p) => otherSocials[p.id]).map((p) => {
            const handle = otherSocials[p.id];
            const url = formatSocialUrl(p, handle);
            return (
              <a key={p.id} href={url} target="_blank" rel="noopener noreferrer" className="block">
                <div className="p-4 flex items-center gap-3" style={{ borderRadius: 18, background: "rgba(255,159,10,0.04)", border: `1px solid ${BUBBLE.border}` }}>
                  <span className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center text-lg shadow`}>
                    {p.icon}
                  </span>
                  <div className="flex-1">
                    <div className="font-bold text-sm" style={{ color: BUBBLE.ink }}>{p.name}</div>
                    <div className="text-xs" style={{ color: BUBBLE.faint }}>{handle}</div>
                  </div>
                  <span className="text-xs font-bold" style={{ color: BUBBLE.brand }}>Open →</span>
                </div>
              </a>
            );
          })}
          {other?.university && (
            <div className="p-4 flex items-center gap-3" style={{ borderRadius: 18, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.25)" }}>
              <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-lg shadow">🎓</span>
              <div>
                <div className="font-bold text-sm" style={{ color: BUBBLE.ink }}>Scholar</div>
                <div className="text-xs" style={{ color: BUBBLE.faint }}>{other.university}</div>
              </div>
            </div>
          )}
        </div>
      </BubbleSheet>

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
          background: "rgba(255,247,232,0.94)", backdropFilter: "blur(12px)",
          animation: "ff-slide-up 0.3s ease",
        }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: BUBBLE.card, border: `1px solid ${BUBBLE.border}`, boxShadow: BUBBLE.cardShadow, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SkipForward style={{ width: 28, height: 28, color: BUBBLE.brand }} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: BUBBLE.ink }}>Finding someone new…</span>
          <div style={{ width: 140, height: 5, borderRadius: 3, background: "rgba(255,159,10,0.15)", overflow: "hidden" }}>
            <div style={{
              width: "100%", height: "100%",
              background: "linear-gradient(90deg, transparent 0%, #FF9F0A 45%, #FFB340 50%, #FF9F0A 55%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: "ff-shimmer 1.1s linear infinite",
            }} />
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
            width: "85%", maxWidth: 340, borderRadius: 28, padding: 28,
            background: BUBBLE.card,
            border: `1px solid ${BUBBLE.border}`,
            boxShadow: "0 24px 64px rgba(120,72,20,0.30)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center",
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 32,
              background: "linear-gradient(135deg, rgba(255,77,141,0.16), rgba(255,159,10,0.16))",
              border: "1px solid rgba(255,77,141,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "ff-core-pulse 1.5s ease-in-out infinite",
            }}>
              <Heart style={{ width: 28, height: 28, color: BUBBLE.pink }} />
            </div>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: BUBBLE.ink, marginBottom: 6, letterSpacing: "-0.3px" }}>Extend the chat?</h3>
              <p style={{ fontSize: 14, color: BUBBLE.sub, lineHeight: 1.4 }}>
                Your partner wants to keep talking. Extend for 2 more minutes?
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <button onClick={declineExtend}
                className="bub-btn"
                style={{
                  flex: 1, height: 48, borderRadius: 999,
                  background: "rgba(255,159,10,0.05)", border: `1px solid ${BUBBLE.border}`,
                  color: BUBBLE.sub, fontSize: 15, fontWeight: 700, cursor: "pointer",
                }}
              >
                No thanks
              </button>
              <button onClick={acceptExtend}
                className="bub-btn bub-btn-primary"
                style={{
                  flex: 1, height: 48, borderRadius: 999,
                  background: BUBBLE.grad,
                  color: "#fff", fontSize: 15, fontWeight: 800, border: "none", cursor: "pointer",
                }}
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

  // Responsive layout via Tailwind classes — no JS viewport detection needed.
  // Mobile (portrait): tiles stack top/bottom (flex-col).
  // Desktop (md+):     tiles sit side-by-side (flex-row), original behavior.
  // Arena style: separated rounded panels.
  const containerClass =
    "relative flex-1 min-h-0 flex flex-col md:flex-row gap-2.5 md:gap-[14px] items-stretch md:flex-none md:self-center w-full md:max-w-[1060px] md:h-[min(76vh,680px)]";
  const containerStyle: React.CSSProperties = {};

  if (participantCount === 2) {
    // ── 2 people: 50/50 split — top/bottom on mobile, left/right on desktop ──
    return (
      <div className={containerClass} style={containerStyle}>
        {/* Other person (stranger) */}
        <div className="h-1/2 md:h-auto md:w-1/2 relative">
          <VideoTile person={otherPerson} gradientSeed={otherId ?? "x"} remoteVideoRef={remoteVideoRef} translateOn={translateOn} caption={caption} onSocials={onSocials} />
        </div>

        {/* You */}
        <div className="h-1/2 md:h-auto md:w-1/2 relative">
          <VideoTile person={you} camOff={camOff} pipVideoRef={pipVideoRef} pipStatus={pipStatus} />
        </div>
      </div>
    );
  }

  if (participantCount === 3) {
    // ── 3 people (group of 3) ──
    // Desktop: stranger full-height on left 50%, you + friend side-by-side on right 50%.
    // Mobile:  stranger on top 50% row, you + friend share bottom 50% row side-by-side.
    return (
      <div className={containerClass} style={containerStyle}>
        {/* Stranger — own full container */}
        <div className="h-1/2 md:h-auto md:w-1/2 relative">
          <VideoTile person={otherPerson} gradientSeed={otherId ?? "x"} remoteVideoRef={remoteVideoRef} translateOn={translateOn} caption={caption} onSocials={onSocials} />
        </div>

        {/* You + friend side by side */}
        <div className="h-1/2 md:h-auto md:w-1/2 flex gap-2.5">
          <div className="w-1/2 relative">
            <VideoTile person={you} camOff={camOff} pipVideoRef={pipVideoRef} pipStatus={pipStatus} />
          </div>
          <div className="w-1/2 relative">
            <VideoTile person={{ id: "friend", name: "Friend", isFriend: true }} gradientSeed="friend" />
          </div>
        </div>
      </div>
    );
  }

  // ── 4 people (group of 4) ──
  // Desktop: 2v2 — 50/50 left/right, each side stacked top/bottom 50/50.
  // Mobile:  2x2 grid — two rows of two tiles. Stranger's team on top row,
  //          your team on bottom row.
  return (
    <div className={containerClass} style={containerStyle}>
      {/* Stranger's team: stranger + their friend */}
      <div className="h-1/2 md:h-auto md:w-1/2 flex flex-row md:flex-col gap-2.5">
        <div className="w-1/2 md:w-auto md:h-1/2 relative">
          <VideoTile person={otherPerson} gradientSeed={otherId ?? "x"} remoteVideoRef={remoteVideoRef} translateOn={translateOn} caption={caption} onSocials={onSocials} />
        </div>
        <div className="w-1/2 md:w-auto md:h-1/2 relative">
          <VideoTile person={{ id: "stranger-friend", name: "Their Friend", isFriend: true }} gradientSeed="stranger-friend" />
        </div>
      </div>

      {/* Your team: you + your friend */}
      <div className="h-1/2 md:h-auto md:w-1/2 flex flex-row md:flex-col gap-2.5">
        <div className="w-1/2 md:w-auto md:h-1/2 relative">
          <VideoTile person={you} camOff={camOff} pipVideoRef={pipVideoRef} pipStatus={pipStatus} />
        </div>
        <div className="w-1/2 md:w-auto md:h-1/2 relative">
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
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        borderRadius: 24,
        background: "#1C1712",
        border: `4px solid ${BUBBLE.card}`,
        boxShadow: BUBBLE.cardShadow,
      }}
    >
      {/* Background */}
      {person.isYou ? (
        camOff ? (
          <>
            <div className="absolute inset-0" style={{ background: "#B5B1A8" }} />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <span style={{ fontSize: 34 }}>📷</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(46,36,24,0.55)" }}>cam off</span>
            </div>
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
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ background: "#B5B1A8" }}>
                <span style={{ fontSize: 34 }}>📷</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(46,36,24,0.55)" }}>
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
          {/* Fallback — warm gray box like the lobby, shown when no remote stream */}
          {!hasRemote && (
            <>
              <div className="absolute inset-0" style={{ background: "#B5B1A8" }} />
              {person.avatarUrl && (
                <img src={person.avatarUrl} alt={person.name} className="absolute inset-0 w-full h-full object-cover" />
              )}
              {!person.avatarUrl && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div style={{ width: 74, height: 74, borderRadius: "50%", background: "rgba(255,255,255,0.55)", border: `3px solid ${BUBBLE.card}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 30, fontWeight: 800, color: "rgba(46,36,24,0.55)" }}>{initial}</span>
                  </div>
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

/* ════════════════════════════════════════════════════════════════
   CallBtn — dark glass circle button for the call controls.
   `off` = the feature is disabled (pink tint). `primary` = gradient.
   ════════════════════════════════════════════════════════════════ */
const CallBtn = ({
  onClick,
  off,
  primary,
  size = "md",
  children,
  ...rest
}: {
  onClick: () => void;
  off?: boolean;
  primary?: boolean;
  size?: "md" | "lg";
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const dim = size === "lg" ? 68 : 52;
  return (
    <button
      onClick={onClick}
      className={`bub-btn ${primary ? "bub-btn-primary" : ""}`}
      style={{
        width: dim, height: dim, borderRadius: dim / 2, flexShrink: 0,
        background: primary ? BUBBLE.grad : off ? "rgba(255,77,141,0.14)" : BUBBLE.card,
        border: primary ? "none" : off ? "1.5px solid rgba(255,77,141,0.40)" : `1px solid ${BUBBLE.border}`,
        color: primary ? "#fff" : off ? BUBBLE.pink : BUBBLE.ink,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
      }}
      {...rest}
    >
      {children}
    </button>
  );
};

/** Passed to <PeerGames/> so its trigger matches the bubbly call controls. */
const callTriggerStyle: React.CSSProperties = {
  width: 52, height: 52, borderRadius: 26,
  background: BUBBLE.card,
  border: `1px solid ${BUBBLE.border}`,
  color: BUBBLE.ink,
  boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
};

/* ════════════════════════════════════════════════════════════════
   BubbleSheet — dark bottom sheet for in-call popups.
   ════════════════════════════════════════════════════════════════ */
const BubbleSheet = ({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: BUBBLE.scrim, backdropFilter: "blur(8px)" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet-up w-full max-w-md mx-auto p-5 relative"
        style={{
          background: BUBBLE.card,
          borderRadius: "30px 30px 0 0",
          borderTop: `1px solid ${BUBBLE.border}`,
          boxShadow: "0 -16px 48px rgba(120,72,20,0.28)",
          paddingBottom: "max(env(safe-area-inset-bottom), 1.25rem)",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(120,72,20,0.15)", margin: "0 auto 16px" }} />
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-extrabold tracking-tight" style={{ color: BUBBLE.ink }}>{title}</h3>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 34, height: 34, borderRadius: 17, border: "none", cursor: "pointer",
                background: "rgba(255,159,10,0.08)", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 16, color: BUBBLE.ink, lineHeight: 1 }}>✕</span>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
