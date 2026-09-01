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

const MATCH_SERVER_URL =
  (import.meta as any).env?.VITE_MATCH_SERVER_URL ?? "ws://localhost:8090";

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
    const res = await fetch("https://ipapi.co/json/");
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
  const [state, setState] = useState<ConnectionState>("idle");
  const [onlineCount, setOnlineCount] = useState(0);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [peerCountry, setPeerCountry] = useState<string | null>(null);
  const [peerName, setPeerName] = useState<string | null>(null);
  const [extendRequestFrom, setExtendRequestFrom] = useState<string | null>(null);
  const [extendAccepted, setExtendAccepted] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null); // self-preview video element
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null); // store stream until video element mounts
  const pendingOfferRef = useRef<any>(null); // queue offer if pc isn't ready yet
  const roleRef = useRef<"caller" | "receiver">("receiver");
  const paramsRef = useRef<MatchParams | null>(null);
  const countryRef = useRef<string | null>(null);
  const nameRef = useRef<string | null>(null);

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

  // ── Create RTCPeerConnection ──
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks — this is what sends our video/audio to the peer
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getTracks();
      console.log(`[webrtc] Adding ${tracks.length} local tracks:`, tracks.map(t => `${t.kind}:${t.enabled}`));
      tracks.forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    } else {
      console.error("[webrtc] No local stream when creating peer connection — video will be empty!");
    }

    // Remote stream → attach to video element
    // The video element might not be mounted yet (e.g. during Match→ChatRoom
    // navigation), so we store the stream and poll until it's available.
    // Audio tracks are included in the stream — the video element must NOT be
    // muted so the peer's audio plays.
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      console.log(`[webrtc] ontrack: ${event.track?.kind}, streams: ${event.streams.length}, tracks in stream: ${stream?.getTracks().length}`);
      // Merge all incoming tracks into the stored stream
      remoteStreamRef.current = stream;
      const attach = () => {
        if (remoteVideoRef.current && remoteStreamRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
          // Explicitly unmute and play — browsers may block autoplay with audio
          // unless there was prior user interaction (clicking "Start" counts).
          remoteVideoRef.current.muted = false;
          remoteVideoRef.current.play().then(() => {
            // Ensure audio tracks are enabled
            remoteStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = true; });
          }).catch((e) => {
            // If autoplay with audio is blocked, try muted then unmute after
            console.warn("[webrtc] Autoplay blocked, retrying muted:", e);
            remoteVideoRef.current!.muted = true;
            remoteVideoRef.current!.play().catch(() => {});
            // Unmute after a short delay (user has interacted by clicking Start)
            setTimeout(() => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.muted = false;
                remoteVideoRef.current.play().catch(() => {});
              }
            }, 500);
          });
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
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ice", candidate: event.candidate }));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[webrtc] Connection state: ${pc.connectionState}`);
      if (pc.connectionState === "connected") setState("connected");
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setState("disconnected");
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[webrtc] ICE state: ${pc.iceConnectionState}`);
    };

    pcRef.current = pc;
    return pc;
  }, []);

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
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
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
  useEffect(() => {
    if (localStreamRef.current && localVideoRef.current && localVideoRef.current.srcObject !== localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localVideoRef, state]);

  // ── WebSocket message handler ──
  const handleMessage = useCallback(
    async (data: any) => {
      console.log(`[ws] Received: ${data.type}`, data.peerId ? `peer=${data.peerId}` : '');
      switch (data.type) {
        case "connected":
          // Server assigned us an ID — register our country + name, then search if params set
          setOnlineCount(data.onlineCount ?? 0);
          detectCountry().then((country) => {
            countryRef.current = country;
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: "register", country, name: nameRef.current }));
            }
            if (paramsRef.current) {
              wsRef.current?.send(JSON.stringify({ type: "search", ...paramsRef.current, name: nameRef.current }));
              setState("searching");
            }
          });
          break;

        case "presence":
          // Real online count broadcast from server
          setOnlineCount(data.onlineCount ?? 0);
          break;

        case "searching":
          setOnlineCount(data.onlineCount ?? 0);
          setState("searching");
          break;

        case "matched":
          setPeerId(data.peerId);
          setPeerCountry(data.peerCountry ?? null);
          setPeerName(data.peerName ?? null);
          roleRef.current = data.role;
          setState("matched");

          // Create peer connection and start WebRTC handshake
          // Try to get camera, but DON'T fail the whole match if camera fails —
          // we can still receive the peer's video/audio without sending ours.
          try {
            await startLocalStream().catch((err) => {
              console.warn("[webrtc] Camera failed, continuing without local stream:", err);
            });
            console.log(`[webrtc] Matched as ${data.role}. Local stream:`, localStreamRef.current ? `${localStreamRef.current.getTracks().length} tracks` : "null");
            const pc = createPeerConnection();

            if (data.role === "caller") {
              // Caller creates the offer
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              wsRef.current?.send(JSON.stringify({ type: "offer", sdp: offer }));
              console.log("[webrtc] Sent offer");
            } else {
              // Receiver — if the offer already arrived (race condition), process it now
              if (pendingOfferRef.current) {
                console.log("[webrtc] Processing pending offer");
                const pending = pendingOfferRef.current;
                pendingOfferRef.current = null;
                await pc.setRemoteDescription(new RTCSessionDescription(pending.sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                wsRef.current?.send(JSON.stringify({ type: "answer", sdp: answer }));
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
              const answer = await pcRef.current.createAnswer();
              await pcRef.current.setLocalDescription(answer);
              wsRef.current?.send(JSON.stringify({ type: "answer", sdp: answer }));
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
              console.log("[webrtc] Remote description set");
            } catch (err) {
              console.error("Failed to handle answer:", err);
            }
          }
          break;

        case "ice":
          if (pcRef.current) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (err) {
              console.error("Failed to add ICE candidate:", err);
            }
          }
          break;

        case "partner-left":
          // Partner disconnected — clean up WebRTC
          if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
          }
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          remoteStreamRef.current = null;
          setPeerId(null);
          setPeerCountry(null);
          setPeerName(null);
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
          if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
          }
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          setPeerId(null);
          setPeerCountry(null);
          setState("disconnected");
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
    [createPeerConnection, startLocalStream]
  );

  // ── Connect to match server ──
  // Use a ref for handleMessage so the WebSocket always uses the latest version
  // (avoids stale closure issues if handleMessage identity changes)
  const handleMessageRef = useRef(handleMessage);
  useEffect(() => { handleMessageRef.current = handleMessage; }, [handleMessage]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setState("connecting");
    const ws = new WebSocket(MATCH_SERVER_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to match server");
    };

    ws.onmessage = (event) => {
      try {
        handleMessageRef.current(JSON.parse(event.data));
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      setState("error");
    };

    ws.onclose = () => {
      console.log("[ws] WebSocket closed");
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
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
      }
    };
  }, []);

  // ── Start searching for a match ──
  const search = useCallback(
    (params: MatchParams) => {
      paramsRef.current = params;

      // Don't search if already matched or connected
      if (pcRef.current) {
        console.log("[webrtc] Already have a peer connection, skipping search");
        return;
      }

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        connect();
        // connect() will send the search after "connected" message
      } else {
        wsRef.current.send(JSON.stringify({ type: "search", ...params, name: nameRef.current }));
        setState("searching");
      }
    },
    [connect]
  );

  // ── Set the display name to send to the server on register/search ──
  const setDisplayName = useCallback((name: string | null) => {
    nameRef.current = name;
  }, []);

  // ── Skip current partner (does NOT auto-search — client navigates to Match view) ──
  const skip = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    remoteStreamRef.current = null;
    setPeerId(null);
    setPeerCountry(null);
    setPeerName(null);
    setExtendRequestFrom(null);
    setExtendAccepted(false);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "skip" }));
    }
    // Set to searching immediately so the UI transitions
    setState("searching");
  }, []);

  // ── Request to extend the call with current partner ──
  const requestExtend = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "extend-request" }));
    }
  }, []);

  // ── Accept partner's extend request ──
  const acceptExtend = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "extend-accept" }));
    }
    setExtendAccepted(true);
    setExtendRequestFrom(null);
  }, []);

  // ── Decline partner's extend request ──
  const declineExtend = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "extend-decline" }));
    }
    setExtendRequestFrom(null);
  }, []);

  // ── Cancel search ──
  const cancel = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "cancel" }));
    }
    setState("idle");
  }, []);

  // ── Disconnect everything ──
  const disconnect = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    remoteStreamRef.current = null;
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "leave" }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    setState("idle");
    setPeerId(null);
  }, []);

  // ── Heartbeat ping every 25s ──
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return {
    state,
    onlineCount,
    peerId,
    peerCountry,
    peerName,
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
  };
}
