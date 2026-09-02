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
import http from "http";
import type { IncomingMessage } from "http";
import Stripe from "stripe";

// Railway sets PORT; locally use MATCH_SERVER_PORT or default 8090
const PORT = parseInt(process.env.PORT ?? process.env.MATCH_SERVER_PORT ?? "8090", 10);

// ── Stripe ──
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
const SPONSOR_PRICE_ID = "price_1UB1KZGpSBEuGOflxD7YoPw7";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "https://www.facefrenzy.fun";

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
  name: string | null;      // display name chosen by the user (monkey.app style)
  mode: string;             // solo | group | blind | duo
  gender: string;           // any | woman | man
  scholarOnly: boolean;
  countries: string[];      // region filter — only match people in these countries
  status: "searching" | "matched" | "in-call";
  partnerId?: string;
  joinedAt: number;
  lastSeen: number;         // last time we got a ping/pong/message from this client
  violations: number;
  lastViolationAt: number;
  recentlySkipped: Set<string>; // peer IDs to exclude from re-matching (expires after 60s)
};

// ── State ──
const clients = new Map<string, Client>();
const lobbyRooms = new Map<string, { hostId: string; guestId?: string }>();
// Banned IPs with expiry timestamps
const bannedIps = new Map<string, number>();

// ── HTTP server (handles Stripe checkout + upgrades to WebSocket) ──
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", FRONTEND_URL);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── Stripe checkout endpoint ──
  if (req.method === "POST" && req.url === "/api/sponsor-checkout") {
    let body = "";
    for await (const chunk of req) body += chunk;
    try {
      const { label, link, days } = JSON.parse(body);
      if (!label || !link || !days) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing label, link, or days" }));
        return;
      }

      const totalCents = days * 500; // $5/day = 500 cents/day
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `Sponsor Box — ${days} day${days > 1 ? "s" : ""}`,
              description: `FaceFrenzy sponsor box for "${label}"`,
              tax_code: "txcd_10000000", // general - digital services
            },
            unit_amount: 500, // $5.00 per day
          },
          quantity: days,
        }],
        success_url: `${FRONTEND_URL}/?sponsor=success&label=${encodeURIComponent(label)}&link=${encodeURIComponent(link)}&days=${days}`,
        cancel_url: `${FRONTEND_URL}/?sponsor=cancelled`,
        metadata: { label, link, days: String(days) },
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ url: session.url }));
    } catch (err: any) {
      console.error("Stripe checkout error:", err.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ── URL preview scraper (OpenGraph metadata) ──
  if (req.method === "POST" && req.url === "/api/fetch-preview") {
    let body = "";
    for await (const chunk of req) body += chunk;
    try {
      const { url } = JSON.parse(body);
      if (!url) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing url" }));
        return;
      }

      // Normalize URL
      let fetchUrl = url;
      if (!fetchUrl.startsWith("http")) {
        // If it's a @handle, try to resolve to a social profile
        if (fetchUrl.startsWith("@")) {
          fetchUrl = `https://instagram.com/${fetchUrl.slice(1)}`;
        } else {
          fetchUrl = `https://${fetchUrl}`;
        }
      }

      // Fetch the page
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const pageRes = await fetch(fetchUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "FaceFrenzySponsorBot/1.0" },
        redirect: "follow",
      });
      clearTimeout(timeout);

      const html = await pageRes.text();
      const getMeta = (prop: string): string | null => {
        // Try og: and twitter: meta tags
        const ogMatch = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"));
        if (ogMatch) return ogMatch[1];
        const ogMatch2 = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i"));
        if (ogMatch2) return ogMatch2[1];
        return null;
      };

      // Extract favicon
      const faviconMatch = html.match(/<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]+href=["']([^"']+)["']/i);
      let favicon = faviconMatch ? faviconMatch[1] : null;
      if (favicon && !favicon.startsWith("http")) {
        const origin = new URL(fetchUrl).origin;
        favicon = favicon.startsWith("/") ? `${origin}${favicon}` : `${origin}/${favicon}`;
      }
      if (!favicon) {
        favicon = `${new URL(fetchUrl).origin}/favicon.ico`;
      }

      const title = getMeta("og:title") || getMeta("twitter:title") || html.match(/<title>([^<]+)<\/title>/i)?.[1] || null;
      const description = getMeta("og:description") || getMeta("twitter:description") || getMeta("description") || null;
      const image = getMeta("og:image") || getMeta("twitter:image") || null;
      const siteName = getMeta("og:site_name") || null;

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        title: title?.trim().slice(0, 60) || null,
        description: description?.trim().slice(0, 120) || null,
        image: image || null,
        favicon,
        siteName: siteName || null,
        url: fetchUrl,
      }));
    } catch (err: any) {
      // If scraping fails, return minimal data
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        title: null,
        description: null,
        image: null,
        favicon: null,
        siteName: null,
        url: url,
        error: "Could not fetch preview",
      }));
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const wss = new WebSocketServer({ server });

