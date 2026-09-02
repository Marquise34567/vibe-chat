import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  PlayIcon, SoloModeIcon, DuoModeIcon, GroupModeIcon, BlindModeIcon,
  PlusIcon,
} from "@/components/FaceFrenzyIcons";

/* ═══════════════════════════════════════════════════════════════
   FaceFrenzy Lobby — "You Are The Lobby"

   Design philosophy:
   - Your live camera fills the entire screen as the background
   - A dark gradient scrim makes UI readable on top
   - Floating glass controls at the bottom
   - Bold, oversized mode name overlaid on your face
   - The CTA is the only yellow thing — it's the star
   - Everything else is glass + white text
   - Blind mode: no camera, full-screen animated gradient instead

   This creates instant immersion — you're already IN the app.
   One tap and you're connected.
═══════════════════════════════════════════════════════════════ */

type Mode = "solo" | "group" | "blind";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>("solo");
  const [gender, setGender] = useState<Gender>("both");
  const [region, setRegion] = useState<Region>("worldwide");
  const [scholarOnly, setScholarOnly] = useState(false);
  const [realOnlineCount, setRealOnlineCount] = useState(0);
  const [fakeOnlineBase, setFakeOnlineBase] = useState(60760);
  const [matchCount, setMatchCount] = useState(12847);
  const [feedIdx, setFeedIdx] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showRegionPicker, setShowRegionPicker] = useState(false);
  const [genderExpanded, setGenderExpanded] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [pendingShareUrl, setPendingShareUrl] = useState<string | null>(null);
  const [showSponsorSheet, setShowSponsorSheet] = useState(false);
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

  useEffect(() => { camStart(); return () => camStop(); }, [camStart, camStop]);

  // ── Decorative counters (fake baseline + real server count) ──
  useEffect(() => {
    const t = setInterval(() => setFakeOnlineBase((c) => c + Math.floor(Math.random() * 7) - 3), 3000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setMatchCount((c) => c + Math.floor(Math.random() * 3) + 1), 2000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setFeedIdx((i) => (i + 1) % ACTIVITY_FEED.length), 3500);
    return () => clearInterval(t);
  }, []);

  // Displayed online count = fake baseline + real server count
  const onlineCount = fakeOnlineBase + realOnlineCount;

  // ── Connect to match server for real online count ──
  useEffect(() => {
    const MATCH_SERVER_URL =
      (import.meta as any).env?.VITE_MATCH_SERVER_URL ?? "ws://localhost:8090";
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      try {
        ws = new WebSocket(MATCH_SERVER_URL);
        ws.onopen = () => {
          // Register country so server knows our location
          fetch("https://ipapi.co/json/").then((r) => r.json()).then((d) => {
            if (d.country_code && ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "register", country: d.country_code.toUpperCase() }));
            }
          }).catch(() => {});
        };
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "presence" || msg.type === "connected" || msg.type === "searching") {
              if (typeof msg.onlineCount === "number") setRealOnlineCount(msg.onlineCount);
            }
          } catch { /* ignore */ }
        };
        ws.onclose = () => {
          reconnectTimer = setTimeout(connect, 5000);
        };
        ws.onerror = () => { try { ws?.close(); } catch {} };
      } catch { /* ignore */ }
    };
    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try { ws?.close(); } catch {}
    };
  }, []);

  const startMatch = () => {
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

  const fmt = (n: number) => n.toLocaleString("en-US");

  const modeMeta: Record<Mode, { desc: string; icon: typeof SoloModeIcon; accent: string; label: string; gradient: string }> = {
    solo:  { desc: "1-on-1 random video chat",              icon: SoloModeIcon,  accent: "#7C5CFF", label: "SOLO",  gradient: "rgba(124,92,255,0.6)" },
    group: { desc: "Bring friends. Meet more.",              icon: GroupModeIcon, accent: "#FFD60A", label: "GROUP", gradient: "rgba(255,214,10,0.5)" },
    blind: { desc: "Voice first. Cameras reveal at 30s.",    icon: BlindModeIcon, accent: "#FF4D8D", label: "BLIND", gradient: "rgba(255,77,141,0.5)" },
  };

  const accent = modeMeta[mode].accent;
  const isBlind = mode === "blind";

  // Scan self-preview in lobby for NSFW — warn but don't kill camera
  useEffect(() => {
    if (camStatus !== "active" || isBlind) return;
    startLobbyScan(videoRef, "local", (report) => {
      console.warn("[moderation] Lobby self-violation:", report);
      setModerationWarning(`Inappropriate content detected on your camera. Please adjust before matching.`);
      setTimeout(() => setModerationWarning(null), 5000);
    });
    return () => stopLobbyScan();
  }, [camStatus, isBlind, startLobbyScan, stopLobbyScan, videoRef]);

  return (
    <div style={{ position: "relative", minHeight: "100dvh", overflow: "hidden", background: "#050508", color: "#fff", display: "flex", flexDirection: "column" }} data-room-id={roomId ?? undefined}>
      {/* ═══════════════════════════════════════════════════
          LAYER 0 — Full-bleed camera OR split with friend
      ═══════════════════════════════════════════════════ */}
      {!isBlind && !friendConnected && (
        <>
          {/* Full-screen camera — solo */}
          <video
            ref={videoRef}
            autoPlay playsInline muted
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover", transform: "scaleX(-1)",
              objectPosition: "center top",
              opacity: camStatus === "active" ? 1 : 0,
              transition: "opacity 0.6s ease",
              zIndex: 0,
            }}
          />
          {/* Camera states overlay */}
          {camStatus !== "active" && (
            <div style={{ position: "absolute", inset: 0, zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "linear-gradient(180deg, #0A0A14 0%, #14142A 50%, #0A0A14 100%)" }}>
              {(camStatus === "denied" || camStatus === "error") && (
                <button onClick={camStart} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, background: "transparent", border: "none", cursor: "pointer" }}>
                  <div style={{ width: 64, height: 64, borderRadius: 32, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {camStatus === "denied" ? <CameraOff style={{ width: 28, height: 28, color: "rgba(255,255,255,0.4)" }} /> : <Camera style={{ width: 28, height: 28, color: "rgba(255,255,255,0.4)" }} />}
                  </div>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>{camError || "Tap to enable camera"}</span>
                </button>
              )}
              {camStatus === "requesting" && (
                <>
                  <RefreshCw className="animate-spin" style={{ width: 32, height: 32, color: "rgba(255,255,255,0.3)" }} />
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Starting camera…</span>
                </>
              )}
              {camStatus === "idle" && (
                <button onClick={camStart} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, background: "transparent", border: "none", cursor: "pointer" }}>
                  <div style={{ width: 64, height: 64, borderRadius: 32, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Camera style={{ width: 28, height: 28, color: "rgba(255,255,255,0.4)" }} />
                  </div>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Tap to preview</span>
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Split-screen — you + friend side by side */}
      {!isBlind && friendConnected && (
        <div style={{ position: "absolute", inset: 0, zIndex: 0, display: "flex" }}>
          {/* Left — your camera */}
          <div style={{ width: "50%", height: "100%", position: "relative", overflow: "hidden" }}>
            <video
              ref={videoRef}
              autoPlay playsInline muted
              style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", objectPosition: "center top" }}
            />
            <div style={{ position: "absolute", bottom: 16, left: 16, padding: "4px 10px", borderRadius: 12, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", fontSize: 12, fontWeight: 700, color: "#fff" }}>You</div>
          </div>
          {/* Right — friend's camera */}
          <div style={{ width: "50%", height: "100%", position: "relative", overflow: "hidden", background: "#0A0A14" }}>
            <video
              ref={friendVideoRef}
              autoPlay playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
            />
            <div style={{ position: "absolute", bottom: 16, left: 16, padding: "4px 10px", borderRadius: 12, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", fontSize: 12, fontWeight: 700, color: "#fff" }}>Friend</div>
            {/* Pulsing green dot for connected */}
            <div style={{ position: "absolute", top: 16, right: 16, display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 12, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px rgba(34,197,94,0.8)", animation: "ff-core-pulse 2s ease-in-out infinite" }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.5px" }}>Connected</span>
            </div>
          </div>
        </div>
      )}

      {/* Waiting for friend overlay */}
      {!isBlind && lobbyState === "waiting" && !friendConnected && (
        <div style={{ position: "absolute", inset: 0, zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "rgba(5,5,8,0.7)", backdropFilter: "blur(8px)" }}>
          <RefreshCw className="animate-spin" style={{ width: 32, height: 32, color: "#FFD60A" }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Waiting for friend…</span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Share your invite link</span>
        </div>
      )}

      {/* Blind mode — animated gradient background */}
      {isBlind && (
        <div style={{ position: "absolute", inset: 0, zIndex: 0, background: "linear-gradient(160deg, #1A0820 0%, #0A0A14 40%, #14081A 100%)" }}>
          {/* Floating voice waves */}
          <div style={{ position: "absolute", left: "50%", top: "45%", transform: "translate(-50%, -50%)", display: "flex", alignItems: "center", gap: 6 }}>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={{
                width: 6, borderRadius: 3, background: accent,
                height: [40, 70, 100, 130, 100, 70, 40][i],
                opacity: 0.3,
                animation: `ff-wave-bar 1.5s ease-in-out ${i * 0.1}s infinite`,
              }} />
            ))}
          </div>
          {/* Glow */}
          <div style={{ position: "absolute", left: "50%", top: "45%", transform: "translate(-50%, -50%)", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${accent}15 0%, transparent 70%)`, filter: "blur(40px)" }} />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          LAYER 1 — Scrim gradients for readability
      ═══════════════════════════════════════════════════ */}
      {/* Top scrim */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 200, zIndex: 2, pointerEvents: "none", background: "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)" }} />
      {/* Bottom scrim — heavier for the dock */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "55%", zIndex: 2, pointerEvents: "none", background: "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)" }} />
      {/* Accent tint at bottom */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", zIndex: 2, pointerEvents: "none", background: `linear-gradient(0deg, ${accent}12 0%, transparent 100%)` }} />

      {/* ═══════════════════════════════════════════════════
          LAYER 2 — Top bar (floating glass)
      ═══════════════════════════════════════════════════ */}
      <div style={{ position: "relative", zIndex: 10, paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", paddingLeft: 20, paddingRight: 20, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        {/* Right cluster */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Online pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 20,
            background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px rgba(34,197,94,0.8)", animation: "ff-core-pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{fmt(onlineCount)}</span>
          </div>

          {/* Menu */}
          <button onClick={() => setShowSettings(true)} aria-label="Settings"
            style={{
              width: 38, height: 38, borderRadius: 19,
              background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              transition: "transform 0.2s ease, background 0.2s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08) rotate(90deg)"; e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1) rotate(0)"; e.currentTarget.style.background = "rgba(0,0,0,0.3)"; }}
          >
            <Menu className="w-4 h-4" style={{ color: "#fff" }} />
          </button>
        </div>
      </div>

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
          <span style={{ fontSize: 22 }}>⚠️</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{moderationWarning}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          LAYER 3 — Activity ticker (decorative lobby ambiance)
      ═══════════════════════════════════════════════════ */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "center", paddingTop: 10 }}>
        <div key={feedIdx} className="animate-fade-in" style={{
          fontSize: 12, color: "rgba(255,255,255,0.6)", padding: "5px 14px", borderRadius: 16,
          background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        }}>
          <span style={{ color: "#fff", fontWeight: 700 }}>{ACTIVITY_FEED[feedIdx].name}</span>
          {" "}{ACTIVITY_FEED[feedIdx].flag} {ACTIVITY_FEED[feedIdx].action}{" "}
          <span style={{ color: accent, fontWeight: 700 }}>{ACTIVITY_FEED[feedIdx].target}</span>
          {ACTIVITY_FEED[feedIdx].flag2 && ` ${ACTIVITY_FEED[feedIdx].flag2}`}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          LAYER 4 — Hero text overlay (on the camera)
      ═══════════════════════════════════════════════════ */}
      <div style={{ flex: 1, position: "relative", zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
        {/* Big mode label */}
        <div key={friendConnected ? "duo" : mode} style={{ animation: "ff-slide-up 0.5s ease", textAlign: "center" }}>
          {/* Brand wordmark — matches tab title */}
          <div style={{
            fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px",
            color: "#FFD60A", textShadow: "0 2px 16px rgba(255,214,10,0.3)",
            marginBottom: 6,
          }}>
            FaceFrenzy
          </div>
          <h1 style={{
            fontSize: 56, fontWeight: 900, letterSpacing: "-2px", lineHeight: 1,
            color: "#fff", textShadow: "0 4px 24px rgba(0,0,0,0.5)",
            marginBottom: 8,
          }}>
            {friendConnected ? "DUO" : modeMeta[mode].label}
          </h1>
          <p style={{
            fontSize: 16, color: "rgba(255,255,255,0.7)", fontWeight: 500,
            textShadow: "0 2px 12px rgba(0,0,0,0.5)",
            marginBottom: 4,
          }}>
            {friendConnected ? "You and your friend — ready to match" : modeMeta[mode].desc}
          </p>
          <p style={{
            fontSize: 13, color: "rgba(255,255,255,0.45)", fontWeight: 600,
            textShadow: "0 2px 12px rgba(0,0,0,0.5)",
          }}>
            The #1 Omegle Alternative
          </p>
        </div>

        {/* Match counter — decorative */}
        <div style={{
          marginTop: 20, display: "flex", alignItems: "center", gap: 8,
          padding: "7px 16px", borderRadius: 20,
          background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FFD60A", boxShadow: "0 0 8px rgba(255,214,10,0.7)", animation: "ff-core-pulse 1.5s ease-in-out infinite" }} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>today</span>
          <span style={{ fontSize: 15, color: "#FFD60A", fontVariantNumeric: "tabular-nums", fontWeight: 800 }}>{fmt(matchCount)}</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>matches</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          LAYER 5 — Floating glass dock (the control center)
      ═══════════════════════════════════════════════════ */}
      <div style={{ position: "relative", zIndex: 10, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)", paddingLeft: 12, paddingRight: 12, animation: "ff-dock-rise 0.6s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        <div style={{
          borderRadius: 28, padding: "16px 14px 14px",
          background: "rgba(8,8,14,0.7)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
          boxShadow: `0 -8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)`,
        }}>
          {/* Mode selector — 3 pills */}
          <div style={{ display: "flex", gap: 7, marginBottom: 12 }}>
            {(["solo", "group", "blind"] as Mode[]).map((m, idx) => {
              const meta = modeMeta[m];
              const Icon = meta.icon;
              const selected = mode === m;
              return (
                <button key={m} onClick={() => setMode(m)}
                  style={{
                    flex: 1, height: 56, borderRadius: 18,
                    background: selected ? `linear-gradient(160deg, ${meta.accent}25, ${meta.accent}05)` : "rgba(255,255,255,0.03)",
                    border: selected ? `1.5px solid ${meta.accent}55` : "1px solid rgba(255,255,255,0.05)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    cursor: "pointer",
                    transition: "all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
                    transform: selected ? "translateY(-3px)" : "none",
                    boxShadow: selected ? `0 8px 24px ${meta.accent}20` : "none",
                    position: "relative", overflow: "hidden",
                    animation: `ff-pill-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) ${idx * 0.08}s both`,
                  }}
                  onMouseEnter={(e) => { if (!selected) e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={(e) => { if (!selected) e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  {selected && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 0%, ${meta.accent}15, transparent 70%)`, pointerEvents: "none" }} />}
                  {/* Shimmer sweep on selected */}
                  {selected && (
                    <div style={{
                      position: "absolute", top: 0, bottom: 0, width: "40%",
                      background: `linear-gradient(90deg, transparent, ${meta.accent}20, transparent)`,
                      animation: "ff-shimmer 3s ease-in-out infinite",
                      pointerEvents: "none",
                    }} />
                  )}
                  <Icon key={mode} style={{ width: 22, height: 22, opacity: selected ? 1 : 0.35, zIndex: 1, animation: selected ? "ff-icon-bounce 0.5s ease" : "none" }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: selected ? "#fff" : "rgba(255,255,255,0.3)", zIndex: 1, letterSpacing: "0.5px" }}>{meta.label}</span>
                </button>
              );
            })}
          </div>

          {/* Preferences row — gender + region + scholar */}
          <div style={{ display: "flex", gap: 7, marginBottom: 12, justifyContent: "center" }}>
            {/* Gender pill — collapsed shows 1, tap expands */}
            <div style={{
              height: 42, borderRadius: 21, overflow: "hidden",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
              display: "flex", alignItems: "center",
              transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            }}>
              {genderExpanded ? (
                [
                  { id: "both" as Gender, label: "Both", icon: "♀♂" },
                  { id: "girls" as Gender, label: "Girls", icon: "♀" },
                  { id: "guys" as Gender, label: "Guys", icon: "♂" },
                ].map((g) => (
                  <button key={g.id} onClick={() => { setGender(g.id); setGenderExpanded(false); }}
                    style={{
                      height: "100%", border: "none", padding: "0 14px",
                      background: gender === g.id ? "rgba(255,214,10,0.15)" : "transparent",
                      cursor: "pointer", color: gender === g.id ? "#FFD60A" : "rgba(255,255,255,0.5)",
                      fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", transition: "all 0.2s ease",
                      display: "flex", alignItems: "center", gap: 4,
                      transform: gender === g.id ? "scale(1.05)" : "scale(1)",
                    }}>
                    <span style={{ fontSize: 13, opacity: 0.7 }}>{g.icon}</span>
                    {g.label}
                  </button>
                ))
              ) : (
                <button onClick={() => setGenderExpanded(true)}
                  style={{
                    height: "100%", border: "none", padding: "0 16px", background: "transparent",
                    cursor: "pointer", color: "#FFD60A", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
                    display: "flex", alignItems: "center", gap: 6,
                    transition: "transform 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <span style={{ fontSize: 15, opacity: 0.8 }}>{gender === "both" ? "♀♂" : gender === "girls" ? "♀" : "♂"}</span>
                  {gender === "both" ? "Both" : gender === "girls" ? "Girls" : "Guys"}
                  <ChevronRight style={{ width: 13, height: 13, color: "rgba(255,255,255,0.25)", transform: "rotate(90deg)" }} />
                </button>
              )}
            </div>

            {/* Region */}
            <button onClick={() => setShowRegionPicker(true)}
              style={{
                height: 42, padding: "0 14px", borderRadius: 21,
                background: region !== "worldwide" ? "rgba(255,214,10,0.10)" : "rgba(255,255,255,0.04)",
                border: region !== "worldwide" ? "1px solid rgba(255,214,10,0.25)" : "1px solid rgba(255,255,255,0.07)",
                color: region !== "worldwide" ? "#FFD60A" : "rgba(255,255,255,0.5)",
                fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <Globe style={{ width: 15, height: 15 }} />
              <span style={{ fontSize: 14 }}>{REGIONS.find((r) => r.id === region)?.flag}</span>
              <span style={{ maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis" }}>{REGIONS.find((r) => r.id === region)?.label}</span>
            </button>

            {/* Scholar */}
            <button onClick={() => setScholarOnly(!scholarOnly)}
              style={{
                height: 42, width: 42, borderRadius: 21, flexShrink: 0,
                background: scholarOnly ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
                border: scholarOnly ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(255,255,255,0.07)",
                color: scholarOnly ? "#22c55e" : "rgba(255,255,255,0.4)",
                cursor: "pointer", transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                transform: scholarOnly ? "scale(1.05)" : "scale(1)",
                animation: scholarOnly ? "ff-icon-bounce 0.4s ease" : "none",
              }}
              onMouseEnter={(e) => { if (!scholarOnly) e.currentTarget.style.transform = "scale(1.08)"; }}
              onMouseLeave={(e) => { if (!scholarOnly) e.currentTarget.style.transform = "scale(1)"; }}
            >
              <GraduationCap style={{ width: 18, height: 18 }} />
            </button>
          </div>

          {/* CTA row — centered */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center" }}>
            {/* Invite — opens custom share sheet */}
            <button
              onClick={() => {
                const openSheet = (url: string) => { setPendingShareUrl(url); setShowShareSheet(true); };
                if (!roomId) {
                  createRoom();
                  setTimeout(() => openSheet(`${window.location.origin}/?invite=${roomId}`), 1500);
                } else {
                  openSheet(`${window.location.origin}/?invite=${roomId}`);
                }
              }}
              aria-label="Invite friends"
              style={{
                width: 44, height: 44, borderRadius: 22, flexShrink: 0,
                background: friendConnected ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)",
                border: friendConnected ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease",
                animation: friendConnected ? "ff-btn-glow 2s ease-in-out infinite" : "none",
                color: friendConnected ? "#22c55e" : "#FFD60A",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.93)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <PlusIcon style={{ width: 18, height: 18, color: friendConnected ? "#22c55e" : "#FFD60A" }} />
            </button>

            {/* Start — GROUP requires a friend first, otherwise normal */}
            {mode === "group" && !friendConnected ? (
              <button
                onClick={() => {
                  const openSheet = (url: string) => { setPendingShareUrl(url); setShowShareSheet(true); };
                  if (!roomId) {
                    createRoom();
                    setTimeout(() => openSheet(`${window.location.origin}/?invite=${roomId}`), 1500);
                  } else {
                    openSheet(`${window.location.origin}/?invite=${roomId}`);
                  }
                }}
                style={{
                  height: 44, padding: "0 22px", borderRadius: 22,
                  background: "rgba(255,214,10,0.12)", border: "1px solid rgba(255,214,10,0.3)",
                  color: "#FFD60A", fontSize: 14, fontWeight: 800, letterSpacing: "0.2px",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)", position: "relative",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <PlusIcon style={{ width: 16, height: 16 }} />
                Invite Friends
              </button>
            ) : (
              <button onClick={startMatch}
                style={{
                  height: 44, padding: "0 28px", borderRadius: 22,
                  background: "linear-gradient(180deg, #FFE45E 0%, #F5D000 100%)",
                  color: "#0A0A0F", fontSize: 14, fontWeight: 800, letterSpacing: "0.2px",
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: "0 6px 20px rgba(245,208,0,0.35), inset 0 1px 0 rgba(255,255,255,0.6)",
                  transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)", position: "relative",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <div style={{ position: "absolute", inset: -3, borderRadius: 25, background: "linear-gradient(180deg, #FFE45E, #F5D000)", opacity: 0.3, filter: "blur(12px)", animation: "ff-cta-pulse 2.5s ease-in-out infinite", zIndex: -1 }} />
                {/* Expanding ring on hover */}
                <div style={{ position: "absolute", inset: 0, borderRadius: 22, border: "2px solid #FFD60A", pointerEvents: "none", animation: "ff-cta-ring 2s ease-out infinite" }} />
                <PlayIcon style={{ width: 16, height: 16 }} />
                Start Video Chat
              </button>
            )}

            {/* Leave friend — only when connected */}
            {friendConnected && (
              <button
                onClick={() => { leaveRoom(); setSearchParams({}); }}
                style={{
                  width: 44, height: 44, borderRadius: 22, flexShrink: 0,
                  background: "rgba(255,77,141,0.12)", border: "1px solid rgba(255,77,141,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.93)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                aria-label="Leave friend"
              >
                <X style={{ width: 18, height: 18, color: "#FF4D8D" }} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          SPONSOR BOXES — right side of lobby, prominent
      ═══════════════════════════════════════════════════ */}
      <div style={{
        position: "fixed", right: 14, top: "50%", transform: "translateY(-50%)",
        display: "flex", flexDirection: "column", gap: 10, zIndex: 50,
      }}>
        {/* Header */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 2, marginBottom: 4,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 900, color: "#FFD60A",
            textTransform: "uppercase", letterSpacing: 2, textAlign: "center",
            textShadow: "0 1px 8px rgba(255,214,10,0.4)",
          }}>
            Sponsors
          </div>
          <div style={{ width: 24, height: 2, borderRadius: 1, background: "rgba(255,214,10,0.4)" }} />
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
                width: 88, height: 88, borderRadius: 16,
                background: sponsor
                  ? "linear-gradient(135deg, rgba(255,214,10,0.18), rgba(107,76,255,0.12))"
                  : "rgba(255,255,255,0.03)",
                border: sponsor
                  ? "1.5px solid rgba(255,214,10,0.35)"
                  : "1px dashed rgba(255,255,255,0.12)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                cursor: "pointer", gap: 4, padding: 6, overflow: "hidden",
                transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), border-color 0.3s, box-shadow 0.3s",
                backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                boxShadow: sponsor ? "0 4px 20px rgba(255,214,10,0.1)" : "none",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.06)";
                if (isEmpty) e.currentTarget.style.borderColor = "rgba(255,214,10,0.4)";
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                if (isEmpty) e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
              }}
            >
              {sponsor ? (
                <>
                  {/* Preview image or favicon */}
                  {preview?.image ? (
                    <img src={preview.image} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : preview?.favicon ? (
                    <img src={preview.favicon} alt="" style={{ width: 28, height: 28, borderRadius: 6 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,214,10,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔗</div>
                  )}
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#FFD60A", textAlign: "center", padding: "0 2px", lineHeight: 1.15, maxWidth: 76, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {preview?.title || sponsor.label}
                  </span>
                  {/* Sponsored badge */}
                  <span style={{ position: "absolute", top: 3, right: 3, fontSize: 6, fontWeight: 700, color: "rgba(255,214,10,0.5)", textTransform: "uppercase", letterSpacing: 0.5 }}>ad</span>
                </>
              ) : (
                <>
                  <div style={{
                    width: 28, height: 28, borderRadius: 14,
                    background: "rgba(255,214,10,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <PlusIcon style={{ width: 16, height: 16, color: "rgba(255,214,10,0.4)" }} />
                  </div>
                  <span style={{ fontSize: 8, color: "rgba(255,214,10,0.4)", fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>
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
            width: 88, padding: "6px 0", borderRadius: 10,
            background: "rgba(255,214,10,0.1)", border: "1px solid rgba(255,214,10,0.2)",
            color: "#FFD60A", fontSize: 9, fontWeight: 800, cursor: "pointer",
            textTransform: "uppercase", letterSpacing: 0.5,
            transition: "transform 0.2s ease, background 0.2s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.background = "rgba(255,214,10,0.18)"; }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.background = "rgba(255,214,10,0.1)"; }}
        >
          Become a Sponsor
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════
          SHEETS
      ═══════════════════════════════════════════════════ */}
      {showRegionPicker && (
        <RegionPickerSheet region={region} setRegion={setRegion} onClose={() => setShowRegionPicker(false)} />
      )}
      {showSettings && (
        <SettingsSheet
          onClose={() => setShowSettings(false)} gender={gender} setGender={setGender}
          scholarOnly={scholarOnly} setScholarOnly={setScholarOnly} scholarVerified={scholarVerified}
          camStatus={camStatus} camError={camError} onRetryCam={camStart}
        />
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

/* ═══════════════════════════════════════════════════════════════
   RegionPickerSheet
═══════════════════════════════════════════════════════════════ */
const RegionPickerSheet = ({ region, setRegion, onClose }: { region: Region; setRegion: (r: Region) => void; onClose: () => void; }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-end" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full animate-sheet-up"
        style={{ background: "#0A0A14", borderRadius: "32px 32px 0 0", padding: 24, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)", borderTop: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 -12px 48px rgba(0,0,0,0.6)" }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 20px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>Pick a region</h2>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 17, background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X className="w-4 h-4" style={{ color: "#fff" }} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {REGIONS.map((r) => {
            const selected = region === r.id;
            return (
              <button key={r.id} onClick={() => { setRegion(r.id); onClose(); }}
                style={{
                  height: 58, padding: "0 16px", borderRadius: 16,
                  background: selected ? "rgba(255,214,0,0.10)" : "rgba(255,255,255,0.03)",
                  border: selected ? "1px solid rgba(255,214,0,0.25)" : "1px solid rgba(255,255,255,0.05)",
                  cursor: "pointer", transition: "all 0.2s ease",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: selected ? "rgba(255,214,0,0.12)" : "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{r.flag}</div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: selected ? "#FFD60A" : "#fff" }}>{r.label}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{r.countries.length === 0 ? "No filter" : `${r.countries.length} countries`}</div>
                  </div>
                </div>
                {selected && (
                  <div style={{ width: 24, height: 24, borderRadius: 12, background: "#FFD60A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
}: {
  onClose: () => void; gender: Gender; setGender: (g: Gender) => void;
  scholarOnly: boolean; setScholarOnly: (v: boolean) => void; scholarVerified: boolean;
  camStatus: string; camError: string | null; onRetryCam: () => void;
}) => {
  const genders: { id: Gender; label: string }[] = [
    { id: "both", label: "Both" }, { id: "girls", label: "Girls" }, { id: "guys", label: "Guys" },
  ];
  return (
    <div className="fixed inset-0 z-[100] flex items-end" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full animate-sheet-up"
        style={{ background: "#0A0A14", borderRadius: "32px 32px 0 0", padding: 24, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)", borderTop: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 -12px 48px rgba(0,0,0,0.6)" }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 20px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>Settings</h2>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 17, background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X className="w-4 h-4" style={{ color: "#fff" }} />
          </button>
        </div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Show me</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {genders.map((g) => (
              <button key={g.id} onClick={() => setGender(g.id)}
                style={{
                  height: 44, borderRadius: 14,
                  background: gender === g.id ? "rgba(255,214,0,0.15)" : "rgba(255,255,255,0.04)",
                  border: gender === g.id ? "1px solid rgba(255,214,0,0.3)" : "1px solid rgba(255,255,255,0.06)",
                  color: gender === g.id ? "#FFD60A" : "#EDEDED", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.2s ease",
                }}>
                {g.id === "both" && <UserCircle className="w-3.5 h-3.5" />}
                {(g.id === "girls" || g.id === "guys") && <User className="w-3.5 h-3.5" />}
                {g.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => setScholarOnly(!scholarOnly)} className="flex items-center justify-between w-full"
            style={{ height: 54, padding: "0 16px", borderRadius: 16, background: scholarOnly ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.04)", border: scholarOnly ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(255,255,255,0.06)", cursor: "pointer", transition: "all 0.2s ease" }}>
            <div className="flex items-center gap-3">
              <div style={{ width: 38, height: 38, borderRadius: 11, background: scholarOnly ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <GraduationCap className="w-4 h-4" style={{ color: scholarOnly ? "#22c55e" : "rgba(255,255,255,0.4)" }} />
              </div>
              <div className="text-left">
                <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Scholars only</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{scholarVerified ? "You're verified 🎓" : "Match with verified students only"}</div>
              </div>
            </div>
            <div style={{ width: 46, height: 28, borderRadius: 14, background: scholarOnly ? "#22c55e" : "rgba(255,255,255,0.1)", padding: 3, transition: "background 0.2s ease", display: "flex", alignItems: "center" }}>
              <div style={{ width: 22, height: 22, borderRadius: 11, background: "#fff", transform: scholarOnly ? "translateX(18px)" : "translateX(0)", transition: "transform 0.2s ease" }} />
            </div>
          </button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Camera</div>
          <button onClick={onRetryCam} className="flex items-center justify-between w-full"
            style={{ height: 54, padding: "0 16px", borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}>
            <div className="flex items-center gap-3">
              <div style={{ width: 38, height: 38, borderRadius: 11, background: camStatus === "active" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {camStatus === "active" ? <Camera className="w-4 h-4" style={{ color: "#22c55e" }} /> : <CameraOff className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} />}
              </div>
              <div className="text-left">
                <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{camStatus === "active" ? "Camera active" : camStatus === "denied" ? "Camera denied" : camStatus === "requesting" ? "Starting…" : "Camera off"}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{camStatus === "active" ? "Your preview is live" : camError || "Tap to enable"}</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
          </button>
        </div>
        <button onClick={onClose} style={{ width: "100%", height: 52, borderRadius: 26, background: "linear-gradient(180deg, #FFE45E 0%, #F5D000 100%)", color: "#0A0A0F", fontSize: 17, fontWeight: 800, border: "none", cursor: "pointer", marginTop: 8, boxShadow: "0 6px 24px rgba(245,208,0,0.25)" }}>Done</button>
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
    { label: "Email",     icon: "📧", color: "#6B4CFF", url: (u: string) => `mailto:?subject=${encodeURIComponent("Join me on FaceFrenzy!")}&body=${encodeURIComponent("Hey! Join me on FaceFrenzy: " + u)}` },
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
    <div className="fixed inset-0 z-[100] flex items-end" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full animate-sheet-up"
        style={{ background: "#0A0A14", borderRadius: "32px 32px 0 0", padding: 24, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)", borderTop: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 -12px 48px rgba(0,0,0,0.6)" }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 20px" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 2 }}>Invite a friend</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Share your link to video chat together</p>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 17, background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <X className="w-4 h-4" style={{ color: "#fff" }} />
          </button>
        </div>

        {/* Link preview */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
          padding: "12px 14px", borderRadius: 14,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(135deg, #7C5CFF, #FF4D8D)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>F</span>
          </div>
          <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>FaceFrenzy invite</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{url}</div>
          </div>
          <button onClick={copyLink}
            style={{
              height: 36, padding: "0 16px", borderRadius: 18, flexShrink: 0,
              background: copied ? "rgba(34,197,94,0.15)" : "rgba(255,214,10,0.12)",
              border: copied ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(255,214,10,0.25)",
              color: copied ? "#22c55e" : "#FFD60A", fontSize: 13, fontWeight: 700,
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
                padding: "16px 8px", borderRadius: 16, textDecoration: "none",
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                cursor: "pointer", transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: `${target.color}22`, border: `1px solid ${target.color}33`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
              }}>
                {target.icon}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{target.label}</span>
            </a>
          ))}
        </div>

        {/* Native share fallback (if available) */}
        {typeof navigator !== "undefined" && (navigator as any).share && (
          <button
            onClick={() => { (navigator as any).share({ title: "FaceFrenzy", text: "Join me on FaceFrenzy!", url }); }}
            style={{
              width: "100%", height: 48, borderRadius: 24,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <PlusIcon style={{ width: 18, height: 18, color: "#FFD60A" }} />
            More share options…
          </button>
        )}
      </div>
    </div>
  );
};

export default StartTab;

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
    <div className="fixed inset-0 z-[100] flex items-end" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full animate-sheet-up"
        style={{ background: "rgba(20,18,30,0.95)", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: "24px 20px 32px", border: "1px solid rgba(255,255,255,0.08)", borderBottom: "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 2 }}>Become a Sponsor</h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>Get your app, product, or social seen by hundreds daily</p>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 17, background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <X className="w-4 h-4" style={{ color: "#fff" }} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 6, display: "block" }}>Display name (shown in box)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. My App, @yourhandle, yourbrand"
              maxLength={20}
              style={{
                width: "100%", height: 48, borderRadius: 14,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#fff", fontSize: 15, fontWeight: 600, padding: "0 16px",
                outline: "none",
              }}
              autoFocus
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 6, display: "block" }}>Link (app URL, website, or @handle)</label>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://myapp.com or @yourhandle"
              style={{
                width: "100%", height: 48, borderRadius: 14,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#fff", fontSize: 15, fontWeight: 600, padding: "0 16px",
                outline: "none",
              }}
            />
          </div>

          {/* Live preview of how the sponsor box will look */}
          {(preview || fetchingPreview) && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 14,
              background: "rgba(255,214,10,0.06)", border: "1px solid rgba(255,214,10,0.15)",
            }}>
              {fetchingPreview ? (
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Fetching preview…</span>
              ) : (
                <>
                  {preview?.image ? (
                    <img src={preview.image} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : preview?.favicon ? (
                    <img src={preview.favicon} alt="" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,214,10,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>🔗</div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#FFD60A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {preview?.title || label || "Your sponsor"}
                    </div>
                    {preview?.description && (
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
            <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 8, display: "block" }}>How long should it run?</label>
            <div style={{ display: "flex", gap: 6, width: "100%" }}>
              {dayOptions.map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  style={{
                    flex: 1, height: 40, borderRadius: 12,
                    background: days === d ? "rgba(255,214,10,0.15)" : "rgba(255,255,255,0.04)",
                    border: days === d ? "1px solid rgba(255,214,10,0.4)" : "1px solid rgba(255,255,255,0.06)",
                    color: days === d ? "#FFD60A" : "rgba(255,255,255,0.5)",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
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
            padding: "14px 16px", borderRadius: 14,
            background: "rgba(255,214,10,0.06)", border: "1px solid rgba(255,214,10,0.15)",
          }}>
            <div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>${PRICE_PER_DAY}/day x {days} {days === 1 ? "day" : "days"}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Visible to everyone in the lobby</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#FFD60A", fontVariantNumeric: "tabular-nums" }}>
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
            style={{
              width: "100%", height: 52, borderRadius: 26,
              background: "linear-gradient(180deg, #FFE45E 0%, #F5D000 100%)",
              color: "#0A0A0F", fontSize: 16, fontWeight: 800,
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 6px 24px rgba(245,208,0,0.25)",
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
