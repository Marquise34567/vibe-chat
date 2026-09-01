/**
 * useLobbyRoom — WebSocket + WebRTC hook for the invite-a-friend lobby.
 *
 * Flow:
 *   1. Host clicks invite → createRoom() → server returns roomId
 *   2. Host shares link with roomId in URL (?invite=roomId)
 *   3. Guest opens link → joinRoom(roomId) → server pairs them
 *   4. Both clients get WebRTC signaling → P2P video in the lobby
 *   5. Lobby shows split 50/50: your camera + friend's camera
 *   6. When either hits Start, they match together as a duo
 */

import { useRef, useState, useCallback, useEffect } from "react";

const MATCH_SERVER_URL =
  (import.meta as any).env?.VITE_MATCH_SERVER_URL ?? "ws://localhost:8090";

type LobbyState = "idle" | "connected" | "waiting" | "friend-joined" | "error";

export function useLobbyRoom() {
  const [state, setState] = useState<LobbyState>("idle");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const friendVideoRef = useRef<HTMLVideoElement | null>(null);
  const roleRef = useRef<"caller" | "receiver">("receiver");

  const ICE_SERVERS: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  // ── Create peer connection for lobby video ──
  const createPC = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (friendVideoRef.current) {
        friendVideoRef.current.srcObject = stream;
        friendVideoRef.current.play().catch(() => {});
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "lobby-ice", candidate: event.candidate }));
      }
    };

    pcRef.current = pc;
    return pc;
  }, []);

  // ── Start local camera ──
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
      console.error("Failed to get camera for lobby:", err);
      throw err;
    }
  }, []);

  // ── WebSocket message handler ──
  const handleMessage = useCallback(async (data: any) => {
    switch (data.type) {
      case "connected":
        // WebSocket connected, waiting for action
        break;

      case "lobby-created":
        setRoomId(data.roomId);
        setIsHost(true);
        setState("waiting");
        break;

      case "lobby-joined":
        setRoomId(data.roomId);
        setIsHost(false);
        roleRef.current = data.role;
        setState("friend-joined");
        // Guest starts WebRTC
        try {
          await startLocalStream();
          createPC();
        } catch (err) {
          console.error("Lobby join stream error:", err);
        }
        break;

      case "lobby-friend-joined":
        roleRef.current = data.role;
        setState("friend-joined");
        // Host starts WebRTC and creates offer
        try {
          await startLocalStream();
          const pc = createPC();
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          wsRef.current?.send(JSON.stringify({ type: "lobby-offer", sdp: offer }));
        } catch (err) {
          console.error("Lobby host offer error:", err);
        }
        break;

      case "lobby-offer":
        if (pcRef.current) {
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            wsRef.current?.send(JSON.stringify({ type: "lobby-answer", sdp: answer }));
          } catch (err) {
            console.error("Lobby offer error:", err);
          }
        }
        break;

      case "lobby-answer":
        if (pcRef.current) {
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
          } catch (err) {
            console.error("Lobby answer error:", err);
          }
        }
        break;

      case "lobby-ice":
        if (pcRef.current) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (err) {
            console.error("Lobby ICE error:", err);
          }
        }
        break;

      case "lobby-friend-left":
        if (pcRef.current) {
          pcRef.current.close();
          pcRef.current = null;
        }
        if (friendVideoRef.current) {
          friendVideoRef.current.srcObject = null;
        }
        setState(isHost ? "waiting" : "idle");
        break;

      case "lobby-error":
        console.error("Lobby error:", data.error);
        setState("error");
        break;
    }
  }, [createPC, startLocalStream, isHost]);

  // ── Connect WebSocket ──
  const ensureConnected = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(MATCH_SERVER_URL);
    wsRef.current = ws;
    ws.onopen = () => setState("connected");
    ws.onmessage = (event) => {
      try { handleMessage(JSON.parse(event.data)); } catch { /* ignore */ }
    };
    ws.onerror = () => setState("error");
    ws.onclose = () => {
      if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    };
  }, [handleMessage]);

  // ── Create a room (host) ──
  const createRoom = useCallback(() => {
    ensureConnected();
    // Wait for connection then send
    const trySend = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "lobby-create" }));
      } else {
        setTimeout(trySend, 200);
      }
    };
    setTimeout(trySend, 300);
  }, [ensureConnected]);

  // ── Join a room (guest) ──
  const joinRoom = useCallback((rid: string) => {
    ensureConnected();
    const trySend = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "lobby-join", roomId: rid }));
      } else {
        setTimeout(trySend, 200);
      }
    };
    setTimeout(trySend, 300);
  }, [ensureConnected]);

  // ── Leave room ──
  const leaveRoom = useCallback(() => {
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (friendVideoRef.current) friendVideoRef.current.srcObject = null;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "lobby-leave" }));
    }
    setRoomId(null);
    setState("idle");
  }, []);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "lobby-leave" }));
        wsRef.current.close();
      }
    };
  }, []);

  return {
    state,
    roomId,
    isHost,
    friendVideoRef,
    createRoom,
    joinRoom,
    leaveRoom,
  };
}
