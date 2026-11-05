import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMatchConnectionContext } from "@/contexts/MatchConnectionContext";
import { getDisplayName } from "@/lib/localUser";
import { RadarPulse, CloseIcon } from "@/components/MatchIcons";
import { BrandMark } from "@/components/BrandMark";
import { recordMatch, matchesLeft } from "@/lib/limits";
import { pushSupported, subscribeToPoolPings, existingSubscription } from "@/lib/pushNotify";
import { loadAdsterra } from "@/lib/videoAd";
import { useTier } from "@/hooks/useTier";
import { BUBBLE, chipStyle, ghostPillStyle } from "@/lib/bubble";
import { toast } from "sonner";

type Mode = "solo" | "group" | "blind" | "text";

const MODE_CHIP: Record<string, { icon: string; label: string }> = {
  solo: { icon: "⚡", label: "Solo" },
  duo: { icon: "👯", label: "Duo" },
  group: { icon: "🎉", label: "Group" },
  blind: { icon: "🎭", label: "Blind" },
  text: { icon: "💬", label: "Text" },
};

// ── Corner stat card on each arena panel (ome.tv-style overlay) ──
const PanelTag = ({ title, sub, tone }: { title: string; sub: string; tone?: "live" | "wait" | "found" }) => (
  <div
    style={{
      display: "inline-flex", flexDirection: "column", gap: 2,
      padding: "8px 12px", borderRadius: 14,
      background: BUBBLE.card,
      border: `1px solid ${BUBBLE.border}`,
      boxShadow: "0 2px 8px rgba(120,72,20,0.08)",
      maxWidth: "70%",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {tone && (
        <span
          style={{
            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
            background: tone === "live" ? "#3DD68C" : tone === "found" ? "#3DD68C" : BUBBLE.brand,
            boxShadow: `0 0 8px ${tone === "wait" ? "rgba(255,159,10,0.8)" : "rgba(61,214,140,0.8)"}`,
            animation: "ff-core-pulse 1.6s ease-in-out infinite",
          }}
        />
      )}
      <span
        style={{
          fontSize: 12, fontWeight: 800, color: BUBBLE.ink, letterSpacing: "0.2px",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}
      >
        {title}
      </span>
    </div>
    <span style={{ fontSize: 10, fontWeight: 700, color: BUBBLE.faint, letterSpacing: "0.4px", textTransform: "uppercase" }}>
      {sub}
    </span>
  </div>
);

const panelBase: React.CSSProperties = {
  position: "relative",
  minHeight: 0,
  minWidth: 0,
  borderRadius: 24,
  overflow: "hidden",
  background: "#B5B1A8",
  border: `4px solid ${BUBBLE.card}`,
  boxShadow: BUBBLE.cardShadow,
};

// ── Animated clock for the "quiet hours" hint — hands spin at different speeds ──
const PeakClock = ({ size = 34 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }} aria-hidden="true">
    <circle cx="20" cy="20" r="17" fill="#FFF4E0" stroke="#FF9F0A" strokeWidth="3" />
    <line x1="20" y1="20" x2="20" y2="11" stroke="#FF4D8D" strokeWidth="3" strokeLinecap="round"
      style={{ transformOrigin: "20px 20px", animation: "ff-clock-hand 4s linear infinite" }} />
    <line x1="20" y1="20" x2="27" y2="23" stroke="#7C5CFF" strokeWidth="3" strokeLinecap="round"
      style={{ transformOrigin: "20px 20px", animation: "ff-clock-hand 24s linear infinite" }} />
    <circle cx="20" cy="20" r="2.4" fill="#1F2937" />
  </svg>
);

const hintCard: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 30,
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "9px 14px",
  borderRadius: 18,
  background: BUBBLE.card,
  border: `1px solid ${BUBBLE.border}`,
  boxShadow: BUBBLE.cardShadow,
  width: "max-content",
  maxWidth: "min(340px, 88vw)",
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

  const { state: connState, onlineCount, peerId, peerName, search, cancel, setDisplayName, startCamera, localVideoRef, sendPushSubscription } = useMatchConnectionContext();

  // Hard paywall — free users hit the daily match cap → bounce to /plus
  useEffect(() => {
    if (tierLoading) return;
    if (tier === "free" && matchesLeft() <= 0) {
      toast.error("You're out of free matches for today");
      navigate("/plus?reason=limit", { replace: true });
    }
  }, [tier, tierLoading, navigate]);

  // Start webcam immediately on mount — EXCEPT text mode, which needs zero
  // permissions (that's the whole point: the camera-shy can still chat).
  useEffect(() => { if (mode !== "text") startCamera(); }, [startCamera, mode]);

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
      loadAdsterra(); // queue = high-dwell moment — Adsterra slot
      search({
        mode,
        gender: gender === "Any" ? "any" : gender,
        scholarOnly,
        countries,
      });
      // Already armed? Re-send the existing push sub with this search —
      // subscriptions rotate and re-sending is idempotent server-side.
      if (pingArmed) {
        existingSubscription().then((sub) => { if (sub) sendPushSubscription(sub); }).catch(() => {});
      }
    }, 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, tierLoading, mode, gender, scholarOnly, countries.join(",")]);

  // Navigate to chat room when ready. Text mode goes on "matched" — it
  // doesn't need WebRTC media (chat relays through the match server),
  // so waiting for "connected" would stall it forever.
  // (The "match_connected" PostHog event lives in useMatchConnection —
  // it only fires once the peer's video verifiably renders frames.)
  useEffect(() => {
    const ready = mode === "text" ? connState === "matched" : connState === "connected";
    if (ready && peerId) {
      recordMatch();
      navigate(`/chat/${peerId}?mode=${mode}`, { replace: true });
    }
  }, [connState, peerId, mode, navigate]);

  // Auto-widen: after 15s in a thin queue, drop country/gender filters so
  // a filtered searcher can still overlap with the global pool.
  const [widened, setWidened] = useState(false);
  const [crossSuggested, setCrossSuggested] = useState(false);
  const hasFilters = countries.length > 0 || (gender !== "any" && gender !== "Any");
  useEffect(() => {
    if (widened || !hasFilters || connState === "connected") return;
    if (seconds >= 15 && connState === "searching") {
      setWidened(true);
      toast.info("Opening your search to everyone 🌍");
      search({ mode, gender: "any", scholarOnly, countries: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, widened, hasFilters, connState]);

  // "Ping me when someone's online" — arms Web Push so the server can
  // pull this visitor back when a later searcher enters the pool. Once
  // armed, the sub is re-sent silently on every search (subs can rotate).
  const [pingArmed, setPingArmed] = useState(() => {
    try { return localStorage.getItem("ff:push-armed") === "1"; } catch { return false; }
  });
  const armPing = async () => {
    const sub = await subscribeToPoolPings();
    if (!sub) {
      toast.error("Couldn't enable notifications — check browser permission");
      return;
    }
    sendPushSubscription(sub);
    try { localStorage.setItem("ff:push-armed", "1"); } catch {}
    setPingArmed(true);
    toast.success("We'll ping you when someone's online");
  };

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
  const isText = mode === "text";
  const displayName = getDisplayName() ?? "You";

  const statusChip =
    connState === "error" ? { label: "ERROR", color: "#FF5C5C" } :
    showMatched ? { label: "MATCHED", color: BUBBLE.green } :
    { label: "SEARCHING", color: BUBBLE.brand };

  return (
    <div
      className="relative flex flex-col overflow-hidden"
      style={{ height: "100dvh", background: BUBBLE.bg, color: BUBBLE.ink }}
    >
      {/* ── Top bar — logo | timer | status ── */}
      <div
        className="relative z-10 flex items-center justify-between px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", minHeight: 46 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1 }}>
          <BrandMark size={30} />
          <span className="ff-wordmark" style={{ fontSize: 15, color: BUBBLE.ink }}>facefrenzy</span>
        </div>

        {/* Center timer — ome.tv-style round clock at top center */}
        <div
          style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)",
            display: "flex", alignItems: "center", gap: 8,
            padding: "7px 16px", borderRadius: 999,
            background: BUBBLE.card,
            border: `1px solid ${BUBBLE.border}`,
            boxShadow: "0 2px 8px rgba(120,72,20,0.06)",
          }}
        >
          <span
            style={{
              width: 7, height: 7, borderRadius: "50%",
              background: statusChip.color,
              boxShadow: `0 0 10px ${statusChip.color}`,
              animation: "ff-core-pulse 1.6s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontSize: 17, fontWeight: 900, color: BUBBLE.ink,
              fontVariantNumeric: "tabular-nums", letterSpacing: "0.5px",
            }}
          >
            {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
          </span>
        </div>

        {/* Right status chip */}
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
          <span style={{ ...chipStyle, gap: 6, padding: "6px 13px", fontSize: 10, letterSpacing: "1px", color: statusChip.color, fontWeight: 900 }}>
            {statusChip.label}
          </span>
        </div>
      </div>

      {/* ── Stage — same split dims as the lobby ── */}
      <div
        className="relative z-10 flex-1 min-h-0 flex flex-col md:flex-row md:flex-none md:self-center w-full md:max-w-[1060px] md:h-[min(76vh,680px)] md:mx-auto"
        style={{ gap: 14, padding: "0 16px" }}
      >
        {/* ══ LEFT — YOU ══ */}
        <div style={{ ...panelBase, flex: 1.15 }}>
          {isBlind ? (
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, #241420 0%, #1A1020 55%, #14101C 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
          ) : isText ? (
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, #101C2A 0%, #0E1624 55%, #12121C 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 72, animation: "ff-breathe 2.4s ease-in-out infinite" }}>💬</div>
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

          {/* Corner stat card */}
          <div style={{ position: "absolute", top: 12, left: 12, zIndex: 5 }}>
            <PanelTag title={displayName} sub={`${modeChip.icon} ${modeChip.label} · you`} tone="live" />
          </div>

          {/* Bottom name strip */}
          <div style={{ position: "absolute", bottom: 12, left: 12, zIndex: 5 }}>
            <span style={{ ...chipStyle, padding: "5px 12px", fontSize: 11 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3DD68C", boxShadow: "0 0 8px rgba(61,214,140,0.8)" }} />
              You
            </span>
          </div>
        </div>



        {/* ══ RIGHT — STRANGER (searching / found) ══ */}
        <div
          style={{
            ...panelBase,
            flex: 1,
            background: BUBBLE.card,
            border: showMatched ? "4px solid rgba(34,197,94,0.45)" : `4px solid ${BUBBLE.card}`,
            boxShadow: showMatched
              ? `0 0 42px rgba(34,197,94,0.16), ${BUBBLE.cardShadow}`
              : BUBBLE.cardShadow,
            transition: "border-color 0.4s ease, box-shadow 0.4s ease",
          }}
        >
          {/* Scan-line sheen while searching */}
          {!showMatched && (
            <div
              style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: "linear-gradient(115deg, transparent 30%, rgba(255,159,10,0.05) 48%, rgba(255,159,10,0.09) 50%, rgba(255,159,10,0.05) 52%, transparent 70%)",
                backgroundSize: "250% 100%",
                animation: "ff-shimmer 2.8s ease-in-out infinite",
              }}
            />
          )}

          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, paddingBottom: 96 }}>
            {showMatched ? (
              <>
                <div
                  style={{
                    width: 84, height: 84, borderRadius: "50%",
                    background: "rgba(61,214,140,0.12)",
                    border: "1.5px solid rgba(61,214,140,0.45)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 0 36px rgba(61,214,140,0.25)",
                    animation: "ff-icon-bounce 0.5s ease",
                    fontSize: 36,
                  }}
                >
                  ⚡
                </div>
                <div
                  className="ff-heading"
                  style={{ fontSize: "clamp(22px, 4.5vw, 30px)", fontWeight: 800, letterSpacing: "-0.6px", color: BUBBLE.ink, textAlign: "center", padding: "0 16px" }}
                >
                  {peerName ? `${peerName} found!` : "Match found!"}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: BUBBLE.sub }}>Connecting video…</div>
              </>
            ) : (
              <>
                <div style={{ transform: "scale(0.52)", margin: "-52px 0", pointerEvents: "none" }}>
                  <RadarPulse />
                </div>
                <div
                  className="ff-heading"
                  style={{
                    fontSize: "clamp(18px, 4vw, 26px)", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase",
                    background: "linear-gradient(90deg, rgba(61,43,31,0.4) 25%, #3D2B1F 50%, rgba(61,43,31,0.4) 75%)",
                    backgroundSize: "200% 100%",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                    animation: "ff-shimmer-text 2.4s linear infinite",
                  }}
                >
                  Finding someone
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: BUBBLE.faint }}>
                  {connState === "error" ? "Connection issue — retrying…" : `${onlineCount > 0 ? onlineCount.toLocaleString() : "…"} in the frenzy`}
                </div>
              </>
            )}
          </div>

          {/* Corner stat card */}
          <div style={{ position: "absolute", top: 12, left: 12, zIndex: 5 }}>
            <PanelTag
              title={showMatched ? (peerName ?? "Stranger") : "Stranger"}
              sub={showMatched ? "match found" : "searching…"}
              tone={showMatched ? "found" : "wait"}
            />
          </div>

          {/* Status + cancel — pinned to the panel bottom like the lobby's controls */}
          <div style={{ position: "absolute", bottom: 18, left: 12, right: 12, zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <p style={{ fontSize: 12, color: BUBBLE.sub, fontWeight: 600 }}>{statusText}</p>
            <button
              onClick={handleCancel}
              className="bub-btn"
              style={{
                ...ghostPillStyle,
                padding: "11px 26px", fontSize: 13,
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <CloseIcon className="w-4 h-4" style={{ color: BUBBLE.pink }} /> Cancel search
            </button>
          </div>
        </div>
      </div>

      {/* Bottom spacer — keeps the panels off the screen edge */}
      <div style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)" }} />

      {/* Quiet-hours hint — floats below the top bar when the crowd is thin or the wait runs long */}
      {!showMatched && (onlineCount < 12 || seconds >= 20) && (
        <div className="animate-fade-in" style={{ ...hintCard, top: "calc(env(safe-area-inset-top, 0px) + 62px)" }}>
          <PeakClock size={30} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: BUBBLE.ink }}>It's a little quiet right now</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: BUBBLE.sub, lineHeight: 1.3 }}>
              The frenzy peaks 11pm–4am ET on Fri &amp; Sun nights — hang tight, we're still looking.
            </div>
            {pushSupported() && (
              <button
                onClick={pingArmed ? undefined : armPing}
                className="bub-btn"
                style={{
                  marginTop: 7, padding: "6px 13px", borderRadius: 999,
                  background: pingArmed ? "rgba(61,214,140,0.12)" : BUBBLE.brand,
                  color: pingArmed ? "#1d9e63" : "#fff",
                  fontSize: 11, fontWeight: 800, border: "none",
                  cursor: pingArmed ? "default" : "pointer",
                }}
              >
                {pingArmed ? "✓ Ping on — we'll notify you" : "🔔 Ping me when someone's online"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Cross-mode fallback — after 45s in solo, offer a different queue */}
      {!showMatched && mode === "solo" && seconds >= 45 && !crossSuggested && (
        <div className="animate-fade-in" style={{ ...hintCard, top: "calc(env(safe-area-inset-top, 0px) + 124px)" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: BUBBLE.ink, whiteSpace: "nowrap" }}>Still looking?</div>
          <button
            onClick={() => { setCrossSuggested(true); navigate("/match?mode=blind", { replace: true }); }}
            className="bub-btn"
            style={{ ...chipStyle, padding: "6px 12px", fontSize: 12, fontWeight: 800, background: BUBBLE.pink, color: "#fff", border: "none", cursor: "pointer" }}
          >
            🎭 Try Blind
          </button>
        </div>
      )}
    </div>
  );
};

export default Match;