server.listen(PORT, () => {
  console.log(`FaceFrenzy match server running on :${PORT}`);
});

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
  // Don't match if client already has a partner
  if (client.partnerId) return null;
  const now = Date.now();

  for (const other of clients.values()) {
    if (other.id === client.id) continue;
    if (other.status !== "searching") continue;
    if (other.partnerId) continue; // already matched
    // Don't match with clients whose WebSocket isn't actually open
    if (other.ws.readyState !== WebSocket.OPEN) continue;
    // Don't match with clients we haven't heard from in 5s (ghost check)
    if (now - other.lastSeen > 5000) continue;
    if (other.mode !== client.mode) continue;

    // ── Skip recently-skipped partners ──
    if (client.recentlySkipped.has(other.id)) continue;
    if (other.recentlySkipped.has(client.id)) continue;

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
  // Safety check — don't pair if either already has a partner
  if (a.partnerId || b.partnerId) {
    console.log(`pairClients skipped: ${a.id} partner=${a.partnerId}, ${b.id} partner=${b.partnerId}`);
    return;
  }

  a.status = "matched";
  b.status = "matched";
  a.partnerId = b.id;
  b.partnerId = a.id;

  // One is the caller (initiator), the other the receiver
  send(a.ws, { type: "matched", role: "caller", peerId: b.id, peerCountry: b.country, peerName: b.name });
  send(b.ws, { type: "matched", role: "receiver", peerId: a.id, peerCountry: a.country, peerName: a.name });

  console.log(`Matched ${a.id} (${a.name}, ${a.country}) ↔ ${b.id} (${b.name}, ${b.country}) [mode: ${a.mode}]`);
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
    name: null,
    mode: "solo",
    gender: "any",
    scholarOnly: false,
    countries: [],
    status: "searching",
    joinedAt: Date.now(),
    lastSeen: Date.now(),
    violations: 0,
    lastViolationAt: 0,
    recentlySkipped: new Set<string>(),
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
    c.lastSeen = Date.now(); // update last seen on every message

    switch (msg.type) {
      // ── Register country (sent right after connect) ──
      case "register": {
        c.country = msg.country ?? null;
        c.name = msg.name ?? c.name;
        console.log(`Client ${id} registered country: ${c.country} name: ${c.name}`);
        break;
      }

      // ── Start searching for a match ──
      case "search": {
        c.status = "searching";
        c.mode = msg.mode ?? "solo";
        c.gender = msg.gender ?? "any";
        c.scholarOnly = msg.scholarOnly ?? false;
        c.countries = msg.countries ?? [];
        if (msg.name) c.name = msg.name;
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
          if (partner) {
            send(partner.ws, { type: "offer", sdp: msg.sdp, peerId: id });
            console.log(`Signaling offer: ${id} → ${c.partnerId}`);
          } else {
            console.log(`Signaling offer: ${id} → ${c.partnerId} (partner not found!)`);
          }
        } else {
          console.log(`Signaling offer: ${id} has no partnerId!`);
        }
        break;
      }

      // ── WebRTC signaling: answer ──
      case "answer": {
        if (c.partnerId) {
          const partner = clients.get(c.partnerId);
          if (partner) {
            send(partner.ws, { type: "answer", sdp: msg.sdp, peerId: id });
            console.log(`Signaling answer: ${id} → ${c.partnerId}`);
          } else {
            console.log(`Signaling answer: ${id} → ${c.partnerId} (partner not found!)`);
          }
        } else {
          console.log(`Signaling answer: ${id} has no partnerId!`);
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
            // Both sides remember this peer so they don't immediately re-match
            c.recentlySkipped.add(partner.id);
            partner.recentlySkipped.add(c.id);
            // Auto-expire skip memory after 60s
            setTimeout(() => { try { c.recentlySkipped.delete(partner.id); } catch {} }, 60000);
            setTimeout(() => { try { partner.recentlySkipped.delete(c.id); } catch {} }, 60000);

            // Only notify partner if their WebSocket is actually open
            if (partner.ws.readyState === WebSocket.OPEN) {
              send(partner.ws, { type: "partner-left", peerId: id });
            }
            partner.status = "searching";
            partner.partnerId = undefined;
          }
        }
        c.status = "searching";
        c.partnerId = undefined;
        send(ws, { type: "skipped" });

        // Don't immediately match — let the client navigate to the Match
        // searching view and re-search from there (like Monkey app).
        // Just confirm the skip; the client's search() call will trigger findMatch.
        send(ws, { type: "searching", onlineCount: clients.size });
        break;
      }

      // ── Extend request: ask partner if they want to keep talking ──
      case "extend-request": {
        if (c.partnerId) {
          const partner = clients.get(c.partnerId);
          if (partner) {
            send(partner.ws, { type: "extend-request", peerId: id });
          }
        }
        break;
      }

      // ── Extend accepted: both users get notified ──
      case "extend-accept": {
        if (c.partnerId) {
          const partner = clients.get(c.partnerId);
          if (partner) {
            send(partner.ws, { type: "extend-accepted", peerId: id });
          }
          send(ws, { type: "extend-accepted", peerId: c.partnerId });
        }
        break;
      }

      // ── Extend declined: notify partner ──
      case "extend-decline": {
        if (c.partnerId) {
          const partner = clients.get(c.partnerId);
          if (partner) {
            send(partner.ws, { type: "extend-declined", peerId: id });
          }
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

      // ── Ping/Pong (keepalive) ──
      case "ping": {
        c.lastSeen = Date.now();
        send(ws, { type: "pong" });
        break;
      }
      case "pong": {
        c.lastSeen = Date.now();
        break;
      }
    }
  });

  ws.on("close", () => removeClient(id));
  ws.on("error", () => removeClient(id));
});

// ── Heartbeat: ping all clients + clean up dead connections every 5s ──
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [id, c] of clients) {
    // Remove clients with dead WebSockets immediately
    if (c.ws.readyState !== WebSocket.OPEN) {
      console.log(`Removing dead client ${id} (ws not open)`);
      removeClient(id);
      cleaned++;
      continue;
    }
    // Remove clients we haven't heard from in 10s (ghosts that don't respond to ping)
    if (now - c.lastSeen > 10000) {
      console.log(`Removing ghost client ${id} (no activity for ${Math.round((now - c.lastSeen)/1000)}s)`);
      removeClient(id);
      cleaned++;
      continue;
    }
    // Ping to keep connection alive
    send(c.ws, { type: "ping" });
  }
  if (cleaned > 0) broadcastOnlineCount();
}, 5000);
