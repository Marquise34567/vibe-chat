/**
 * useMatchConnection — WebSocket + WebRTC hook for real-time matching.
 *
 * Connects to the FaceFrenzy match server, searches for a partner,
 * and establishes a P2P WebRTC video/audio connection once matched.
 *
 * Flow:
 *   1. connect() → WebSocket opens
 *   2. search() → server looks for a partner
 *   3. matched → caller creates offer, receiver creates answer
 *   4. ICE candidates exchanged → P2P connection established
 *   5. Remote video stream available in remoteVideoRef
 */

import { useRef, useState, useCallback, useEffect } from "react";
import { usePostHog } from "posthog-js/react";
import { getLocalProfile } from "@/lib/localUser";
import { normalizeGender } from "../../shared/analytics";
import { capturePostHogEvent } from "@/lib/posthogLogs";

const MATCH_SERVER_URL =
  (import.meta as any).env?.VITE_MATCH_SERVER_URL ?? "ws://localhost:8090";

// Country → Cloudflare continent (for shard routing hints). Mirrors the
// REGIONS list in StartTab — a region filter that lives entirely on one
// continent routes this socket to that continent's matchmaker shard.
const COUNTRY_CONTINENT: Record<string, string> = {
  US: "NA", CA: "NA", MX: "NA",
  BR: "SA", AR: "SA", CO: "SA", CL: "SA", PE: "SA", VE: "SA", EC: "SA", UY: "SA", PY: "SA", BO: "SA",
  GB: "EU", FR: "EU", DE: "EU", ES: "EU", IT: "EU", NL: "EU", SE: "EU", NO: "EU", DK: "EU", FI: "EU", PL: "EU", PT: "EU", IE: "EU", BE: "EU", AT: "EU", CH: "EU", GR: "EU", CZ: "EU", RO: "EU", HU: "EU",
  JP: "AS", KR: "AS", CN: "AS", IN: "AS", ID: "AS", TH: "AS", VN: "AS", PH: "AS", MY: "AS", SG: "AS", HK: "AS", TW: "AS", BD: "AS", PK: "AS", SA: "AS", AE: "AS", IL: "AS", TR: "AS",
  NG: "AF", ZA: "AF", EG: "AF", KE: "AF", GH: "AF", ET: "AF", TZ: "AF", MA: "AF", DZ: "AF", TN: "AF",
  AU: "OC", NZ: "OC", FJ: "OC", PG: "OC",
};

// If every filter country shares one continent, that's the shard to hit.
const dominantContinent = (countries: string[]): string | null => {
  if (!countries.length) return null;
  let cont: string | null = null;
  for (const cc of countries) {
    const c = COUNTRY_CONTINENT[cc];
    if (!c) return null;
    if (cont === null) cont = c;
    else if (cont !== c) return null;
  }
  return cont;
};

// Drop null/undefined so PostHog properties stay flat primitives
const phProps = (o: Record<string, string | number | boolean | null | undefined>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v != null)) as Record<string, string | number | boolean>;

type ConnectionState =
  | "idle"
  | "connecting"
  | "searching"
  | "matched"
  | "connected"  // WebRTC connected
  | "disconnected"
  | "error";

type MatchParams = {
  mode: string;
  gender?: string;
  scholarOnly?: boolean;
  countries?: string[];
};

// Detect the user's real country via free IP geolocation API.
// Falls back to browser locale if the API fails.
let cachedCountry: string | null = null;
const detectCountry = async (): Promise<string | null> => {
  if (cachedCountry) return cachedCountry;
  try {
    // Timeout matters — register + search wait on this; if ipapi.co hangs
    // (adblocker/offline), matching silently never starts.
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data.country_code && typeof data.country_code === "string") {
        cachedCountry = data.country_code.toUpperCase();
        return cachedCountry;
      }
    }
  } catch {
    // fall through to locale-based detection
  }
  // Fallback: parse browser locale (e.g. "en-US" → "US")
  const locale = navigator.language || (navigator as any).userLanguage || "";
  const parts = locale.split("-");
  if (parts.length >= 2 && parts[1].length === 2) {
    cachedCountry = parts[1].toUpperCase();
    return cachedCountry;
  }
  return null;
};

