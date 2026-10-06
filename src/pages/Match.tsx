import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMatchConnectionContext } from "@/contexts/MatchConnectionContext";
import { getDisplayName } from "@/lib/localUser";
import { RadarPulse, CloseIcon } from "@/components/MatchIcons";
import { HalloweenOverlay } from "@/components/HalloweenOverlay";
import { isHalloweenSeason, HALLOWEEN } from "@/lib/halloween";
import { recordMatch, matchesLeft } from "@/lib/limits";
import { useTier } from "@/hooks/useTier";
import { toast } from "sonner";

type Mode = "solo" | "group" | "blind";

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

  return (
    <div className="relative min-h-screen flex flex-col bg-app overflow-hidden">
      {/* ── Full-bleed webcam feed ── */}
      <div className="absolute inset-0 overflow-hidden bg-black">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scaleX(-1)", objectPosition: "center top" }}
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />
      </div>

      {/* ── Centered search content ── */}
      {/* Spooky season particles above the dimmed camera */}
      {isHalloweenSeason() && <HalloweenOverlay zIndex={5} density={10} />}

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 w-full">
        <div style={{ filter: `drop-shadow(0 0 30px ${isHalloweenSeason() ? HALLOWEEN.pumpkin + "88" : "rgba(124,92,255,0.5)"})` }}>
          <RadarPulse className="mb-8" />
        </div>

        <h2 className="text-3xl font-bold tracking-tight mb-2 text-white" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>
          {showMatched ? (peerName ? `Matched with ${peerName}!` : "Match found!") : "Finding your match"}
        </h2>
        <p className="text-white/90 text-center mb-1" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>{statusText}</p>

        <div className="mt-4 text-4xl font-bold tabular-nums text-white" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>
          {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
        </div>
      </div>

      {/* ── Single cancel button ── */}
      <div className="relative z-10 px-4 flex justify-center" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 28px)" }}>
        <button onClick={handleCancel} className="btn-glass flex items-center gap-2">
          <CloseIcon className="w-4 h-4" /> Cancel
        </button>
      </div>
    </div>
  );
};

export default Match;
