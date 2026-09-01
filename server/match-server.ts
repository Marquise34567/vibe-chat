/**
 * FaceFrenzy Match Server — Real-world matching engine.
 *
 * WebSocket server that handles:
 *  1. Presence — real online count, broadcast to all clients
 *  2. Matching queue — pairs strangers by mode/gender/country/scholar
 *  3. WebRTC signaling — relays offer/answer/ICE between matched peers
 *  4. Lobby rooms — invite-a-friend via shareable link
 *  5. Content moderation — violation tracking, auto-ban for NSFW offenders
 *
 * Country detection: clients report their country code (detected client-side
 * via the browser). The server stores it and uses it for region filtering.
 * When a user selects a region (e.g. "Asia"), the server only matches them
 * with other users whose actual country is in that region's country list.
 *
 * Content moderation: clients run NSFWJS locally and report violations.
 * The server tracks violations per client. After MAX_VIOLATIONS, the client
 * is banned (disconnected + IP added to ban list). Reports about a partner
 * also count against that partner.
 *
 * Video/audio never goes through this server — pure P2P via WebRTC.
 */

import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";

// Railway sets PORT; locally use MATCH_SERVER_PORT or default 8090
const PORT = parseInt(process.env.PORT ?? process.env.MATCH_SERVER_PORT ?? "8090", 10);

// ── Moderation config ──
const MAX_VIOLATIONS = 3;          // Auto-ban after this many violations
const BAN_DURATION_MS = 86400000;  // 24 hour ban
const VIOLATION_COOLDOWN_MS = 5000; // Ignore duplicate reports within 5s

// ── Types ──
type Client = {
  ws: WebSocket;
  id: string;
  ip: string;
  country: string | null;   // ISO 3166-1 alpha-2 code, e.g. "US", "BR", "JP"
  mode: string;             // solo | group | blind | duo
  gender: string;           // any | woman | man
  scholarOnly: boolean;
  countries: string[];      // region filter — only match people in these countries
  status: "searching" | "matched" | "in-call";
  partnerId?: string;
  joinedAt: number;
  violations: number;
  lastViolationAt: number;
};

// ── State ──
const clients = new Map<string, Client>();
const lobbyRooms = new Map<string, { hostId: string; guestId?: string }>();
// Banned IPs with expiry timestamps
const bannedIps = new Map<string, number>();
const wss = new WebSocketServer({ port: PORT });

console.log(`FaceFrenzy match server running on :${PORT}`);

// ── Helpers ──
const send = (ws: WebSocket, msg: object) => {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
};

// Broadcast real online count to every connected client
const broadcastOnlineCount = () => {
  const count = clients.size;
  for (const c of clients.values()) {
    send(c.ws, { type: "presence", onlineCount: count });
  }
};

// Check if an IP is currently banned
const isIpBanned = (ip: string): boolean => {
  const expiry = bannedIps.get(ip);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    bannedIps.delete(ip);
    return false;
  }
  return true;
};

// Ban an IP for BAN_DURATION_MS
const banIp = (ip: string, reason: string) => {
  bannedIps.set(ip, Date.now() + BAN_DURATION_MS);
  console.log(`[moderation] IP ${ip} banned for 24h: ${reason}`);
};

/**
 * Record a violation against a client. If they exceed MAX_VIOLATIONS,
 * ban them and disconnect. Also notify their partner.
 */
