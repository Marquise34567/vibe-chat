import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMatchConnectionContext } from "@/contexts/MatchConnectionContext";
import { getDisplayName } from "@/lib/localUser";
import { toast } from "sonner";
import {
  RadarPulse,
  BackIcon,
  CloseIcon,
  modeIconFor,
} from "@/components/MatchIcons";

const TIPS = [
  "Scanning the globe…",
  "Matching vibes…",
  "Warming up the camera…",
  "Finding someone fun…",
  "Almost there…",
];

type Mode = "solo" | "group" | "blind";

const Match = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const countries = useMemo(() => params.get("countries")?.split(",").filter(Boolean) ?? [], [params]);
  const gender = params.get("gender") ?? "any";
  const mode = (params.get("mode") as Mode) ?? "solo";
  const scholarOnly = params.get("scholar") === "true";

  const [seconds, setSeconds] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);

  const { state: connState, onlineCount, peerId, peerName, search, cancel, disconnect, setDisplayName, startCamera, localVideoRef } = useMatchConnectionContext();

  // Start webcam immediately on mount (uses the shared match connection stream)
  useEffect(() => { startCamera(); }, [startCamera]);

  // Timer + tips
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    const tip = setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), 2000);
    return () => { clearInterval(t); clearInterval(tip); };
  }, []);

  // Start searching via WebSocket on mount.
  // NOTE: do NOT disconnect on unmount — the connection lives in the
  // MatchConnectionProvider so WebRTC survives navigation to /chat/:otherId.
  useEffect(() => {
    // Send our display name so the peer sees it when matched (monkey.app style)
    setDisplayName(getDisplayName());
    search({
      mode,
      gender: gender === "Any" ? "any" : gender,
      scholarOnly,
      countries,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigate to chat room only when WebRTC is actually connected (not just matched)
  // This prevents showing empty video containers when the peer doesn't respond
  useEffect(() => {
    if ((connState === "connected" || connState === "matched") && peerId) {
      navigate(`/chat/${peerId}?mode=${mode}`, { replace: true });
    }
  }, [connState, peerId, mode, navigate]);

  const handleCancel = () => {
    cancel();
    toast("Search cancelled");
    navigate("/");
  };

  const statusText =
    connState === "connecting" ? "Connecting to match server…" :
    connState === "searching" ? (onlineCount > 1 ? `Searching… ${onlineCount} online` : "Searching for someone to match with…") :
    connState === "matched" ? (peerName ? `Matched with ${peerName}! Connecting…` : "Match found! Connecting…") :
    connState === "error" ? "Connection issue — check the match server is running" :
    "Searching…";

  const filterCount = countries.length + (gender !== "any" && gender !== "Any" ? 1 : 0) + (scholarOnly ? 1 : 0);
  const ModeIcon = modeIconFor(mode);
  const camActive = connState !== "idle" && connState !== "error"; // camera is active once connecting/searching

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
        {!camActive && (
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-fuchsia-900 to-rose-900 flex items-center justify-center">
            <span className="text-white/70 text-sm font-semibold px-6 text-center">
              Starting camera…
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
      </div>

      {/* ── Top bar ── */}
      <div className="relative z-10 px-4 pt-4 pb-2 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm font-semibold flex items-center gap-1 text-white/70 hover:text-white">
          <BackIcon className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <span className="badge badge-live"><span className="live-dot" /> {connState === "matched" ? "MATCHED" : "SEARCHING"}</span>
        </div>
      </div>

      {/* ── Centered search content ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 w-full">
        <RadarPulse className="mb-6" />

        <h2 className="text-2xl font-bold tracking-tight mb-2 text-white">
          {connState === "matched" ? (peerName ? `Matched with ${peerName}!` : "Match found!") : "Finding your match"}
        </h2>
        <p className="text-white/80 text-center mb-1">{statusText}</p>
        <p className="text-sm text-white/60">{TIPS[tipIdx]}</p>

        <div className="mt-6 flex items-center gap-2 flex-wrap justify-center">
          <span className="badge badge-primary flex items-center gap-1">
            <ModeIcon className="w-3.5 h-3.5" /> {mode}
          </span>
          {filterCount > 0 && <span className="badge">{filterCount} filter{filterCount > 1 ? "s" : ""}</span>}
          {scholarOnly && <span className="badge badge-gold">🎓 Scholars</span>}
        </div>

        <div className="mt-6 text-4xl font-bold tabular-nums text-white">
          {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
        </div>
      </div>

      {/* ── Bottom cancel ── */}
      <div className="relative z-10 px-4 pb-6 flex justify-center">
        <button onClick={handleCancel} className="btn-glass flex items-center gap-2">
          <CloseIcon className="w-4 h-4" /> Cancel
        </button>
      </div>
    </div>
  );
};

export default Match;