export function useMatchConnection() {
  const posthog = usePostHog();
  const [state, setState] = useState<ConnectionState>("idle");
  const [onlineCount, setOnlineCount] = useState(0);
  const [searchingCount, setSearchingCount] = useState(0);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [peerCountry, setPeerCountry] = useState<string | null>(null);
  const [peerName, setPeerName] = useState<string | null>(null);
  const [peerGender, setPeerGender] = useState<string | null>(null);
  const [peerAge, setPeerAge] = useState<number | null>(null);
  const [extendRequestFrom, setExtendRequestFrom] = useState<string | null>(null);
  const [extendAccepted, setExtendAccepted] = useState(false);

  const [peerRole, setPeerRole] = useState<"caller" | "receiver" | null>(null);
  const [peerChannelOpen, setPeerChannelOpen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null); // P2P channel for in-call games
  const peerMsgHandlersRef = useRef<Set<(data: any) => void>>(new Set());
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null); // self-preview video element
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null); // store stream until video element mounts
  const videoSenderRef = useRef<RTCRtpSender | null>(null); // outbound video sender (HD toggle)
  const audioSenderRef = useRef<RTCRtpSender | null>(null);
  const iceServersRef = useRef<RTCIceServer[] | null>(null); // fetched once from the match server
  const pendingOfferRef = useRef<any>(null); // queue offer if pc isn't ready yet
  const pendingIceRef = useRef<any[]>([]); // queue ICE candidates that arrive before pc/remoteDescription
  const connFailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roleRef = useRef<"caller" | "receiver">("receiver");
  const paramsRef = useRef<MatchParams | null>(null);
  const countryRef = useRef<string | null>(null);
  const nameRef = useRef<string | null>(null);
  // Analytics timestamps for client-side event tracking
  const searchStartedTsRef = useRef<number | null>(null);
  const matchedTsRef = useRef<number | null>(null);
  const matchConnectedFiredRef = useRef(false); // match_connected — once per match
  const remoteReadyCleanupRef = useRef<(() => void) | null>(null); // disarm video-ready listeners
  const peerInfoRef = useRef<{ country: string | null; gender: string | null; age: number | null } | null>(null);
  const modeRef = useRef<string>("solo");
  // User's own gender/age (from profile) — sent for matchmaking analytics
  const selfGender = () => normalizeGender(getLocalProfile().gender);
  const selfAge = () => getLocalProfile().age ?? null;

  // ── ICE servers (STUN + TURN for NAT traversal) ──
  // STUN discovers public IP; TURN relays traffic when P2P fails (symmetric NAT, firewalls, etc.)
  const ICE_SERVERS: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    // OpenRelay free TURN servers — relay traffic when P2P fails
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ];

  // ── Safe send — WebSocket.send() throws InvalidStateError on a
  // non-OPEN socket, so every send goes through this readyState gate. ──
  const sendMsg = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // ── Tear down the peer connection + remote stream ──
  // Centralized so every exit path (skip, partner-left, ICE failure) cleans up
  // the same way — leaves pcRef null so a fresh search() isn't blocked.
  const teardownPeer = useCallback(() => {
    if (connFailTimerRef.current) {
      clearTimeout(connFailTimerRef.current);
      connFailTimerRef.current = null;
    }
    remoteReadyCleanupRef.current?.();
    remoteReadyCleanupRef.current = null;
    if (dcRef.current) {
      try { dcRef.current.close(); } catch {}
      dcRef.current = null;
    }
    setPeerChannelOpen(false);
    if (pcRef.current) {
      try { pcRef.current.close(); } catch {}
      pcRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    remoteStreamRef.current = null;
    videoSenderRef.current = null;
    audioSenderRef.current = null;
    pendingOfferRef.current = null;
    pendingIceRef.current = [];
    // Match is over — every call-end tracker reads matchedTsRef BEFORE
    // tearing down, so clearing here also lets in-flight async setup
    // (e.g. the camera permission prompt) detect a dead match.
    matchedTsRef.current = null;
    peerInfoRef.current = null;
  }, []);

  // ── Flush queued ICE candidates once remote description is set ──
  const flushPendingIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    const queued = pendingIceRef.current;
    pendingIceRef.current = [];
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("[webrtc] Failed to add queued ICE candidate:", err);
      }
    }
  }, []);

  // ── Wire a data channel used for in-call games ──
  const setupDataChannel = useCallback((dc: RTCDataChannel) => {
    dcRef.current = dc;
    dc.onopen = () => setPeerChannelOpen(true);
    dc.onclose = () => { if (dcRef.current === dc) { dcRef.current = null; } setPeerChannelOpen(false); };
    dc.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        peerMsgHandlersRef.current.forEach((h) => h(msg));
      } catch { /* ignore malformed game messages */ }
    };
  }, []);

  // ── "match_connected" analytics event ──
  // Fires ONCE per match, only when the peer's VIDEO verifiably resolves —
  // the remote <video> rendering real frames (videoWidth > 0) or the remote
  // video track unmuting (first RTP packets). ICE "connected" alone isn't
  // enough: media can still never arrive (camera-less peer, dead track).
  const fireMatchConnected = useCallback(() => {
    if (matchConnectedFiredRef.current || matchedTsRef.current == null) return;
    matchConnectedFiredRef.current = true;
    remoteReadyCleanupRef.current?.();
    remoteReadyCleanupRef.current = null;
    capturePostHogEvent(posthog, "match_connected", phProps({
      mode: modeRef.current,
      connect_ms: Date.now() - matchedTsRef.current,
      peer_country: peerInfoRef.current?.country,
      peer_gender: peerInfoRef.current?.gender,
      peer_age: peerInfoRef.current?.age,
      self_gender: selfGender(),
      self_age: selfAge(),
    }));
  }, [posthog]);

  // Watch remote media until the peer's video is confirmed rendering.
  const armRemoteReady = useCallback((stream: MediaStream, el: HTMLVideoElement | null) => {
    remoteReadyCleanupRef.current?.();
    const disposers: (() => void)[] = [];
    const on = (t: EventTarget, ev: string, fn: EventListener) => {
      t.addEventListener(ev, fn);
      disposers.push(() => t.removeEventListener(ev, fn));
    };
    // Track "unmute" = first video frames off the wire — works even
    // before the <video> element mounts.
    for (const track of stream.getVideoTracks()) on(track, "unmute", fireMatchConnected);
    // Element-level signals catch tracks that were never muted.
    if (el) {
      const check = () => { if (el.videoWidth > 0) fireMatchConnected(); };
      on(el, "playing", check);
      on(el, "resize", check);
      check(); // may already be playing by the time we arm
    }
    remoteReadyCleanupRef.current = () => { disposers.forEach((d) => d()); };
  }, [fireMatchConnected]);

  // ── ICE config — fetched once from the match server so real TURN
  // credentials (Cloudflare Calls) can replace the free relay at scale.
  // Falls back to the built-in list if the fetch fails or isn't done yet.
  const fetchIceServers = useCallback(async (): Promise<RTCIceServer[]> => {
    if (iceServersRef.current) return iceServersRef.current;
    try {
      const base = MATCH_SERVER_URL.replace(/^ws/, "http");
      const res = await fetch(`${base}/api/ice-servers`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.iceServers) && data.iceServers.length) {
          iceServersRef.current = data.iceServers;
        }
      }
    } catch { /* fall through to defaults */ }
    return iceServersRef.current ?? ICE_SERVERS;
  }, []);

  // Cap an outbound sender's bitrate — raises the video ceiling well past
  // the browser default (~2.5Mbps) so 1080p actually looks like 1080p.
  const tuneSender = useCallback((sender: RTCRtpSender | null, maxBitrate: number) => {
    if (!sender) return;
    try {
      const params = sender.getParameters();
      if (!params.encodings?.length) params.encodings = [{}];
      params.encodings[0].maxBitrate = maxBitrate;
      void sender.setParameters(params).catch(() => {});
    } catch { /* setParameters unsupported (older Firefox) — ignore */ }
  }, []);

  // ── Create RTCPeerConnection ──
  const createPeerConnection = useCallback((iceServers: RTCIceServer[] = ICE_SERVERS) => {
    const pc = new RTCPeerConnection({ iceServers });

    // Game data channel: the caller creates it (must exist before the offer
    // so it's negotiated in the SDP); the receiver picks it up via ondatachannel.
    if (roleRef.current === "caller") {
      setupDataChannel(pc.createDataChannel("ff-games", { ordered: true }));
    }
    pc.ondatachannel = (e) => setupDataChannel(e.channel);

    // Add local tracks — this is what sends our video/audio to the peer
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getTracks();
      console.log(`[webrtc] Adding ${tracks.length} local tracks:`, tracks.map(t => `${t.kind}:${t.enabled}`));
      tracks.forEach((track) => {
        const sender = pc.addTrack(track, localStreamRef.current!);
        if (track.kind === "video") {
          videoSenderRef.current = sender;
          // Prefer frame integrity for faces — helps bitrate land on detail
          // rather than motion blur during head movement.
          try { (track as any).contentHint = "motion"; } catch {}
        } else if (track.kind === "audio") {
          audioSenderRef.current = sender;
        }
      });
      // Baseline quality caps — ~4Mbps video / ~96kbps audio.
      tuneSender(videoSenderRef.current, 4_000_000);
      tuneSender(audioSenderRef.current, 96_000);
    } else {
      console.error("[webrtc] No local stream when creating peer connection — video will be empty!");
    }

    // Remote stream → attach to video element
    // ontrack fires once per track (audio + video). We only need to attach once.
    let attached = false;
    pc.ontrack = (event) => {
      // event.streams can be empty when the sender didn't associate the
      // track with a MediaStream — synthesize one so remote media isn't
      // dropped (and stream.id never reads off undefined).
      const stream = event.streams[0] ?? remoteStreamRef.current ?? new MediaStream();
      if (!event.streams[0] && !stream.getTracks().includes(event.track)) {
        stream.addTrack(event.track);
      }
      console.log(`[webrtc] ontrack: ${event.track?.kind}, streams: ${event.streams.length}, tracks in stream: ${stream.getTracks().length}`);
      // Store the stream (same stream for both audio and video tracks)
      if (!remoteStreamRef.current || remoteStreamRef.current.id !== stream.id) {
        remoteStreamRef.current = stream;
        attached = false; // re-attach for new stream
      }
      if (attached) return; // already attaching/attached for this stream
      attached = true;

      // Arm "video actually resolved" detection — track-level signals
      // work even before the <video> element mounts; attach() re-arms
      // with element-level signals too.
      armRemoteReady(stream, remoteVideoRef.current);

      const attach = () => {
        if (remoteVideoRef.current && remoteStreamRef.current) {
          // Don't re-set if already set to the same stream
          if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current;
            // Force unmute — the user already interacted by clicking "Start Video Chat"
            // so autoplay with audio is allowed by the browser.
            remoteVideoRef.current.muted = false;
            // Ensure all audio tracks are enabled
            remoteStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = true; });
            remoteVideoRef.current.play().catch((e) => {
              console.warn("[webrtc] play() failed, will retry:", e);
            });
            console.log("[webrtc] Remote stream attached, muted:", remoteVideoRef.current.muted, "audio tracks:", remoteStreamRef.current.getAudioTracks().length);
          }
          armRemoteReady(remoteStreamRef.current, remoteVideoRef.current);
          return true;
        }
        return false;
      };
      if (!attach()) {
        // Retry every 200ms until the video element mounts (max 10s)
        const interval = setInterval(() => {
          if (attach()) clearInterval(interval);
        }, 200);
        setTimeout(() => clearInterval(interval), 10000);
      }
    };

    // ICE candidate → send to partner via WebSocket
    pc.onicecandidate = (event) => {
      if (event.candidate) sendMsg({ type: "ice", candidate: event.candidate });
    };

    pc.onconnectionstatechange = () => {
      console.log(`[webrtc] Connection state: ${pc.connectionState}`);
      if (pcRef.current !== pc) return; // stale pc — ignore
      if (pc.connectionState === "connected") {
        if (connFailTimerRef.current) {
          clearTimeout(connFailTimerRef.current);
          connFailTimerRef.current = null;
        }
        setState("connected");
      }
      if (pc.connectionState === "failed") {
        // Hard failure — tear down so the next search() can start clean
        teardownPeer();
        setState("disconnected");
      }
      if (pc.connectionState === "disconnected") {
        // Transient ICE disconnect — give it a grace period to recover
        // (wifi blips often self-heal), then treat as failed.
        if (connFailTimerRef.current) clearTimeout(connFailTimerRef.current);
        connFailTimerRef.current = setTimeout(() => {
          connFailTimerRef.current = null;
          if (pcRef.current === pc && pc.connectionState !== "connected") {
            console.log("[webrtc] Disconnected too long — tearing down");
            teardownPeer();
            setState("disconnected");
          }
        }, 5000);
      }
      if (pc.connectionState === "closed") {
        teardownPeer();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[webrtc] ICE state: ${pc.iceConnectionState}`);
    };

    pcRef.current = pc;
    return pc;
  }, [setupDataChannel, teardownPeer, armRemoteReady, sendMsg, tuneSender]);

  // ── Start local camera + mic ──
  // This is the SINGLE source of truth for the camera stream.
  // Both self-preview (Match/ChatRoom) and WebRTC use this same stream.
  const startLocalStream = useCallback(async () => {
    if (localStreamRef.current) {
      // Re-attach to video element in case it remounted
      if (localVideoRef.current && localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.play().catch(() => {});
      }
      return localStreamRef.current;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
      return stream;
    } catch (err) {
      console.error("Failed to get local stream:", err);
      throw err;
    }
  }, []);

  // ── Start camera only (for lobby self-preview, before matching) ──
  // Can be called early; reuses the same stream as startLocalStream.
  const startCamera = useCallback(async () => {
    return startLocalStream();
  }, [startLocalStream]);

  // ── Re-attach local stream when video element mounts/remounts ──
  // The video element changes when navigating Match → ChatRoom, but the ref
  // object identity stays the same, so we poll to detect when a new <video>
  // element is assigned and attach the stream.
  useEffect(() => {
    const check = () => {
      if (localStreamRef.current && localVideoRef.current && localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.play().catch(() => {});
      }
    };
    check();
    const interval = setInterval(check, 500);
    return () => clearInterval(interval);
  }, [state]);

  // ── PostHog: call end tracking (skip / partner left / leave) ──
  const trackCallEnd = useCallback((reason: string) => {
    const durationS = matchedTsRef.current != null
      ? Math.round((Date.now() - matchedTsRef.current) / 1000)
      : null;
    matchedTsRef.current = null;
    capturePostHogEvent(posthog, "call_ended", phProps({
      mode: modeRef.current,
      duration_s: durationS,
      reason,
      self_gender: selfGender(),
      self_age: selfAge(),
    }));
  }, [posthog]);

  // ── WebSocket message handler ──
  const handleMessage = useCallback(
    async (data: any) => {
      console.log(`[ws] Received: ${data.type}`, data.peerId ? `peer=${data.peerId}` : '');
      switch (data.type) {
        case "connected": {
          // Server assigned us an ID — register + search IMMEDIATELY.
          // Previously this waited on the ipapi.co lookup (up to 4s —
          // adblockers stall it for the full timeout), and everyone who
          // left in that window counted as a connection but never
          // reached the queue.
          setOnlineCount(data.onlineCount ?? 0);
          if (typeof data.searching === "number") setSearchingCount(data.searching);
          const vid = getLocalProfile().id;
          sendMsg({ type: "register", country: countryRef.current, name: nameRef.current, selfGender: selfGender(), selfAge: selfAge(), visitorId: vid });
          if (paramsRef.current) {
            searchStartedTsRef.current = Date.now();
            sendMsg({ type: "search", ...paramsRef.current, name: nameRef.current, selfGender: selfGender(), selfAge: selfAge(), visitorId: vid });
            setState("searching");
          }
          // Country resolves async — push an update when it lands.
          detectCountry().then((country) => {
            countryRef.current = country;
            if (country) sendMsg({ type: "register", country });
          });
          break;
        }

        case "presence":
          // Real online count broadcast from server
          setOnlineCount(data.onlineCount ?? 0);
          if (typeof data.searching === "number") setSearchingCount(data.searching);
          break;

        case "searching":
          setOnlineCount(data.onlineCount ?? 0);
          if (typeof data.searching === "number") setSearchingCount(data.searching);
          setState("searching");
          break;

        case "matched":
          // Clean slate — drop any stale pc/offer/ICE from a previous pairing
          // (e.g. a "matched" arriving after a reconnect while an old pc exists)
          if (pcRef.current) teardownPeer();
          pendingOfferRef.current = null;
          pendingIceRef.current = [];
          setPeerId(data.peerId);
          setPeerCountry(data.peerCountry ?? null);
          setPeerName(data.peerName ?? null);
          setPeerGender(data.peerGender ?? null);
          setPeerAge(typeof data.peerAge === "number" ? data.peerAge : null);
          roleRef.current = data.role;
          setPeerRole(data.role);
          setState("matched");
          matchedTsRef.current = Date.now();
          matchConnectedFiredRef.current = false;
          peerInfoRef.current = {
            country: data.peerCountry ?? null,
            gender: data.peerGender ?? null,
            age: typeof data.peerAge === "number" ? data.peerAge : null,
          };
          capturePostHogEvent(posthog, "match_found", phProps({
            mode: modeRef.current,
            wait_s: searchStartedTsRef.current != null ? Math.round((Date.now() - searchStartedTsRef.current) / 1000) : null,
            peer_country: data.peerCountry,
            peer_gender: data.peerGender,
            peer_age: data.peerAge,
            self_gender: selfGender(),
            self_age: selfAge(),
          }));

          // Create peer connection and start WebRTC handshake
          // Try to get camera, but DON'T fail the whole match if camera fails —
          // we can still receive the peer's video/audio without sending ours.
          try {
            await startLocalStream().catch((err) => {
              console.warn("[webrtc] Camera failed, continuing without local stream:", err);
            });
            // The match may have ended while the camera prompt was open
            // (partner left / socket dropped) — building a pc now would
            // orphan it and block every future search() forever.
            if (matchedTsRef.current == null) {
              console.log("[webrtc] Match ended during camera startup — aborting WebRTC setup");
              return;
            }
            console.log(`[webrtc] Matched as ${data.role}. Local stream:`, localStreamRef.current ? `${localStreamRef.current.getTracks().length} tracks` : "null");
            const iceServers = await fetchIceServers();
            const pc = createPeerConnection(iceServers);

            if (data.role === "caller") {
              // Caller creates the offer
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              sendMsg({ type: "offer", sdp: offer });
              console.log("[webrtc] Sent offer");
            } else {
              // Receiver — if the offer already arrived (race condition), process it now
              if (pendingOfferRef.current) {
                console.log("[webrtc] Processing pending offer");
                const pending = pendingOfferRef.current;
                pendingOfferRef.current = null;
                await pc.setRemoteDescription(new RTCSessionDescription(pending.sdp));
                await flushPendingIce();
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                sendMsg({ type: "answer", sdp: answer });
                console.log("[webrtc] Sent answer (from pending)");
              }
            }
          } catch (err) {
            console.error("[webrtc] Failed to start WebRTC:", err);
            // Don't set error state — try to continue
          }
          break;

        case "offer":
          // Receiver gets the offer → create answer
          console.log("[webrtc] Received offer, pcRef exists:", !!pcRef.current);
          if (pcRef.current) {
            try {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
              await flushPendingIce();
              const answer = await pcRef.current.createAnswer();
              await pcRef.current.setLocalDescription(answer);
              sendMsg({ type: "answer", sdp: answer });
              console.log("[webrtc] Sent answer");
            } catch (err) {
              console.error("Failed to handle offer:", err);
            }
          } else {
            // PC not ready yet — queue the offer for when matched handler finishes
            console.log("[webrtc] PC not ready, queuing offer");
            pendingOfferRef.current = data;
          }
          break;

        case "answer":
          // Caller gets the answer
          console.log("[webrtc] Received answer, pcRef exists:", !!pcRef.current);
          if (pcRef.current) {
            try {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
              await flushPendingIce();
              console.log("[webrtc] Remote description set");
            } catch (err) {
              console.error("Failed to handle answer:", err);
            }
          }
          break;

        case "ice":
          if (pcRef.current?.remoteDescription) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (err) {
              console.error("Failed to add ICE candidate:", err);
            }
          } else {
            // Candidate arrived before the pc/offer — queue instead of dropping.
            // Without this, fast callers lose their ICE on the receiver and the
            // call silently never connects.
            pendingIceRef.current.push(data.candidate);
          }
          break;

        case "game-relay":
          // Game message delivered via match server (data channel fallback)
          peerMsgHandlersRef.current.forEach((h) => h(data.data));
          break;

        case "partner-left":
          // Partner disconnected — clean up WebRTC
          trackCallEnd("partner_left");
          teardownPeer();
          setPeerId(null);
          setPeerCountry(null);
          setPeerName(null);
          setPeerGender(null);
          setPeerAge(null);
          setPeerRole(null);
          setState("disconnected");
          break;

        case "skipped":
          // Skip acknowledged
          break;

        case "cancelled":
          setState("idle");
          break;

        case "moderation-warning":
          // Server flagged this client for a content violation
          console.warn(`[moderation] Warning ${data.violations}/${data.maxViolations}: ${data.class} (${data.source})`);
          break;

        case "banned":
          // Client has been banned for content violations
          console.error("[moderation] Banned:", data.reason);
          setState("error");
          break;

        case "partner-banned":
          // Partner was banned for NSFW — treat like partner-left
          trackCallEnd("partner_banned");
          teardownPeer();
          setPeerId(null);
          setPeerCountry(null);
          setPeerName(null);
          setPeerGender(null);
          setPeerAge(null);
          setPeerRole(null);
          setState("disconnected");
          break;

        case "ping":
          // Server heartbeat — respond immediately so server knows we're alive
          sendMsg({ type: "pong" });
          break;

        case "pong":
          break;

        case "extend-request":
          // Partner wants to extend — show prompt to this user
          setExtendRequestFrom(data.peerId ?? "partner");
          break;

        case "extend-accepted":
          // Both users agreed — extend the call
          setExtendAccepted(true);
          setExtendRequestFrom(null);
          break;

        case "extend-declined":
          // Partner declined the extend request
          setExtendRequestFrom(null);
          break;
      }
    },
    [createPeerConnection, startLocalStream, teardownPeer, flushPendingIce, trackCallEnd, posthog, sendMsg, fetchIceServers]
  );

  // ── Connect to match server ──
  // Use a ref for handleMessage so the WebSocket always uses the latest version
  // (avoids stale closure issues if handleMessage identity changes)
  const handleMessageRef = useRef(handleMessage);
  useEffect(() => { handleMessageRef.current = handleMessage; }, [handleMessage]);

  const connect = useCallback(() => {
    // OPEN or CONNECTING — never spin up a second socket. An orphaned
    // socket's close handler would tear down the live connection, and a
    // duplicate client would get paired/mismatched server-side.
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) return;

    setState("connecting");
    // Route to the right matchmaker shard: ?v= gives a stable per-user
    // shard + daily-unique dedupe; ?shard= overrides the continent when
    // the region filter targets another continent entirely.
    const u = new URL(MATCH_SERVER_URL);
    try { u.searchParams.set("v", getLocalProfile().id); } catch {}
    const shardHint = dominantContinent(paramsRef.current?.countries ?? []);
    if (shardHint) u.searchParams.set("shard", shardHint);
    const ws = new WebSocket(u.toString());
    wsRef.current = ws;
    void fetchIceServers(); // warm the ICE config while the socket opens

    ws.onopen = () => {
      console.log("Connected to match server");
      // Start sending pings every 3s so the server knows we're alive
      // (server removes clients not seen in 5s)
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = setInterval(() => sendMsg({ type: "ping" }), 3000);
    };

    ws.onmessage = (event) => {
      if (wsRef.current !== ws) return; // stale socket — ignore its messages
      try {
        handleMessageRef.current(JSON.parse(event.data));
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      if (wsRef.current === ws) setState("error");
    };

    ws.onclose = () => {
      if (wsRef.current !== ws) return; // stale socket — a newer connection owns state
      console.log("[ws] WebSocket closed");
      if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
      teardownPeer();
      // Auto-reconnect if we were searching or matched (not intentionally disconnected)
      if (paramsRef.current) {
        console.log("[ws] Auto-reconnecting in 1s…");
        setState("connecting");
        setTimeout(() => {
          if (wsRef.current?.readyState !== WebSocket.OPEN && paramsRef.current) {
            connect();
          }
        }, 1000);
      } else {
        setState("disconnected");
        setPeerRole(null);
      }
    };
  }, [teardownPeer, sendMsg, fetchIceServers]);

  // ── Start searching for a match ──
  const search = useCallback(
    (params: MatchParams) => {
      paramsRef.current = params;
      modeRef.current = params.mode ?? "solo";
      searchStartedTsRef.current = Date.now();
      capturePostHogEvent(posthog, "search_started", phProps({
        mode: params.mode,
        gender_filter: params.gender ?? "any",
        scholar_only: !!params.scholarOnly,
        country_filters: params.countries?.length ?? 0,
        self_gender: selfGender(),
        self_age: selfAge(),
      }));

      // Don't search if already matched or connected
      if (pcRef.current) {
        console.log("[webrtc] Already have a peer connection, skipping search");
        return;
      }

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        connect();
        // connect() will send the search after "connected" message
      } else {
        sendMsg({ type: "search", ...params, name: nameRef.current, selfGender: selfGender(), selfAge: selfAge(), visitorId: getLocalProfile().id });
        setState("searching");
      }
    },
    [connect, posthog, sendMsg]
  );

  // ── Set the display name to send to the server on register/search ──
  const setDisplayName = useCallback((name: string | null) => {
    nameRef.current = name;
  }, []);

  // ── Skip current partner (does NOT auto-search — client navigates to Match view) ──
  const skip = useCallback(() => {
    trackCallEnd("skip");
    teardownPeer();
    setPeerId(null);
    setPeerCountry(null);
    setPeerName(null);
    setPeerGender(null);
    setPeerAge(null);
    setPeerRole(null);
    setExtendRequestFrom(null);
    setExtendAccepted(false);

    sendMsg({ type: "skip" });
    // Set to searching immediately so the UI transitions
    setState("searching");
  }, [teardownPeer, trackCallEnd, sendMsg]);

  // ── Request to extend the call with current partner ──
  const requestExtend = useCallback(() => {
    sendMsg({ type: "extend-request" });
  }, [sendMsg]);

  // ── Accept partner's extend request ──
  const acceptExtend = useCallback(() => {
    sendMsg({ type: "extend-accept" });
    setExtendAccepted(true);
    setExtendRequestFrom(null);
  }, [sendMsg]);

  // ── Decline partner's extend request ──
  const declineExtend = useCallback(() => {
    sendMsg({ type: "extend-decline" });
    setExtendRequestFrom(null);
  }, [sendMsg]);

  // ── Cancel search ──
  const cancel = useCallback(() => {
    // Clear params so a WS drop/reconnect doesn't silently re-search
    paramsRef.current = null;
    if (searchStartedTsRef.current != null && matchedTsRef.current == null) {
      capturePostHogEvent(posthog, "search_abandoned", phProps({
        mode: modeRef.current,
        wait_s: Math.round((Date.now() - searchStartedTsRef.current) / 1000),
        self_gender: selfGender(),
        self_age: selfAge(),
      }));
    }
    searchStartedTsRef.current = null;
    sendMsg({ type: "cancel" });
    setState("idle");
  }, [posthog, sendMsg]);

  // ── HD toggle — raises the camera to 1080p60 and lifts the sender
  // bitrate cap to ~8Mbps (default is 1080p30 @ ~4Mbps). ──
  const setHd = useCallback(async (on: boolean) => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      try {
        await track.applyConstraints(on
          ? { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60, max: 60 } }
          : { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 60 } });
      } catch (e) {
        console.warn("[webrtc] HD applyConstraints failed:", e);
      }
    }
    tuneSender(videoSenderRef.current, on ? 8_000_000 : 4_000_000);
  }, [tuneSender]);

  // ── Send a message to the matched peer (in-call games) ──
  // Prefers the P2P data channel; falls back to relaying through the match
  // server so games still work if the channel never opened.
  const sendPeerMessage = useCallback((payload: any) => {
    if (dcRef.current?.readyState === "open") {
      dcRef.current.send(JSON.stringify(payload));
      return true;
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendMsg({ type: "game-relay", data: payload });
      return true;
    }
    return false;
  }, [sendMsg]);

  // ── Subscribe to peer messages. Returns an unsubscribe fn. ──
  const onPeerMessage = useCallback((handler: (data: any) => void) => {
    peerMsgHandlersRef.current.add(handler);
    return () => { peerMsgHandlersRef.current.delete(handler); };
  }, []);

  // ── Disconnect everything ──
  const disconnect = useCallback(() => {
    paramsRef.current = null; // no auto-reconnect after intentional disconnect
    trackCallEnd("leave");
    teardownPeer();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (wsRef.current) {
      sendMsg({ type: "leave" });
      wsRef.current.close();
      wsRef.current = null;
    }
    setState("idle");
    setPeerId(null);
    setPeerGender(null);
    setPeerAge(null);
    setPeerRole(null);
  }, [teardownPeer, trackCallEnd, sendMsg]);

  // ── Heartbeat ping every 25s ──
  useEffect(() => {
    const interval = setInterval(() => sendMsg({ type: "ping" }), 25000);
    return () => clearInterval(interval);
  }, [sendMsg]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return {
    state,
    onlineCount,
    searchingCount,
    peerId,
    peerCountry,
    peerName,
    peerGender,
    peerAge,
    peerRole,
    peerChannelOpen,
    extendRequestFrom,
    extendAccepted,
    localStreamRef,
    localVideoRef,
    remoteVideoRef,
    connect,
    search,
    skip,
    cancel,
    disconnect,
    requestExtend,
    acceptExtend,
    declineExtend,
    setDisplayName,
    startCamera,
    setHd,
    sendPeerMessage,
    onPeerMessage,
  };
}