const recordViolation = (
  clientId: string,
  nsfwClass: string,
  probability: number,
  source: "local" | "remote"
) => {
  const client = clients.get(clientId);
  if (!client) return;

  // Cooldown — ignore duplicate reports within VIOLATION_COOLDOWN_MS
  if (Date.now() - client.lastViolationAt < VIOLATION_COOLDOWN_MS) return;
  client.lastViolationAt = Date.now();
  client.violations += 1;

  console.log(
    `[moderation] Violation #${client.violations} for ${clientId}: ` +
    `${nsfwClass} (${(probability * 100).toFixed(1)}%) source=${source}`
  );

  // Notify the client they've been flagged
  send(client.ws, {
    type: "moderation-warning",
    violations: client.violations,
    maxViolations: MAX_VIOLATIONS,
    class: nsfwClass,
    source,
  });

  if (client.violations >= MAX_VIOLATIONS) {
    // Ban + disconnect
    banIp(client.ip, `${nsfwClass} x${client.violations}`);

    // Notify partner
    if (client.partnerId) {
      const partner = clients.get(client.partnerId);
      if (partner) {
        send(partner.ws, { type: "partner-banned", peerId: clientId });
        partner.status = "searching";
        partner.partnerId = undefined;
      }
    }

    // Notify the banned client
    send(client.ws, { type: "banned", reason: "Content policy violation", duration: BAN_DURATION_MS });

    // Disconnect after sending the message
    setTimeout(() => {
      try { client.ws.close(4003, "Banned"); } catch {}
    }, 500);

    console.log(`[moderation] Client ${clientId} banned and disconnected`);
  }
};

/**
 * Find a compatible match for `client`.
 *
 * Compatibility rules:
 *  - Must be a different client
 *  - Both must be in "searching" status
 *  - Modes must match (solo↔solo, blind↔blind, etc.)
 *  - Gender: if either specified a preference (not "any"), the other must match
 *  - Scholar: if either requires scholar-only, both must have it
 *  - Country/region: if either specified a region filter, the OTHER person's
 *    actual country must be in that filter list. This ensures that if you
 *    select "Asia", you only match with people actually located in Asia.
 */
const findMatch = (client: Client): Client | null => {
  for (const other of clients.values()) {
    if (other.id === client.id) continue;
    if (other.status !== "searching") continue;
    if (other.mode !== client.mode) continue;

    // ── Gender compatibility ──
    // If client wants women, other must be a woman (gender = "woman")
    // If client wants men, other must be a man (gender = "man")
    // If either is "any", no gender constraint from that side
    if (client.gender !== "any" && other.gender !== client.gender) continue;
    if (other.gender !== "any" && client.gender !== other.gender) continue;

    // ── Scholar filter ──
    if (client.scholarOnly && !other.scholarOnly) continue;
    if (other.scholarOnly && !client.scholarOnly) continue;

    // ── Country / region filter ──
    // If client has a region filter, the OTHER person must be in one of those countries
    if (client.countries.length > 0) {
      if (!other.country || !client.countries.includes(other.country)) continue;
    }
    // If other has a region filter, the CLIENT must be in one of those countries
    if (other.countries.length > 0) {
      if (!client.country || !other.countries.includes(client.country)) continue;
    }

    return other;
  }
  return null;
};

const pairClients = (a: Client, b: Client) => {
  a.status = "matched";
  b.status = "matched";
  a.partnerId = b.id;
  b.partnerId = a.id;

  // One is the caller (initiator), the other the receiver
  send(a.ws, { type: "matched", role: "caller", peerId: b.id, peerCountry: b.country });
  send(b.ws, { type: "matched", role: "receiver", peerId: a.id, peerCountry: a.country });

  console.log(`Matched ${a.id} (${a.country}) ↔ ${b.id} (${b.country}) [mode: ${a.mode}]`);
};

const removeClient = (id: string) => {
  const client = clients.get(id);
  if (!client) return;

  // Notify partner if in a call
  if (client.partnerId) {
    const partner = clients.get(client.partnerId);
    if (partner) {
      send(partner.ws, { type: "partner-left", peerId: id });
      partner.status = "searching";
      partner.partnerId = undefined;
    }
  }

  // Clean up lobby rooms
  for (const [rid, room] of lobbyRooms) {
    if (room.hostId === id || room.guestId === id) {
      const otherId = room.hostId === id ? room.guestId : room.hostId;
      if (otherId) {
        const other = clients.get(otherId);
        if (other) send(other.ws, { type: "lobby-friend-left", roomId: rid });
      }
      if (room.hostId === id) {
        lobbyRooms.delete(rid);
      } else {
        room.guestId = undefined;
      }
    }
  }

  clients.delete(id);
  console.log(`Client ${id} (${client.country ?? "??"}) disconnected (${clients.size} online)`);
  broadcastOnlineCount();
};

