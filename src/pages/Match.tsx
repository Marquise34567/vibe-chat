import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMatchConnectionContext } from "@/contexts/MatchConnectionContext";
import { getDisplayName } from "@/lib/localUser";
import { RadarPulse, CloseIcon, FrenzyFace } from "@/components/MatchIcons";
import { HalloweenOverlay } from "@/components/HalloweenOverlay";
import { isHalloweenSeason, HALLOWEEN } from "@/lib/halloween";
import { recordMatch, matchesLeft } from "@/lib/limits";
import { useTier } from "@/hooks/useTier";
import { BUBBLE, chipStyle, ghostPillStyle } from "@/lib/bubble";
import { toast } from "sonner";

type Mode = "solo" | "group" | "blind";

const MODE_CHIP: Record<string, { icon: string; label: string }> = {
  solo: { icon: "⚡", label: "Solo" },
  duo: { icon: "👯", label: "Duo" },
  group: { icon: "🎉", label: "Group" },
  blind: { icon: "🎭", label: "Blind" },
};

const Match = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const countries = useMemo(() => params.get("countries")?.split(",").filter(Boolean) ?? [], [params]);
  const gender = params.get("gender") ?? "any";
  const mode = (params.get("mode") as Mode) ?? "solo";
  const scholarOnly = params.get("scholar") === "true";

  const [seconds, setSeconds] = useState(0);
  const { tier, loading: tierLoading } = useTier();

  const { state: connState, onlineCount, peerId, peerName, search, cancel, setDisplayName, startCamera, localVideoRef } = useMatchConnectionContext();

  // Hard paywall — free users hit the daily match cap → bounce to /plus
  useEffect(() => {
    if (tierLoading) return;
    if (tier === "free" && matchesLeft() <= 0) {
      toast.error("You're out of free matches for today");
      navigate("/plus?reason=limit", { replace: true });
    }
  }, [tier, tierLoading, navigate]);

  // Start webcam immediately on mount (uses the shared match connection stream)
  useEffect(() => { startCamera(); }, [startCamera]);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Start searching via WebSocket on mount.
  // Runs every time Match mounts (including after skip navigates back here).
  useEffect(() => {
    if (tierLoading) return; // wait for tier to resolve before deciding
    if (tier === "free" && matchesLeft() <= 0) return; // capped — paywall redirect handles UX
    setDisplayName(getDisplayName());
    // Small delay to let the skip transition settle
    const t = setTimeout(() => {
      search({
        mode,
        gender: gender === "Any" ? "any" : gender,
        scholarOnly,
        countries,
      });
    }, 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, tierLoading]);

  // Navigate to chat room ONLY when WebRTC is actually connected
  useEffect(() => {
    if (connState === "connected" && peerId) {
      recordMatch();
      navigate(`/chat/${peerId}?mode=${mode}`, { replace: true });
    }
  }, [connState, peerId, mode, navigate]);

  const handleCancel = () => {
    cancel();
    navigate("/");
  };

  const statusText =
    connState === "connecting" ? "Connecting…" :
    connState === "connected" ? (peerName ? `Connected with ${peerName}!` : "Connected!") :
    connState === "matched" ? "Connecting to peer…" :
    connState === "error" ? "Connection issue" :
    "Searching for someone…";

  // Only show "matched" UI when actually connected (not ghost matched)
  const showMatched = connState === "connected";

  const modeChip = MODE_CHIP[mode] ?? MODE_CHIP.solo;
  const isBlind = mode === "blind";

  return (
    <div
      className="relative flex flex-col overflow-hidden"
      style={{ height: "100dvh", background: BUBBLE.bg, color: BUBBLE.ink }}
    >
      {/* Spooky season particles */}
      {isHalloweenSeason() && <HalloweenOverlay zIndex={5} density={10} />}

      {/* ── Top bar — logo + online chip ── */}
      <div className="relative z-10 flex items-center justify-between px-4" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 14px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: 11, background: BUBBLE.card, border: `1px solid ${BUBBLE.border}`, boxShadow: "inset 0 -2px 0 rgba(27,26,51,0.05), 0 4px 12px rgba(27,26,51,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FrenzyFace className="w-[18px] h-[18px]" />
          </div>
          <span className="ff-wordmark" style={{ fontSize: 15 }}>facefrenzy</span>
        </div>
        {typeof onlineCount === "number" && onlineCount > 0 && (
          <span style={{ ...chipStyle, gap: 6, padding: "6px 12px" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px rgba(34,197,94,0.7)", animation: "ff-core-pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 800 }}>{onlineCount.toLocaleString("en-US")} online</span>
          </span>
        )}
      </div>

      {/* ── Centered search content ── */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center px-4 w-full gap-4">
        {/* Webcam card */}
        <div
          style={{
            position: "relative", height: "min(38dvh, 340px)", aspectRatio: "4/5",
            borderRadius: 28, overflow: "hidden",
            background: "#101019", border: `5px solid ${BUBBLE.card}`,
            boxShadow: BUBBLE.cardShadow,
            flexShrink: 0,
          }}
        >
          {isBlind ? (
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, #F1E9FF 0%, #FDE8F3 55%, #E9E4FF 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} style={{
                    width: 6, borderRadius: 3, background: "#FF4D8D",
                    height: [26, 44, 62, 80, 62, 44, 26][i],
                    opacity: 0.55,
                    animation: `ff-wave-bar 1.5s ease-in-out ${i * 0.1}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          ) : (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: "scaleX(-1)", objectPosition: "center top" }}
            />
          )}
          {/* Searching chip on the card */}
          <div style={{ position: "absolute", top: 10, left: 10 }}>
            <span style={{ ...chipStyle, gap: 6, padding: "5px 12px" }}>
              <span style={{ fontSize: 13 }}>{modeChip.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.4px" }}>{modeChip.label}</span>
            </span>
          </div>
        </div>

        {/* Radar */}
        <div style={{ filter: `drop-shadow(0 0 26px ${isHalloweenSeason() ? HALLOWEEN.pumpkin + "88" : "rgba(124,92,255,0.45)"})`, flexShrink: 0 }}>
          <RadarPulse />
        </div>

        {/* Status */}
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(24px, 6vw, 32px)", fontWeight: 900, letterSpacing: "-1px", color: BUBBLE.ink, marginBottom: 4 }}>
            {showMatched ? (peerName ? `Matched with ${peerName}!` : "Match found!") : "Finding your match"}
          </h2>
          <p style={{ fontSize: 15, color: BUBBLE.sub, fontWeight: 600 }}>{statusText}</p>
        </div>

        <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-0.5px", color: BUBBLE.ink, fontVariantNumeric: "tabular-nums" }}>
          {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
        </div>
      </div>

      {/* ── Cancel — white ghost pill ── */}
      <div className="relative z-10 px-4 flex justify-center" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 28px)" }}>
        <button
          onClick={handleCancel}
          className="bub-btn bub-btn-ghost"
          style={{
            ...ghostPillStyle,
            padding: "13px 30px", fontSize: 15,
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <CloseIcon className="w-4 h-4" style={{ color: BUBBLE.pink }} /> Cancel
        </button>
      </div>
    </div>
  );
};

export default Match;
