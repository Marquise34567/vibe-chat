import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePostHog } from "posthog-js/react";
import { useWebcam } from "@/hooks/useWebcam";
import { useLobbyRoom } from "@/hooks/useLobbyRoom";
import { useContentModeration } from "@/hooks/useContentModeration";
import { getScholarVerified } from "@/lib/verification";
import { toast } from "sonner";
import {
  GlobeIcon as Globe, MenuIcon as Menu, CloseIcon as X,
  CameraIcon as Camera, CameraOffIcon as CameraOff,
  CameraRetryIcon as RefreshCw, ChevronRightIcon as ChevronRight,
  ScholarIcon as GraduationCap, UserIcon as User, UserCircleIcon as UserCircle,
  PlayIcon, SoloModeIcon, BlindModeIcon,
  PlusIcon, LockIcon as Lock, MessageIcon,
} from "@/components/FaceFrenzyIcons";
import { BrandMark } from "@/components/BrandMark";
import { FloatingStickers } from "@/components/FloatingStickers";
import { PaywallSheet, PaywallReason } from "@/components/PaywallSheet";
import { useTier } from "@/hooks/useTier";
import { useIsMobile } from "@/hooks/use-mobile";
import { matchesLeft, isMatchLimitHit } from "@/lib/limits";
import { apiBase, SOCIAL_LINKS } from "@/lib/config";
import { BUBBLE, chipStyle, circleBtnStyle, ctaStyle, ghostPillStyle } from "@/lib/bubble";
import { loadLobbyAds, loadLobbyPopunder } from "@/lib/videoAd";
import { capturePostHogEvent } from "@/lib/posthogLogs";

/* ═══════════════════════════════════════════════════════════════
   FaceFrenzy Lobby — bubbly light theme

   Design philosophy:
   - Soft lavender canvas with purple glows
   - Your live camera sits inside a chunky white-framed card
   - White pill chips for status, modes and preferences
   - The gradient CTA is the star — everything else is soft + bubbly
   - Blind mode: no camera, pastel wave card instead
═══════════════════════════════════════════════════════════════ */

type Mode = "solo" | "blind" | "text";
type Gender = "both" | "girls" | "guys";
type Region = "worldwide" | "north-america" | "south-america" | "europe" | "asia" | "africa" | "oceania";

const REGIONS: { id: Region; label: string; flag: string; countries: string[] }[] = [
  { id: "worldwide",      label: "Worldwide",      flag: "🌍", countries: [] },
  { id: "north-america",  label: "North America",  flag: "🌎", countries: ["US", "CA", "MX"] },
  { id: "south-america",  label: "South America",  flag: "🌎", countries: ["BR", "AR", "CO", "CL", "PE", "VE", "EC", "UY", "PY", "BO"] },
  { id: "europe",         label: "Europe",         flag: "🇪🇺", countries: ["GB", "FR", "DE", "ES", "IT", "NL", "SE", "NO", "DK", "FI", "PL", "PT", "IE", "BE", "AT", "CH", "GR", "CZ", "RO", "HU"] },
  { id: "asia",           label: "Asia",           flag: "🌏", countries: ["JP", "KR", "CN", "IN", "ID", "TH", "VN", "PH", "MY", "SG", "HK", "TW", "BD", "PK", "SA", "AE", "IL", "TR"] },
  { id: "africa",         label: "Africa",         flag: "🌍", countries: ["NG", "ZA", "EG", "KE", "GH", "ET", "TZ", "MA", "DZ", "TN"] },
  { id: "oceania",        label: "Oceania",        flag: "🌏", countries: ["AU", "NZ", "FJ", "PG"] },
];

// ── Decorative activity feed (lobby ambiance) ──
const ACTIVITY_FEED = [
  { name: "Maya", flag: "🇧🇷", action: "matched", target: "Liam", flag2: "🇮🇪" },
  { name: "Yuki", flag: "🇯🇵", action: "started", target: "group", flag2: "" },
  { name: "Sofia", flag: "🇨🇴", action: "joined", target: "blind", flag2: "" },
  { name: "Aiden", flag: "🇺🇸", action: "matched", target: "Zara", flag2: "🇿🇦" },
  { name: "Nora", flag: "🇫🇷", action: "joined", target: "FF", flag2: "" },
  { name: "Kai", flag: "🇰🇷", action: "matched", target: "Emma", flag2: "🇸🇪" },
];