// ── Connection handler ──
wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  // Extract client IP (handle proxies)
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket.remoteAddress) ?? "unknown";

  // ── Check IP ban ──
  if (isIpBanned(ip)) {
    console.log(`[moderation] Banned IP ${ip} rejected`);
    send(ws, { type: "banned", reason: "You are banned for content policy violations", duration: 0 });
    ws.close(4003, "Banned");
    return;
  }

  const id = `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const client: Client = {
    ws, id,
    ip,
    country: null,
    mode: "solo",
    gender: "any",
    scholarOnly: false,
    countries: [],
    status: "searching",
    joinedAt: Date.now(),
    violations: 0,
    lastViolationAt: 0,
  };
  clients.set(id, client);

  // Send assigned ID + real online count
  send(ws, { type: "connected", id, onlineCount: clients.size });

  console.log(`Client ${id} connected (${clients.size} online) from ${ip}`);
  broadcastOnlineCount();

  ws.on("message", (data: string) => {
    let msg: any;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    const c = clients.get(id);
    if (!c) return;

    switch (msg.type) {
      // ── Register country (sent right after connect) ──
      case "register": {
        c.country = msg.country ?? null;
        console.log(`Client ${id} registered country: ${c.country}`);
        break;
      }

      // ── Start searching for a match ──
      case "search": {
        c.status = "searching";
        c.mode = msg.mode ?? "solo";
        c.gender = msg.gender ?? "any";
        c.scholarOnly = msg.scholarOnly ?? false;
        c.countries = msg.countries ?? [];
        c.partnerId = undefined;

        console.log(`Client ${id} searching: mode=${c.mode} gender=${c.gender} countries=${c.countries.join(",") || "global"} scholar=${c.scholarOnly}`);

        // Try to find a match immediately
        const match = findMatch(c);
        if (match) {
          pairClients(c, match);
        } else {
          send(ws, { type: "searching", onlineCount: clients.size });
        }
        break;
      }

      // ── Cancel search ──
      case "cancel": {
        c.status = "searching";
        c.partnerId = undefined;
        send(ws, { type: "cancelled" });
        break;
      }

      // ── WebRTC signaling: offer ──
      case "offer": {
        if (c.partnerId) {
          const partner = clients.get(c.partnerId);
          if (partner) send(partner.ws, { type: "offer", sdp: msg.sdp, peerId: id });
        }
        break;
      }

      // ── WebRTC signaling: answer ──
      case "answer": {
        if (c.partnerId) {
          const partner = clients.get(c.partnerId);
          if (partner) send(partner.ws, { type: "answer", sdp: msg.sdp, peerId: id });
        }
        break;
      }

      // ── WebRTC signaling: ICE candidate ──
      case "ice": {
        if (c.partnerId) {
          const partner = clients.get(c.partnerId);
          if (partner) send(partner.ws, { type: "ice", candidate: msg.candidate, peerId: id });
        }
        break;
      }

      // ── Skip / next match ──
      case "skip": {
        if (c.partnerId) {
          const partner = clients.get(c.partnerId);
          if (partner) {
            send(partner.ws, { type: "partner-left", peerId: id });
            partner.status = "searching";
            partner.partnerId = undefined;
          }
        }
        c.status = "searching";
        c.partnerId = undefined;
        send(ws, { type: "skipped" });

        // Immediately try to find a new match
        const match = findMatch(c);
        if (match) {
          pairClients(c, match);
        } else {
          send(ws, { type: "searching", onlineCount: clients.size });
        }
        break;
      }

      // ── Leave the call (not searching) ──
      case "leave": {
        if (c.partnerId) {
          const partner = clients.get(c.partnerId);
          if (partner) {
            send(partner.ws, { type: "partner-left", peerId: id });
            partner.status = "searching";
            partner.partnerId = undefined;
          }
        }
        c.status = "in-call";
        c.partnerId = undefined;
        break;
      }

      // ── Lobby: create a room (host) ──
      case "lobby-create": {
        const roomId = `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        lobbyRooms.set(roomId, { hostId: id });
        send(ws, { type: "lobby-created", roomId });
        console.log(`Lobby room ${roomId} created by ${id}`);
        break;
      }

      // ── Lobby: join a room (guest) ──
      case "lobby-join": {
        const roomId = msg.roomId;
        const room = lobbyRooms.get(roomId);
        if (!room) {
          send(ws, { type: "lobby-error", error: "Room not found" });
          break;
        }
        if (room.guestId) {
          send(ws, { type: "lobby-error", error: "Room is full" });
          break;
        }
        room.guestId = id;
        const host = clients.get(room.hostId);
        if (host) {
          send(host.ws, { type: "lobby-friend-joined", roomId, role: "caller", friendId: id });
        }
        send(ws, { type: "lobby-joined", roomId, role: "receiver", friendId: room.hostId });
        console.log(`Lobby room ${roomId}: guest ${id} joined`);
        break;
      }

      // ── Lobby: leave a room ──
      case "lobby-leave": {
        for (const [rid, room] of lobbyRooms) {
          if (room.hostId === id || room.guestId === id) {
            const otherId = room.hostId === id ? room.guestId : room.hostId;
            if (otherId) {
              const other = clients.get(otherId);
              if (other) send(other.ws, { type: "lobby-friend-left", roomId: rid });
            }
            if (room.hostId === id) {
              lobbyRooms.delete(rid);
            } else {
              room.guestId = undefined;
            }
            break;
          }
        }
        break;
      }

      // ── Lobby: WebRTC signaling relay ──
      case "lobby-offer": {
        for (const [, room] of lobbyRooms) {
          if (room.hostId === id && room.guestId) {
            const guest = clients.get(room.guestId);
            if (guest) send(guest.ws, { type: "lobby-offer", sdp: msg.sdp });
          }
        }
        break;
      }
      case "lobby-answer": {
        for (const [, room] of lobbyRooms) {
          if (room.guestId === id && room.hostId) {
            const host = clients.get(room.hostId);
            if (host) send(host.ws, { type: "lobby-answer", sdp: msg.sdp });
          }
        }
        break;
      }
      case "lobby-ice": {
        for (const [, room] of lobbyRooms) {
          let otherId: string | undefined;
          if (room.hostId === id) otherId = room.guestId;
          else if (room.guestId === id) otherId = room.hostId;
          if (otherId) {
            const other = clients.get(otherId);
            if (other) send(other.ws, { type: "lobby-ice", candidate: msg.candidate });
          }
        }
        break;
      }

      // ── Content moderation: report a violation ──
      // source = "local" means the reporter detected NSFW on their OWN feed
      //   → record violation against the reporter themselves
      // source = "remote" means the reporter detected NSFW on their PARTNER's feed
      //   → record violation against the partner
      case "report-violation": {
        const nsfwClass = msg.class ?? "Unknown";
        const probability = msg.probability ?? 0;
        const source = msg.source ?? "local";
        const reportedPeerId = msg.peerId;

        if (source === "remote" && reportedPeerId) {
          // Reporter saw NSFW on their partner's video — count against partner
          recordViolation(reportedPeerId, nsfwClass, probability, "remote");
        } else {
          // Self-report or local detection — count against the reporter
          recordViolation(id, nsfwClass, probability, "local");
        }
        break;
      }

      // ── Ping (keepalive) ──
      case "ping": {
        send(ws, { type: "pong" });
        break;
      }
    }
  });

  ws.on("close", () => removeClient(id));
  ws.on("error", () => removeClient(id));
});

// ── Heartbeat: broadcast online count + clean up stale clients every 15s ──
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [id, c] of clients) {
    if (now - c.joinedAt > 3600000) { // 1 hour timeout
      console.log(`Cleaning up stale client ${id}`);
      removeClient(id);
      cleaned++;
    }
  }
  if (cleaned > 0) broadcastOnlineCount();
}, 15000);
