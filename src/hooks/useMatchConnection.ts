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

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const roleRef = useRef<"caller" | "receiver">("receiver");
  const paramsRef = useRef<MatchParams | null>(null);
  const countryRef = useRef<string | null>(null);

  // ── ICE servers (STUN for NAT traversal) ──
  const ICE_SERVERS: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ];

  // ── Create RTCPeerConnection ──
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Remote stream → attach to video element
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch(() => {});
      }
    };

    // ICE candidate → send to partner via WebSocket
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ice", candidate: event.candidate }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setState("connected");
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setState("disconnected");
      }
    };

    pcRef.current = pc;
    return pc;
  }, []);

  // ── Start local camera + mic ──
  const startLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.error("Failed to get local stream:", err);
      throw err;
    }
  }, []);

  // ── WebSocket message handler ──
  const handleMessage = useCallback(
    async (data: any) => {
      switch (data.type) {
        case "connected":
          // Server assigned us an ID — register our country, then search if params set
          setOnlineCount(data.onlineCount ?? 0);
          detectCountry().then((country) => {
            countryRef.current = country;
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: "register", country }));
            }
            if (paramsRef.current) {
              wsRef.current?.send(JSON.stringify({ type: "search", ...paramsRef.current }));
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
          roleRef.current = data.role;
          setState("matched");

          // Create peer connection and start WebRTC handshake
          try {
            await startLocalStream();
            const pc = createPeerConnection();

            if (data.role === "caller") {
              // Caller creates the offer
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              wsRef.current?.send(JSON.stringify({ type: "offer", sdp: offer }));
            }
            // Receiver waits for the offer
          } catch (err) {
            console.error("Failed to start WebRTC:", err);
            setState("error");
          }
          break;

        case "offer":
          // Receiver gets the offer → create answer
          if (pcRef.current) {
            try {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
              const answer = await pcRef.current.createAnswer();
              await pcRef.current.setLocalDescription(answer);
              wsRef.current?.send(JSON.stringify({ type: "answer", sdp: answer }));
            } catch (err) {
              console.error("Failed to handle offer:", err);
            }
          }
          break;

        case "answer":
          // Caller gets the answer
          if (pcRef.current) {
            try {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
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
          setPeerId(null);
          setPeerCountry(null);
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
      }
    },
    [createPeerConnection, startLocalStream]
  );

  // ── Connect to match server ──
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
        handleMessage(JSON.parse(event.data));
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      setState("error");
    };

    ws.onclose = () => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      setState("disconnected");
    };
  }, [handleMessage]);

  // ── Start searching for a match ──
  const search = useCallback(
    (params: MatchParams) => {
      paramsRef.current = params;

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        connect();
        // connect() will send the search after "connected" message
      } else {
        wsRef.current.send(JSON.stringify({ type: "search", ...params }));
        setState("searching");
      }
    },
    [connect]
  );

  // ── Skip current partner and search again ──
  const skip = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setPeerId(null);
    setPeerCountry(null);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "skip" }));
    }
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
    localStreamRef,
    remoteVideoRef,
    connect,
    search,
    skip,
    cancel,
    disconnect,
  };
}