const StartTab = () => {
  const navigate = useNavigate();
  const posthog = usePostHog();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>("solo");
  const [gender, setGender] = useState<Gender>("both");
  const [region, setRegion] = useState<Region>("worldwide");
  const [scholarOnly, setScholarOnly] = useState(false);
  const [matchCount, setMatchCount] = useState(12847);
  const [feedIdx, setFeedIdx] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showRegionPicker, setShowRegionPicker] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [pendingShareUrl, setPendingShareUrl] = useState<string | null>(null);
  const [showSponsorSheet, setShowSponsorSheet] = useState(false);
  const [paywall, setPaywall] = useState<PaywallReason | null>(null);
  const { tier, features, setTier, loading: tierLoading } = useTier();
  const isMobile = useIsMobile();
  const isPaid = tier !== "free";
  const canPickGender = true; // unlocked for everyone — ad revenue covers it
  // Free tier: worldwide only. Paid: pick any region.
  const canPickRegions = features.maxCountryFilters === -1;
  const [sponsors, setSponsors] = useState<{ label: string; link: string; preview?: { title?: string; description?: string; image?: string; favicon?: string } }[]>(() => {
    try {
      const saved = localStorage.getItem("ff_sponsors");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Persist sponsors to localStorage whenever they change
  useEffect(() => {
    try { localStorage.setItem("ff_sponsors", JSON.stringify(sponsors)); } catch {}
  }, [sponsors]);

  // Lobby ads — always-on Adsterra zones + lobby popunder
  useEffect(() => { loadLobbyAds(); loadLobbyPopunder(); }, []);
  const scholarVerified = getScholarVerified();

  const { videoRef, status: camStatus, error: camError, start: camStart, stop: camStop } = useWebcam();
  const { state: lobbyState, roomId, isHost, friendVideoRef, createRoom, joinRoom, leaveRoom } = useLobbyRoom();
  const { startScanning: startLobbyScan, stopScanning: stopLobbyScan } = useContentModeration({ intervalMs: 4000 });
  const [moderationWarning, setModerationWarning] = useState<string | null>(null);

  const friendConnected = lobbyState === "friend-joined";
  const inviteId = searchParams.get("invite");
  const sponsorSuccess = searchParams.get("sponsor");

  // If opened via invite link, join the room
  useEffect(() => {
    if (inviteId && lobbyState === "idle") {
      joinRoom(inviteId);
    }
  }, [inviteId, lobbyState, joinRoom]);

  // Handle Stripe sponsor success redirect
  useEffect(() => {
    if (sponsorSuccess === "success") {
      const label = searchParams.get("label");
      const link = searchParams.get("link");
      if (label && link) {
        // Add sponsor IMMEDIATELY (before preview fetch) so it shows right away
        const newSponsor = { label, link };
        setSponsors((prev) => {
          if (prev.length >= 4) return prev;
          if (prev.some(s => s.link === link)) return prev; // don't double-add
          return [...prev, newSponsor];
        });
        toast.success("Payment successful! Your sponsor is live! 🎉");

        // Fetch preview in background and update the sponsor with it
        const serverUrl = import.meta.env.VITE_MATCH_SERVER_URL?.replace("ws", "http").replace("wss", "https") ?? "http://localhost:8090";
        fetch(`${serverUrl}/api/fetch-preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: link }),
        }).then(r => r.json()).then(preview => {
          if (preview.title || preview.image || preview.favicon) {
            setSponsors((prev) => prev.map(s => s.link === link ? { ...s, preview } : s));
          }
        }).catch(() => {});
      }
      // Clean URL
      searchParams.delete("sponsor");
      searchParams.delete("label");
      searchParams.delete("link");
      searchParams.delete("days");
      setSearchParams(searchParams);
    } else if (sponsorSuccess === "cancelled") {
      toast.error("Payment cancelled");
      searchParams.delete("sponsor");
      setSearchParams(searchParams);
    }
  }, [sponsorSuccess]);

  // Handle Plus/VIP subscription return from Stripe Checkout.
  // We verify the session server-side before granting the tier.
  const plusStatus = searchParams.get("plus");
  useEffect(() => {
    if (plusStatus === "success") {
      const sessionId = searchParams.get("session_id");
      if (sessionId) {
        toast.loading("Verifying your subscription…");
        fetch(`${apiBase()}/api/plus-verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        }).then((r) => r.json()).then((d) => {
          toast.dismiss();
          if (d.ok) {
            const t = d.tier === "vip" ? "vip" : "plus";
            setTier(t);
            toast.success(`Welcome to FaceFrenzy ${t === "vip" ? "VIP 👑" : "Plus ⭐"} — enjoy!`);
          } else {
            toast.error("Payment isn't confirmed yet — refresh in a moment if you were charged");
          }
        }).catch(() => {
          toast.dismiss();
          toast.error("Could not verify payment — check your connection");
        });
      }
      searchParams.delete("plus");
      searchParams.delete("session_id");
      setSearchParams(searchParams);
    } else if (plusStatus === "cancelled") {
      toast.error("Checkout cancelled");
      searchParams.delete("plus");
      setSearchParams(searchParams);
    }
  }, [plusStatus]);

  // Camera is NOT requested on load — the permission wall is a first-visit
  // bailer. Preview card offers "Tap to preview"; Match.tsx starts the real
  // stream once they've committed by tapping Start. Still clean up on unmount.
  useEffect(() => () => camStop(), [camStop]);

  // ── Decorative counters ──
  useEffect(() => {
    const t = setInterval(() => setMatchCount((c) => c + Math.floor(Math.random() * 3) + 1), 2000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setFeedIdx((i) => (i + 1) % ACTIVITY_FEED.length), 3500);
    return () => clearInterval(t);
  }, []);

  const startMatch = () => {
    // Hard paywall — free tier daily match cap (defer while tier resolves;
    // Match.tsx re-checks authoritatively before searching)
    if (!tierLoading && isMatchLimitHit(isPaid)) {
      setPaywall("limit");
      return;
    }
    capturePostHogEvent(posthog, "match_started", {
      match_mode: friendConnected ? "duo" : mode,
      has_gender_filter: gender !== "both",
      has_region_filter: region !== "worldwide",
      scholar_only: scholarOnly,
    });
    const sp = new URLSearchParams();
    sp.set("mode", friendConnected ? "duo" : mode);
    sp.set("groupSize", friendConnected ? "2" : mode === "solo" ? "2" : "3");
    const regionData = REGIONS.find((r) => r.id === region);
    if (regionData && regionData.countries.length > 0) sp.set("countries", regionData.countries.join(","));
    if (gender === "girls") sp.set("gender", "woman");
    if (gender === "guys") sp.set("gender", "man");
    if (scholarOnly) sp.set("scholar", "true");
    if (roomId) sp.set("roomId", roomId);
    navigate(`/match?${sp.toString()}`);
  };

  const openInvite = () => {
    const openSheet = (url: string) => { setPendingShareUrl(url); setShowShareSheet(true); };
    if (!roomId) {
      createRoom();
      setTimeout(() => openSheet(`${window.location.origin}/?invite=${roomId}`), 1500);
    } else {
      openSheet(`${window.location.origin}/?invite=${roomId}`);
    }
  };

  const fmt = (n: number) => n.toLocaleString("en-US");

  const modeMeta: Record<Mode, { desc: string; icon: typeof SoloModeIcon; accent: string; label: string }> = {
    solo:  { desc: "1-on-1 random video chat",            icon: SoloModeIcon,  accent: "#FF9F0A", label: "SOLO"  },
    blind: { desc: "Voice first. Cameras reveal at 30s.", icon: BlindModeIcon, accent: "#FF4D8D", label: "BLIND" },
    text:  { desc: "Chat with text. No camera needed.",   icon: MessageIcon,   accent: "#3B9EF8", label: "TEXT"  },
  };

  const accent = friendConnected ? "#22c55e" : modeMeta[mode].accent;
  const modeLabel = friendConnected ? "DUO" : modeMeta[mode].label;
  const ModeIcon = modeMeta[mode].icon;
  const isBlind = mode === "blind";
  const isNoCam = isBlind || mode === "text";
  const stickerLayer = true;

  // Scan self-preview in lobby for NSFW — warn but don't kill camera
  useEffect(() => {
    if (camStatus !== "active" || isNoCam) return;
    startLobbyScan(videoRef, "local", (report) => {
      console.warn("[moderation] Lobby self-violation:", report);
      setModerationWarning(`Inappropriate content detected on your camera. Please adjust before matching.`);
      setTimeout(() => setModerationWarning(null), 5000);
    });
    return () => stopLobbyScan();
  }, [camStatus, isNoCam, startLobbyScan, stopLobbyScan, videoRef]);

  return (
    <div style={{ position: "relative", minHeight: "100dvh", overflow: "hidden", background: BUBBLE.bg, color: BUBBLE.ink, display: "flex", flexDirection: "column" }} data-room-id={roomId ?? undefined}>
      {/* Floating sticker decorations */}
      {stickerLayer && <FloatingStickers />}

      {/* ═══════════════════════════════════════════════════
          TOP BAR — logo + status chips
      ═══════════════════════════════════════════════════ */}
      <div style={{ position: "relative", zIndex: 10, paddingTop: "calc(env(safe-area-inset-top, 0px) + 14px)", paddingLeft: 16, paddingRight: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <BrandMark size={32} />
          <span className="ff-wordmark" style={{ fontSize: 16 }}>facefrenzy</span>
        </div>

        {/* Right cluster */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Follow us on X — desktop only, keeps mobile top bar clean */}
          {!isMobile && (
            <a href={SOCIAL_LINKS.x} target="_blank" rel="noopener noreferrer" aria-label="Follow us on X"
              className="bub-btn bub-btn-ghost"
              style={{ ...circleBtnStyle, fontSize: 16, fontWeight: 800, color: BUBBLE.ink, textDecoration: "none" }}
            >
              𝕏
            </a>
          )}

          {/* Menu */}
          <button onClick={() => setShowSettings(true)} aria-label="Settings" className="bub-btn bub-btn-ghost" style={circleBtnStyle}>
            <Menu className="w-4 h-4" style={{ color: BUBBLE.ink }} />
          </button>
        </div>
      </div>

      {/* Moderation warning banner */}
      {moderationWarning && (
        <div style={{
          position: "fixed", top: "calc(env(safe-area-inset-top, 0px) + 70px)", left: "50%",
          transform: "translateX(-50%)", zIndex: 200,
          padding: "12px 20px", borderRadius: 16, maxWidth: "90vw",
          background: "rgba(220,38,38,0.92)", backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.3)",
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 8px 32px rgba(220,38,38,0.4)",
          animation: "ff-slide-up 0.3s ease",
        }}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{moderationWarning}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          HERO — ticker chip + big mode headline
      ═══════════════════════════════════════════════════ */}
      <div style={{ position: "relative", zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 20px 12px", textAlign: "center" }}>


        {/* Activity ticker chip — desktop only, declutters mobile */}
        {!isMobile && (
          <div key={feedIdx} className="animate-fade-in" style={{ ...chipStyle, marginBottom: 12, fontSize: 11, color: BUBBLE.sub, fontWeight: 600 }}>
            <span style={{ color: BUBBLE.ink, fontWeight: 800 }}>{ACTIVITY_FEED[feedIdx].name}</span>
            {" "}{ACTIVITY_FEED[feedIdx].flag} {ACTIVITY_FEED[feedIdx].action}{" "}
            <span style={{ color: accent, fontWeight: 800 }}>{ACTIVITY_FEED[feedIdx].target}</span>
            {ACTIVITY_FEED[feedIdx].flag2 && ` ${ACTIVITY_FEED[feedIdx].flag2}`}
          </div>
        )}
      </div>

      {/* ═══ SPLIT — camera box left, control panel right (Monkey desktop style) ═══ */}
      <div style={{ position: "relative", zIndex: 5, flex: isMobile ? 1 : "0 0 auto", minHeight: 0, display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 0 : 14, padding: isMobile ? 0 : "0 16px", width: "100%", maxWidth: isMobile ? undefined : 1060, margin: "0 auto", height: isMobile ? undefined : "min(76vh, 680px)", alignSelf: isMobile ? undefined : "center" }}>
        {!isMobile && (
          <div style={{ position: "relative", flex: 1.15, minWidth: 0, borderRadius: 24, overflow: "hidden", background: "#B5B1A8", border: `1px solid ${BUBBLE.border}`, boxShadow: BUBBLE.cardShadow }}>
            {!isNoCam && (
              <video ref={videoRef} autoPlay playsInline muted
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", objectPosition: "center top", opacity: camStatus === "active" ? 1 : 0, transition: "opacity 0.6s ease" }} />
            )}
            {!isNoCam && camStatus !== "active" && (
              <button onClick={camStart} className="bub-btn" style={{ position: "absolute", inset: 0, background: "transparent", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                {camStatus === "requesting" ? (
                  <RefreshCw className="animate-spin" style={{ width: 34, height: 34, color: BUBBLE.brand }} />
                ) : camStatus === "denied" || camStatus === "error" ? (
                  <CameraOff style={{ width: 42, height: 42, color: "rgba(46,36,24,0.45)" }} />
                ) : (
                  <Camera style={{ width: 42, height: 42, color: "rgba(46,36,24,0.45)" }} />
                )}
                <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(46,36,24,0.6)" }}>
                  {camStatus === "requesting" ? "Starting camera…" : camStatus === "denied" || camStatus === "error" ? (camError || "Tap to enable camera") : "Tap to preview"}
                </span>
              </button>
            )}
            {isBlind && (
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, #2A1622 0%, #1E1424 55%, #191320 100%)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} style={{ width: 6, borderRadius: 4, background: accent, height: [26, 44, 64, 82, 64, 44, 26][i], opacity: 0.55, animation: `ff-wave-bar 1.5s ease-in-out ${i * 0.1}s infinite` }} />
                ))}
              </div>
            )}
            {mode === "text" && (
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, #101C2A 0%, #0E1624 55%, #12121C 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64 }}>💬</div>
            )}
            <div style={{ position: "absolute", bottom: 12, left: 12, zIndex: 6 }}>
              <span style={{ ...chipStyle, gap: 6, padding: "5px 12px", fontSize: 11 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                You
              </span>
            </div>
          </div>
        )}
        <div style={{ position: "relative", flex: 1, minWidth: 0, display: "flex", flexDirection: "column", borderRadius: isMobile ? 0 : 24, background: isMobile ? "transparent" : BUBBLE.card, border: isMobile ? "none" : `1px solid ${BUBBLE.border}`, boxShadow: isMobile ? "none" : BUBBLE.cardShadow, padding: isMobile ? 0 : "12px 16px 6px" }}>
      {/* Mode toggle — top-center pill (Monkey-style) */}
      <div style={{ position: "relative", zIndex: 10, padding: "2px 20px 0", display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", padding: 4, borderRadius: 20, background: "rgba(255,159,10,0.06)", border: `1px solid ${BUBBLE.border}`, width: "100%", maxWidth: 380 }}>
          {(["solo", "blind", "text"] as Mode[]).map((m) => {
            const meta = modeMeta[m];
            const Icon = meta.icon;
            const selected = mode === m;
            return (
              <button key={m} onClick={() => setMode(m)}
                style={{
                  flex: 1, height: 40, borderRadius: 16, border: "none",
                  background: selected ? BUBBLE.card : "transparent",
                  boxShadow: selected ? "0 2px 10px rgba(120,72,20,0.10)" : "none",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  cursor: "pointer", transition: "all 0.25s ease",
                }}
              >
                <Icon style={{ width: 17, height: 17, opacity: selected ? 1 : 0.35, transition: "opacity 0.2s ease" }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: selected ? meta.accent : BUBBLE.faint, letterSpacing: "0.5px" }}>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ HERO — centered logo + tagline (Monkey-style) ═══ */}
      <div style={{ position: "relative", zIndex: 5, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, paddingBottom: 18 }}>
        <BrandMark size={84} />
        <div className="ff-wordmark" style={{ fontSize: 36, letterSpacing: "-1.2px", marginTop: 12 }}>facefrenzy</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: BUBBLE.sub }}>meet new people face-to-face</div>
        {lobbyState === "waiting" && (
          <div style={{ ...chipStyle, gap: 7, marginTop: 12, padding: "7px 15px" }}>
            <RefreshCw className="animate-spin" style={{ width: 13, height: 13, color: BUBBLE.brand }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: BUBBLE.ink }}>Waiting for friend…</span>
          </div>
        )}
      </div>

      {/* Match counter chip — desktop only, declutters mobile */}
      {!isMobile && (
        <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 64px)", right: 16, zIndex: 6 }}>
          <span style={{ ...chipStyle, gap: 6, padding: "6px 13px" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#F5B400", boxShadow: "0 0 8px rgba(245,180,0,0.7)", animation: "ff-core-pulse 1.5s ease-in-out infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: BUBBLE.ink, fontVariantNumeric: "tabular-nums" }}>{fmt(matchCount)}</span>
            <span style={{ fontSize: 10, color: BUBBLE.faint, fontWeight: 700 }}>today</span>
          </span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          DOCK — white card with modes, prefs, CTA
      ═══════════════════════════════════════════════════ */}
      <div style={{ position: "relative", zIndex: 10, padding: "10px 14px calc(env(safe-area-inset-bottom, 0px) + 14px)", animation: "ff-dock-rise 0.6s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        <div style={{
          padding: "0 6px", maxWidth: 560, margin: "0 auto",
        }}>
          {/* Sponsors — compact strip on mobile (right rail is desktop-only) */}
          {isMobile && (
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {[0, 1, 2, 3].map((i) => {
                const sponsor = sponsors[i];
                const preview = sponsor?.preview;
                return (
                  <button key={i}
                    onClick={() => {
                      if (sponsor?.link) window.open(sponsor.link.startsWith("http") ? sponsor.link : `https://${sponsor.link}`, "_blank");
                      else setShowSponsorSheet(true);
                    }}
                    style={{
                      flex: 1, height: 44, borderRadius: 13, padding: 4, overflow: "hidden",
                      background: sponsor ? "linear-gradient(135deg, rgba(245,158,11,0.10), rgba(255,159,10,0.08))" : "rgba(255,159,10,0.04)",
                      border: sponsor ? "1.5px solid rgba(217,119,6,0.30)" : `1px dashed ${BUBBLE.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      cursor: "pointer", position: "relative",
                    }}
                  >
                    {sponsor ? (
                      <>
                        {preview?.image ? (
                          <img src={preview.image} alt="" style={{ width: 20, height: 20, borderRadius: 6, objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : preview?.favicon ? (
                          <img src={preview.favicon} alt="" style={{ width: 16, height: 16, borderRadius: 4 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : null}
                        <span style={{ fontSize: 8, fontWeight: 800, color: BUBBLE.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 44 }}>
                          {preview?.title || sponsor.label}
                        </span>
                        <span style={{ position: "absolute", top: 2, right: 4, fontSize: 6, fontWeight: 800, color: "rgba(217,119,6,0.6)", textTransform: "uppercase" }}>ad</span>
                      </>
                    ) : (
                      <>
                        <PlusIcon style={{ width: 12, height: 12, color: "rgba(217,119,6,0.5)" }} />
                        <span style={{ fontSize: 8, fontWeight: 800, color: "rgba(217,119,6,0.55)" }}>ad</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Preferences row — gender + region + scholar */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12, justifyContent: "center" }}>
            {/* Gender — minimal text segments, one tap to switch.
                Locked tiers dim + open the paywall. */}
            <div style={{
              height: 42, borderRadius: 21,
              background: "rgba(255,159,10,0.06)", border: `1px solid ${BUBBLE.border}`,
              display: "flex", alignItems: "center", padding: 3,
            }}>
              {([
                { id: "both" as Gender, label: "Both" },
                { id: "girls" as Gender, label: "Girls" },
                { id: "guys" as Gender, label: "Guys" },
              ]).map((g) => {
                const locked = !canPickGender && g.id !== "both";
                const sel = gender === g.id;
                return (
                  <button key={g.id}
                    onClick={() => { if (locked) { setPaywall("gender"); return; } setGender(g.id); }}
                    style={{
                      height: "100%", border: "none", padding: "0 10px",
                      borderRadius: 18,
                      background: sel ? BUBBLE.card : "transparent",
                      boxShadow: sel ? "0 2px 8px rgba(120,72,20,0.10)" : "none",
                      cursor: "pointer", color: sel ? BUBBLE.brand : BUBBLE.sub,
                      fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", transition: "all 0.2s ease",
                      display: "flex", alignItems: "center", gap: 3,
                      opacity: locked ? 0.45 : 1,
                    }}>
                    {g.label}
                    {locked && <Lock style={{ width: 9, height: 9, color: BUBBLE.brand }} />}
                  </button>
                );
              })}
            </div>

            {/* Region */}
            <button onClick={() => setShowRegionPicker(true)}
              className="bub-btn bub-btn-ghost"
              style={{
                height: 42, padding: "0 14px", borderRadius: 21,
                background: region !== "worldwide" ? BUBBLE.brandSoft : BUBBLE.card,
                border: region !== "worldwide" ? "1px solid rgba(255,159,10,0.35)" : `1px solid ${BUBBLE.border}`,
                color: region !== "worldwide" ? BUBBLE.brand : BUBBLE.sub,
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
                boxShadow: "inset 0 -2px 0 rgba(120,72,20,0.05), 0 2px 8px rgba(120,72,20,0.05)",
              }}
            >
              <Globe style={{ width: 15, height: 15 }} />
              <span style={{ maxWidth: 76, overflow: "hidden", textOverflow: "ellipsis" }}>{REGIONS.find((r) => r.id === region)?.label}</span>
            </button>

            {/* Scholar */}
            <button onClick={() => setScholarOnly(!scholarOnly)}
              className="bub-btn bub-btn-ghost"
              style={{
                height: 42, width: 42, borderRadius: 21, flexShrink: 0,
                background: scholarOnly ? "rgba(34,197,94,0.10)" : BUBBLE.card,
                border: scholarOnly ? "1px solid rgba(34,197,94,0.35)" : `1px solid ${BUBBLE.border}`,
                color: scholarOnly ? "#16a34a" : BUBBLE.faint,
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "inset 0 -2px 0 rgba(120,72,20,0.05), 0 2px 8px rgba(120,72,20,0.05)",
                animation: scholarOnly ? "ff-icon-bounce 0.4s ease" : "none",
              }}
            >
              <GraduationCap style={{ width: 18, height: 18 }} />
            </button>
          </div>

          {/* CTA row — centered */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center" }}>
            {/* Invite — opens custom share sheet */}
            <button
              onClick={openInvite}
              aria-label="Invite friends"
              className="bub-btn bub-btn-ghost"
              style={{
                ...circleBtnStyle, flexShrink: 0,
                background: friendConnected ? "rgba(34,197,94,0.10)" : BUBBLE.card,
                border: friendConnected ? "1px solid rgba(34,197,94,0.35)" : `1px solid ${BUBBLE.border}`,
                animation: friendConnected ? "ff-btn-glow 2s ease-in-out infinite" : "none",
              }}
            >
              <PlusIcon style={{ width: 18, height: 18, color: friendConnected ? "#16a34a" : BUBBLE.brand }} />
            </button>

            {/* Start */}
            <button onClick={startMatch}
              className="bub-btn bub-btn-primary"
              style={{
                ...ctaStyle,
                height: 48, padding: "0 30px",
                fontSize: 15, letterSpacing: "0.2px",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                position: "relative",
              }}
            >
              <PlayIcon style={{ width: 16, height: 16 }} />
              Start Video Chat →
            </button>

            {/* Leave friend — only when connected */}
            {friendConnected && (
              <button
                onClick={() => { leaveRoom(); setSearchParams({}); }}
                className="bub-btn bub-btn-ghost"
                style={{
                  ...circleBtnStyle, flexShrink: 0,
                  background: "rgba(255,77,141,0.08)", border: "1px solid rgba(255,77,141,0.3)",
                }}
                aria-label="Leave friend"
              >
                <X style={{ width: 18, height: 18, color: BUBBLE.pink }} />
              </button>
            )}
          </div>

          {/* Free-tier remaining matches — tick meter + nudge toward Plus */}
          {!isPaid && (
            <div style={{ marginTop: 11, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              {matchesLeft() > 0 ? (
                <>
                  <div style={{ display: "flex", gap: 3 }}>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: 13, height: 4, borderRadius: 2,
                          background: i < matchesLeft() ? BUBBLE.brand : "rgba(120,72,20,0.12)",
                          transition: "background 0.3s ease",
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: BUBBLE.faint }}>
                    {matchesLeft()} free matches left today — <button onClick={() => setPaywall("generic")} style={{ color: BUBBLE.brand, fontWeight: 800, background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 11 }}>go unlimited</button>
                  </div>
                </>
              ) : (
                <button onClick={() => setPaywall("limit")} style={{ color: "#e11d48", fontWeight: 800, background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 11 }}>
                  Out of free matches today — unlock Plus
                </button>
              )}
            </div>
          )}
        </div>
      </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          SPONSOR BOXES — right rail, desktop only (mobile gets
          a compact strip inside the dock instead)
      ═══════════════════════════════════════════════════ */}
      {!isMobile && (
      <div style={{
        position: "fixed", right: 14, top: "50%", transform: "translateY(-50%)",
        display: "flex", flexDirection: "column", gap: 10, zIndex: 50,
      }}>
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, marginBottom: 4 }}>
          <div style={{
            fontSize: 11, fontWeight: 900, color: "#D97706",
            textTransform: "uppercase", letterSpacing: 2, textAlign: "center",
          }}>
            Sponsors
          </div>
          <div style={{ width: 24, height: 2, borderRadius: 1, background: "rgba(217,119,6,0.4)" }} />
        </div>

        {/* 4 sponsor boxes */}
        {[0, 1, 2, 3].map((i) => {
          const sponsor = sponsors[i];
          const preview = sponsor?.preview;
          const isEmpty = !sponsor;
          return (
            <button
              key={i}
              onClick={() => {
                if (sponsor?.link) {
                  window.open(sponsor.link.startsWith("http") ? sponsor.link : `https://${sponsor.link}`, "_blank");
                } else {
                  setShowSponsorSheet(true);
                }
              }}
              style={{
                width: 88, height: 88, borderRadius: 18,
                background: sponsor
                  ? "linear-gradient(135deg, rgba(245,158,11,0.10), rgba(255,159,10,0.08))"
                  : BUBBLE.card,
                border: sponsor
                  ? "1.5px solid rgba(217,119,6,0.35)"
                  : `1px dashed ${BUBBLE.border}`,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                cursor: "pointer", gap: 4, padding: 6, overflow: "hidden",
                transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), border-color 0.3s, box-shadow 0.3s",
                boxShadow: sponsor ? "0 6px 20px rgba(217,119,6,0.12)" : "0 2px 10px rgba(120,72,20,0.05)",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.06)";
                if (isEmpty) e.currentTarget.style.borderColor = "rgba(217,119,6,0.45)";
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                if (isEmpty) e.currentTarget.style.borderColor = BUBBLE.border;
              }}
            >
              {sponsor ? (
                <>
                  {/* Preview image or favicon */}
                  {preview?.image ? (
                    <img src={preview.image} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : preview?.favicon ? (
                    <img src={preview.favicon} alt="" style={{ width: 28, height: 28, borderRadius: 8 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(245,158,11,0.14)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔗</div>
                  )}
                  <span style={{ fontSize: 9, fontWeight: 800, color: BUBBLE.ink, textAlign: "center", padding: "0 2px", lineHeight: 1.15, maxWidth: 76, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {preview?.title || sponsor.label}
                  </span>
                  {/* Sponsored badge */}
                  <span style={{ position: "absolute", top: 4, right: 5, fontSize: 6, fontWeight: 800, color: "rgba(217,119,6,0.6)", textTransform: "uppercase", letterSpacing: 0.5 }}>ad</span>
                </>
              ) : (
                <>
                  <div style={{
                    width: 28, height: 28, borderRadius: 14,
                    background: "rgba(245,158,11,0.10)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <PlusIcon style={{ width: 16, height: 16, color: "rgba(217,119,6,0.55)" }} />
                  </div>
                  <span style={{ fontSize: 8, color: "rgba(217,119,6,0.6)", fontWeight: 800, textAlign: "center", lineHeight: 1.2 }}>
                    Your ad<br />here
                  </span>
                </>
              )}
            </button>
          );
        })}

        {/* CTA below boxes */}
        <button
          onClick={() => setShowSponsorSheet(true)}
          style={{
            width: 88, padding: "7px 0", borderRadius: 12,
            background: BUBBLE.card, border: "1px solid rgba(217,119,6,0.3)",
            color: "#D97706", fontSize: 9, fontWeight: 800, cursor: "pointer",
            textTransform: "uppercase", letterSpacing: 0.5,
            boxShadow: "0 2px 10px rgba(120,72,20,0.05)",
            transition: "transform 0.2s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
          onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1.03)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          Become a Sponsor
        </button>
      </div>
      )}

      {/* ═══════════════════════════════════════════════════
          SHEETS
      ═══════════════════════════════════════════════════ */}
      {showRegionPicker && (
        <RegionPickerSheet
          region={region}
          setRegion={setRegion}
          onClose={() => setShowRegionPicker(false)}
          canPickRegions={canPickRegions}
          onLocked={() => { setShowRegionPicker(false); setPaywall("region"); }}
        />
      )}
      {showSettings && (
        <SettingsSheet
          onClose={() => setShowSettings(false)} gender={gender} setGender={setGender}
          scholarOnly={scholarOnly} setScholarOnly={setScholarOnly} scholarVerified={scholarVerified}
          camStatus={camStatus} camError={camError} onRetryCam={camStart}
          canPickGender={canPickGender}
          onLockedGender={() => { setShowSettings(false); setPaywall("gender"); }}
        />
      )}
      {paywall && (
        <PaywallSheet reason={paywall} onClose={() => setPaywall(null)} />
      )}
      {showShareSheet && pendingShareUrl && (
        <ShareSheet url={pendingShareUrl} onClose={() => { setShowShareSheet(false); setPendingShareUrl(null); }} />
      )}
      {showSponsorSheet && (
        <SponsorSheet
          onClose={() => setShowSponsorSheet(false)}
          onSubmit={async (label, link, days) => {
            if (sponsors.length >= 4) {
              toast.error("All sponsor slots are full");
              return;
            }
            toast.loading("Redirecting to Stripe…");
            try {
              const serverUrl = import.meta.env.VITE_MATCH_SERVER_URL?.replace("ws", "http").replace("wss", "https") ?? "http://localhost:8090";
              const res = await fetch(`${serverUrl}/api/sponsor-checkout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ label, link, days }),
              });
              const data = await res.json();
              if (data.url) {
                window.location.href = data.url;
              } else {
                toast.error(data.error || "Payment failed to start");
              }
            } catch (err) {
              toast.error("Could not connect to payment server");
            }
            setShowSponsorSheet(false);
          }}
        />
      )}
    </div>
  );
};

export default StartTab;

/* ═══════════════════════════════════════════════════════════════
   Shared sheet shell styles (bubbly light)
═══════════════════════════════════════════════════════════════ */
const sheetWrap: React.CSSProperties = {
  background: BUBBLE.scrim, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
};
const sheetCard: React.CSSProperties = {
  background: BUBBLE.card, borderRadius: "30px 30px 0 0", padding: 24,
  paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
  borderTop: `1px solid ${BUBBLE.border}`,
  boxShadow: "0 -16px 48px rgba(120,72,20,0.28)",
};
const sheetHandle: React.CSSProperties = {
  width: 40, height: 4, borderRadius: 2, background: "rgba(120,72,20,0.15)", margin: "0 auto 20px",
};
const sheetCloseBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 17, background: "rgba(255,159,10,0.08)",
  border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};
const rowCard = (selected: boolean, tint: string = BUBBLE.brand): React.CSSProperties => ({
  background: selected ? `${tint === BUBBLE.brand ? BUBBLE.brandSoft : "rgba(34,197,94,0.08)"}` : "rgba(255,159,10,0.035)",
  border: selected ? `1.5px solid ${tint === BUBBLE.brand ? "rgba(255,159,10,0.40)" : "rgba(34,197,94,0.30)"}` : `1px solid ${BUBBLE.border}`,
});

/* ═══════════════════════════════════════════════════════════════
   RegionPickerSheet
═══════════════════════════════════════════════════════════════ */
const RegionPickerSheet = ({ region, setRegion, onClose, canPickRegions, onLocked }: { region: Region; setRegion: (r: Region) => void; onClose: () => void; canPickRegions: boolean; onLocked: () => void; }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-end" style={sheetWrap} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full animate-sheet-up" style={sheetCard}>
        <div style={sheetHandle} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: BUBBLE.ink, letterSpacing: "-0.3px" }}>Pick a region</h2>
          <button onClick={onClose} className="bub-btn" style={sheetCloseBtn}>
            <X className="w-4 h-4" style={{ color: BUBBLE.ink }} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {REGIONS.map((r) => {
            const selected = region === r.id;
            const locked = !canPickRegions && r.id !== "worldwide";
            return (
              <button key={r.id} onClick={() => { if (locked) { onLocked(); return; } setRegion(r.id); onClose(); }}
                style={{
                  height: 58, padding: "0 16px", borderRadius: 18,
                  ...rowCard(selected),
                  cursor: "pointer", transition: "all 0.2s ease",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  opacity: locked ? 0.55 : 1,
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 13, background: selected ? "rgba(255,159,10,0.12)" : "rgba(255,159,10,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{r.flag}</div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: selected ? BUBBLE.brand : BUBBLE.ink }}>{r.label}</div>
                    <div style={{ fontSize: 11, color: BUBBLE.faint }}>{r.countries.length === 0 ? "No filter" : locked ? "Plus only" : `${r.countries.length} countries`}</div>
                  </div>
                </div>
                {locked && <Lock style={{ width: 15, height: 15, color: BUBBLE.brand }} />}
                {selected && !locked && (
                  <div style={{ width: 24, height: 24, borderRadius: 12, background: BUBBLE.brand, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   SettingsSheet
═══════════════════════════════════════════════════════════════ */
const SettingsSheet = ({
  onClose, gender, setGender, scholarOnly, setScholarOnly, scholarVerified, camStatus, camError, onRetryCam,
  canPickGender, onLockedGender,
}: {
  onClose: () => void; gender: Gender; setGender: (g: Gender) => void;
  scholarOnly: boolean; setScholarOnly: (v: boolean) => void; scholarVerified: boolean;
  camStatus: string; camError: string | null; onRetryCam: () => void;
  canPickGender: boolean; onLockedGender: () => void;
}) => {
  const genders: { id: Gender; label: string }[] = [
    { id: "both", label: "Both" }, { id: "girls", label: "Girls" }, { id: "guys", label: "Guys" },
  ];
  return (
    <div className="fixed inset-0 z-[100] flex items-end" style={sheetWrap} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full animate-sheet-up" style={sheetCard}>
        <div style={sheetHandle} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: BUBBLE.ink, letterSpacing: "-0.3px" }}>Settings</h2>
          <button onClick={onClose} className="bub-btn" style={sheetCloseBtn}>
            <X className="w-4 h-4" style={{ color: BUBBLE.ink }} />
          </button>
        </div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: BUBBLE.faint, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Show me</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {genders.map((g) => {
              const locked = !canPickGender && g.id !== "both";
              const selected = gender === g.id;
              return (
              <button key={g.id} onClick={() => { if (locked) { onLockedGender(); return; } setGender(g.id); }}
                style={{
                  height: 44, borderRadius: 14,
                  ...rowCard(selected),
                  color: selected ? BUBBLE.brand : BUBBLE.ink, fontSize: 14, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.2s ease",
                  opacity: locked ? 0.55 : 1,
                }}>
                {g.id === "both" && <UserCircle className="w-3.5 h-3.5" />}
                {(g.id === "girls" || g.id === "guys") && <User className="w-3.5 h-3.5" />}
                {g.label}
                {locked && <Lock style={{ width: 11, height: 11, color: BUBBLE.brand }} />}
              </button>
              );
            })}
          </div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => setScholarOnly(!scholarOnly)} className="flex items-center justify-between w-full"
            style={{ height: 54, padding: "0 16px", borderRadius: 18, cursor: "pointer", transition: "all 0.2s ease", ...rowCard(scholarOnly, "#22c55e") }}>
            <div className="flex items-center gap-3">
              <div style={{ width: 38, height: 38, borderRadius: 12, background: scholarOnly ? "rgba(34,197,94,0.14)" : "rgba(255,159,10,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <GraduationCap className="w-4 h-4" style={{ color: scholarOnly ? "#16a34a" : BUBBLE.faint }} />
              </div>
              <div className="text-left">
                <div style={{ fontSize: 14, fontWeight: 700, color: BUBBLE.ink }}>Scholars only</div>
                <div style={{ fontSize: 11, color: BUBBLE.faint }}>{scholarVerified ? "You're verified 🎓" : "Match with verified students only"}</div>
              </div>
            </div>
            <div style={{ width: 46, height: 28, borderRadius: 14, background: scholarOnly ? "#22c55e" : "rgba(120,72,20,0.12)", padding: 3, transition: "background 0.2s ease", display: "flex", alignItems: "center" }}>
              <div style={{ width: 22, height: 22, borderRadius: 11, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transform: scholarOnly ? "translateX(18px)" : "translateX(0)", transition: "transform 0.2s ease" }} />
            </div>
          </button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: BUBBLE.faint, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Camera</div>
          <button onClick={onRetryCam} className="flex items-center justify-between w-full"
            style={{ height: 54, padding: "0 16px", borderRadius: 18, ...rowCard(false), cursor: "pointer" }}>
            <div className="flex items-center gap-3">
              <div style={{ width: 38, height: 38, borderRadius: 12, background: camStatus === "active" ? "rgba(34,197,94,0.14)" : "rgba(255,159,10,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {camStatus === "active" ? <Camera className="w-4 h-4" style={{ color: "#16a34a" }} /> : <CameraOff className="w-4 h-4" style={{ color: BUBBLE.faint }} />}
              </div>
              <div className="text-left">
                <div style={{ fontSize: 14, fontWeight: 700, color: BUBBLE.ink }}>{camStatus === "active" ? "Camera active" : camStatus === "denied" ? "Camera denied" : camStatus === "requesting" ? "Starting…" : "Camera off"}</div>
                <div style={{ fontSize: 11, color: BUBBLE.faint }}>{camStatus === "active" ? "Your preview is live" : camError || "Tap to enable"}</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: BUBBLE.faint }} />
          </button>
        </div>
        <button onClick={onClose} className="bub-btn bub-btn-primary" style={{ ...ctaStyle, width: "100%", height: 52, fontSize: 17, marginTop: 8 }}>Done</button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   ShareSheet — custom in-app share popup
═══════════════════════════════════════════════════════════════ */
const ShareSheet = ({ url, onClose }: { url: string; onClose: () => void }) => {
  const [copied, setCopied] = useState(false);

  const shareTargets = [
    { label: "WhatsApp",  icon: "💬", color: "#25D366", url: (u: string) => `https://wa.me/?text=${encodeURIComponent("Join me on FaceFrenzy! " + u)}` },
    { label: "Telegram",  icon: "✈️", color: "#0088CC", url: (u: string) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent("Join me on FaceFrenzy!")}` },
    { label: "Twitter / X", icon: "𝕏", color: "#000",   url: (u: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent("Join me on FaceFrenzy! " + u)}` },
    { label: "Facebook",  icon: "📘", color: "#1877F2", url: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
    { label: "Reddit",    icon: "🔴", color: "#FF4500", url: (u: string) => `https://reddit.com/submit?url=${encodeURIComponent(u)}&title=${encodeURIComponent("Join me on FaceFrenzy!")}` },
    { label: "Email",     icon: "📧", color: "#FF9F0A", url: (u: string) => `mailto:?subject=${encodeURIComponent("Join me on FaceFrenzy!")}&body=${encodeURIComponent("Hey! Join me on FaceFrenzy: " + u)}` },
  ];

  const copyLink = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      toast("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end" style={sheetWrap} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full animate-sheet-up" style={sheetCard}>
        {/* Handle */}
        <div style={sheetHandle} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: BUBBLE.ink, marginBottom: 2, letterSpacing: "-0.3px" }}>Invite a friend</h2>
            <p style={{ fontSize: 13, color: BUBBLE.faint }}>Share your link to video chat together</p>
          </div>
          <button onClick={onClose} className="bub-btn" style={sheetCloseBtn}>
            <X className="w-4 h-4" style={{ color: BUBBLE.ink }} />
          </button>
        </div>

        {/* Link preview */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
          padding: "12px 14px", borderRadius: 16,
          background: "rgba(255,159,10,0.05)", border: `1px solid ${BUBBLE.border}`,
        }}>
          <div style={{ flexShrink: 0 }}>
            <BrandMark size={36} />
          </div>
          <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: BUBBLE.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>FaceFrenzy invite</div>
            <div style={{ fontSize: 11, color: BUBBLE.faint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{url}</div>
          </div>
          <button onClick={copyLink}
            style={{
              height: 36, padding: "0 16px", borderRadius: 18, flexShrink: 0,
              background: copied ? "rgba(34,197,94,0.12)" : BUBBLE.brandSoft,
              border: copied ? "1px solid rgba(34,197,94,0.35)" : "1px solid rgba(255,159,10,0.3)",
              color: copied ? "#16a34a" : BUBBLE.brand, fontSize: 13, fontWeight: 800,
              cursor: "pointer", transition: "all 0.2s ease", whiteSpace: "nowrap",
            }}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* Share targets grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
          {shareTargets.map((target) => (
            <a key={target.label} href={target.url(url)} target="_blank" rel="noopener noreferrer"
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                padding: "16px 8px", borderRadius: 18, textDecoration: "none",
                background: "rgba(255,159,10,0.035)", border: `1px solid ${BUBBLE.border}`,
                cursor: "pointer", transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,159,10,0.07)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,159,10,0.035)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: `${target.color}18`, border: `1px solid ${target.color}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
              }}>
                {target.icon}
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: BUBBLE.sub }}>{target.label}</span>
            </a>
          ))}
        </div>

        {/* Native share fallback (if available) */}
        {typeof navigator !== "undefined" && (navigator as any).share && (
          <button
            onClick={() => { (navigator as any).share({ title: "FaceFrenzy", text: "Join me on FaceFrenzy!", url }); }}
            className="bub-btn bub-btn-ghost"
            style={{
              ...ghostPillStyle,
              width: "100%", height: 48,
              fontSize: 15,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <PlusIcon style={{ width: 18, height: 18, color: BUBBLE.brand }} />
            More share options…
          </button>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   SponsorSheet — submit your app/product/social handle to a sponsor box
═══════════════════════════════════════════════════════════════ */
const SponsorSheet = ({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (label: string, link: string, days: number) => void;
}) => {
  const [label, setLabel] = useState("");
  const [link, setLink] = useState("");
  const [days, setDays] = useState(1);
  const [preview, setPreview] = useState<{ title?: string; description?: string; image?: string; favicon?: string } | null>(null);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const PRICE_PER_DAY = 5;
  const total = days * PRICE_PER_DAY;

  const dayOptions = [1, 3, 7, 14, 30];

  const inputStyle: React.CSSProperties = {
    width: "100%", height: 48, borderRadius: 14,
    background: "rgba(255,159,10,0.05)", border: `1px solid ${BUBBLE.border}`,
    color: BUBBLE.ink, fontSize: 15, fontWeight: 600, padding: "0 16px",
    outline: "none",
  };

  // Fetch preview when link changes (debounced)
  useEffect(() => {
    if (!link.trim() || link.trim().length < 4) { setPreview(null); return; }
    setFetchingPreview(true);
    const t = setTimeout(() => {
      const serverUrl = import.meta.env.VITE_MATCH_SERVER_URL?.replace("ws", "http").replace("wss", "https") ?? "http://localhost:8090";
      fetch(`${serverUrl}/api/fetch-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link.trim() }),
      }).then(r => r.json()).then(data => {
        setPreview(data);
        // Auto-fill label if empty
        if (!label.trim() && data.title) setLabel(data.title.slice(0, 20));
      }).catch(() => {}).finally(() => setFetchingPreview(false));
    }, 800);
    return () => clearTimeout(t);
  }, [link]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end" style={sheetWrap} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full animate-sheet-up" style={sheetCard}>
        <div style={sheetHandle} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: BUBBLE.ink, marginBottom: 2, letterSpacing: "-0.3px" }}>Become a Sponsor</h3>
            <p style={{ fontSize: 13, color: BUBBLE.faint }}>Get your app, product, or social seen by hundreds daily</p>
          </div>
          <button onClick={onClose} className="bub-btn" style={sheetCloseBtn}>
            <X className="w-4 h-4" style={{ color: BUBBLE.ink }} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: BUBBLE.faint, marginBottom: 6, display: "block" }}>Display name (shown in box)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. My App, @yourhandle, yourbrand"
              maxLength={20}
              style={inputStyle}
              autoFocus
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: BUBBLE.faint, marginBottom: 6, display: "block" }}>Link (app URL, website, or @handle)</label>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://myapp.com or @yourhandle"
              style={inputStyle}
            />
          </div>

          {/* Live preview of how the sponsor box will look */}
          {(preview || fetchingPreview) && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 16,
              background: "rgba(245,158,11,0.08)", border: "1px solid rgba(217,119,6,0.25)",
            }}>
              {fetchingPreview ? (
                <span style={{ fontSize: 12, color: BUBBLE.faint }}>Fetching preview…</span>
              ) : (
                <>
                  {preview?.image ? (
                    <img src={preview.image} alt="" style={{ width: 40, height: 40, borderRadius: 12, objectFit: "cover", flexShrink: 0 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : preview?.favicon ? (
                    <img src={preview.favicon} alt="" style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(245,158,11,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>🔗</div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: BUBBLE.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {preview?.title || label || "Your sponsor"}
                    </div>
                    {preview?.description && (
                      <div style={{ fontSize: 11, color: BUBBLE.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {preview.description}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Duration toggle bar */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: BUBBLE.faint, marginBottom: 8, display: "block" }}>How long should it run?</label>
            <div style={{ display: "flex", gap: 6, width: "100%" }}>
              {dayOptions.map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  style={{
                    flex: 1, height: 40, borderRadius: 13,
                    ...rowCard(days === d),
                    color: days === d ? BUBBLE.brand : BUBBLE.sub,
                    fontSize: 13, fontWeight: 800, cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {d === 1 ? "1 day" : `${d} days`}
                </button>
              ))}
            </div>
          </div>

          {/* Cost summary */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px", borderRadius: 16,
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(217,119,6,0.25)",
          }}>
            <div>
              <div style={{ fontSize: 12, color: BUBBLE.sub, fontWeight: 700 }}>${PRICE_PER_DAY}/day x {days} {days === 1 ? "day" : "days"}</div>
              <div style={{ fontSize: 11, color: BUBBLE.faint }}>Visible to everyone in the lobby</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#D97706", fontVariantNumeric: "tabular-nums" }}>
              ${total}
            </div>
          </div>

          <button
            onClick={() => {
              const t = label.trim();
              if (!t) { toast.error("Enter a display name"); return; }
              if (!link.trim()) { toast.error("Enter a link or handle"); return; }
              onSubmit(t, link.trim(), days);
            }}
            className="bub-btn bub-btn-primary"
            style={{
              ...ctaStyle,
              width: "100%", height: 52, fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginTop: 4,
            }}
          >
            Pay ${total} & Submit
          </button>
        </div>
      </div>
    </div>
  );
};
