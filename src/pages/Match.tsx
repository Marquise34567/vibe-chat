import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMatchConnectionContext } from "@/contexts/MatchConnectionContext";
import { getDisplayName } from "@/lib/localUser";
import { RadarPulse, CloseIcon } from "@/components/MatchIcons";

type Mode = "solo" | "group" | "blind";

const Match = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const countries = useMemo(() => params.get("countries")?.split(",").filter(Boolean) ?? [], [params]);
  const gender = params.get("gender") ?? "any";
  const mode = (params.get("mode") as Mode) ?? "solo";
  const scholarOnly = params.get("scholar") === "true";

  const [seconds, setSeconds] = useState(0);

  const { state: connState, onlineCount, peerId, peerName, search, cancel, setDisplayName, startCamera, localVideoRef } = useMatchConnectionContext();

  // Start webcam immediately on mount (uses the shared match connection stream)
  useEffect(() => { startCamera(); }, [startCamera]);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Start searching via WebSocket on mount.
  useEffect(() => {
    setDisplayName(getDisplayName());
    search({
      mode,
      gender: gender === "Any" ? "any" : gender,
      scholarOnly,
      countries,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigate to chat room ONLY when WebRTC is actually connected
  useEffect(() => {
    if (connState === "connected" && peerId) {
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
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 w-full">
        <div style={{ filter: "drop-shadow(0 0 30px rgba(124,92,255,0.5))" }}>
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
      <div className="relative z-10 px-4 pb-8 flex justify-center">
        <button onClick={handleCancel} className="btn-glass flex items-center gap-2">
          <CloseIcon className="w-4 h-4" /> Cancel
        </button>
      </div>
    </div>
  );
};

export default Match;
