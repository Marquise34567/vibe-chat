/**
 * FaceFrenzy Match Worker — Cloudflare port of server/match-server.ts.
 *
 * A single "global" Durable Object holds every connected client using the
 * WebSocket Hibernation API: per-client state lives in the socket's serialized
 * attachment, so the DO can be evicted and woken without dropping connections.
 * Lobby rooms and banned IPs live in Durable Object storage for the same reason.
 *
 * Handles:
 *  1. Presence — real online count, broadcast to all clients
 *  2. Matching queue — pairs strangers by mode/gender/country/scholar
 *  3. WebRTC signaling — relays offer/answer/ICE between matched peers
 *  4. Lobby rooms — invite-a-friend via shareable link
 *  5. Content moderation — violation tracking, auto-ban for NSFW offenders
 *  6. POST /api/sponsor-checkout — Stripe Checkout (sponsor box or Plus/VIP plan)
 *     POST /api/plus-verify — verify a completed checkout session
 *     GET  /api/analytics + /api/insights — matchmaking stats + AI insights
 *  7. POST /api/fetch-preview — OpenGraph metadata scraper
 *
 * Video/audio never goes through this worker — pure P2P via WebRTC.
 */

import { DurableObject } from "cloudflare:workers";
import {
  MatchAnalytics, emptyStats, bumpDay, normalizeGender,
  analyticsView, heuristicInsights,
} from "../shared/analytics";

interface Env {
  MATCHMAKER: DurableObjectNamespace;
  STRIPE_SECRET_KEY: string;
  FRONTEND_URL: string;
  AI?: Ai;                        // Workers AI binding — powers /api/insights
  ADMIN_KEY?: string;             // optional — protects /api/analytics & /api/insights
}

const SPONSOR_PRICE_CENTS_PER_DAY = 500; // $5/day
const STRIPE_TAX_CODE = "txcd_10000000"; // general - digital services

// ── Subscription pricing (Stripe Checkout, recurring) ──
const PLUS_PRICES: Record<string, { amount: number; interval: "week" | "month" | "year"; name: string }> = {
  "plus-weekly":  { amount: 199,  interval: "week",  name: "FaceFrenzy Plus — Weekly" },
  "plus-monthly": { amount: 499,  interval: "month", name: "FaceFrenzy Plus — Monthly" },
  "plus-yearly":  { amount: 2999, interval: "year",  name: "FaceFrenzy Plus — Yearly" },
  "vip-weekly":   { amount: 399,  interval: "week",  name: "FaceFrenzy VIP — Weekly" },
  "vip-monthly":  { amount: 999,  interval: "month", name: "FaceFrenzy VIP — Monthly" },
  "vip-yearly":   { amount: 5999, interval: "year",  name: "FaceFrenzy VIP — Yearly" },
};

// ── Moderation config ──
const MAX_VIOLATIONS = 3; // Auto-ban after this many violations
const BAN_DURATION_MS = 86400000; // 24 hour ban
const VIOLATION_COOLDOWN_MS = 5000; // Ignore duplicate reports within 5s
const GHOST_TIMEOUT_MS = 10000; // No messages for 10s → dead client
const SWEEP_INTERVAL_MS = 5000;

// ── Per-client state, persisted in the WebSocket attachment ──
type ClientState = {
  id: string;
  ip: string;
  country: string | null;
  name: string | null;
  mode: string;
  gender: string;
  scholarOnly: boolean;
  countries: string[];
  status: "searching" | "matched" | "in-call";
  partnerId?: string;
  matchedAt?: number;             // when the current call started (for call-duration stats)
  selfGender: string | null;      // user's own gender (analytics bucket)
  countryCounted?: boolean;       // analytics: already counted in byCountry
  genderCounted?: boolean;        // analytics: already counted in byGender
  joinedAt: number;
  lastSeen: number;
  violations: number;
  lastViolationAt: number;
  recentlySkipped: Record<string, number>; // peerId → expiry timestamp
  lobbyRoomId?: string;
  lobbyRole?: "host" | "guest";
  lobbyFriendId?: string;
  closed?: boolean;
};

type LobbyRoom = { hostId: string; guestId?: string };

const corsHeaders = (request: Request, env: Env): Record<string, string> => {
  const origin = request.headers.get("Origin") ?? "";
  const allow =
    origin === env.FRONTEND_URL || /^https?:\/\/localhost(:\d+)?$/.test(origin)
      ? origin
      : env.FRONTEND_URL;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
};

const json = (data: unknown, init: ResponseInit, request: Request, env: Env) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(request, env),
      ...(init.headers ?? {}),
    },
  });

// ── Stripe Checkout (REST API, no SDK needed in Workers) ──
// One endpoint for both purchase types:
//   { label, link, days } → one-time sponsor box payment
//   { plan }              → Plus/VIP recurring subscription
const handleCheckout = async (request: Request, env: Env): Promise<Response> => {
  try {
    const { label, link, days, plan } = (await request.json()) as {
      label?: string;
      link?: string;
      days?: number;
      plan?: string;
    };
    const frontendUrl = env.FRONTEND_URL;
    const body = new URLSearchParams();

    if (plan) {
      // ── Plus/VIP subscription ──
      const price = PLUS_PRICES[plan];
      if (!price) {
        return json({ error: "Unknown plan" }, { status: 400 }, request, env);
      }
      body.set("mode", "subscription");
      body.set("line_items[0][price_data][currency]", "usd");
      body.set("line_items[0][price_data][product_data][name]", price.name);
      body.set("line_items[0][price_data][product_data][tax_code]", STRIPE_TAX_CODE);
      body.set("line_items[0][price_data][recurring][interval]", price.interval);
      body.set("line_items[0][price_data][unit_amount]", String(price.amount));
      body.set("line_items[0][quantity]", "1");
      body.set("success_url", `${frontendUrl}/?plus=success&session_id={CHECKOUT_SESSION_ID}`);
      body.set("cancel_url", `${frontendUrl}/?plus=cancelled`);
      body.set("metadata[plan]", plan);
      body.set("metadata[tier]", plan.startsWith("vip") ? "vip" : "plus");
    } else {
      // ── Sponsor box one-time payment ──
      if (!label || !link || !days) {
        return json({ error: "Missing label, link, days, or plan" }, { status: 400 }, request, env);
      }
      body.set("mode", "payment");
      body.set("line_items[0][price_data][currency]", "usd");
      body.set(
        "line_items[0][price_data][product_data][name]",
        `Sponsor Box — ${days} day${days > 1 ? "s" : ""}`
      );
      body.set(
        "line_items[0][price_data][product_data][description]",
        `FaceFrenzy sponsor box for "${label}"`
      );
      body.set("line_items[0][price_data][product_data][tax_code]", STRIPE_TAX_CODE);
      body.set("line_items[0][price_data][unit_amount]", String(SPONSOR_PRICE_CENTS_PER_DAY));
      body.set("line_items[0][quantity]", String(days));
      body.set(
        "success_url",
        `${frontendUrl}/?sponsor=success&label=${encodeURIComponent(label)}&link=${encodeURIComponent(link)}&days=${days}`
      );
      body.set("cancel_url", `${frontendUrl}/?sponsor=cancelled`);
      body.set("metadata[label]", label);
      body.set("metadata[link]", link);
      body.set("metadata[days]", String(days));
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const data = (await res.json()) as { url?: string; error?: { message?: string } };
    if (!res.ok) throw new Error(data.error?.message ?? "Stripe error");

    return json({ url: data.url }, { status: 200 }, request, env);
  } catch (err: any) {
    console.error("Stripe checkout error:", err.message);
    return json({ error: err.message }, { status: 500 }, request, env);
  }
};

// ── Verify a completed checkout session before granting the tier ──
const handlePlusVerify = async (request: Request, env: Env): Promise<Response> => {
  try {
    const { session_id } = (await request.json()) as { session_id?: string };
    if (!session_id || !session_id.startsWith("cs_")) {
      return json({ error: "Missing or invalid session_id" }, { status: 400 }, request, env);
    }

    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${session_id}`,
      { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } }
    );
    const data = (await res.json()) as {
      status?: string;
      payment_status?: string;
      metadata?: { tier?: string; plan?: string };
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(data.error?.message ?? "Stripe error");

    const paid =
      data.payment_status === "paid" ||
      data.status === "complete" ||
      data.payment_status === "no_payment_required";
    if (!paid) {
      return json({ ok: false, status: data.status }, { status: 200 }, request, env);
    }
    return json(
      { ok: true, tier: data.metadata?.tier ?? "plus", plan: data.metadata?.plan },
      { status: 200 },
      request,
      env
    );
  } catch (err: any) {
    console.error("Plus verify error:", err.message);
    return json({ error: err.message }, { status: 500 }, request, env);
  }
};

// ── URL preview scraper (OpenGraph metadata) ──
const handleFetchPreview = async (request: Request, env: Env): Promise<Response> => {
  let url: string | undefined;
  try {
    const body = (await request.json()) as { url?: string };
    url = body.url;
    if (!url) {
      return json({ error: "Missing url" }, { status: 400 }, request, env);
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

    const pageRes = await fetch(fetchUrl, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "FaceFrenzySponsorBot/1.0" },
      redirect: "follow",
    });

    const html = await pageRes.text();
    const getMeta = (prop: string): string | null => {
      const ogMatch = html.match(
        new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i")
      );
      if (ogMatch) return ogMatch[1];
      const ogMatch2 = html.match(
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i")
      );
      if (ogMatch2) return ogMatch2[1];
      return null;
    };

    // Extract favicon
    const faviconMatch = html.match(
      /<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]+href=["']([^"']+)["']/i
    );
    let favicon = faviconMatch ? faviconMatch[1] : null;
    if (favicon && !favicon.startsWith("http")) {
      const origin = new URL(fetchUrl).origin;
      favicon = favicon.startsWith("/") ? `${origin}${favicon}` : `${origin}/${favicon}`;
    }
    if (!favicon) {
      favicon = `${new URL(fetchUrl).origin}/favicon.ico`;
    }

    const title =
      getMeta("og:title") ||
      getMeta("twitter:title") ||
      html.match(/<title>([^<]+)<\/title>/i)?.[1] ||
      null;
    const description =
      getMeta("og:description") || getMeta("twitter:description") || getMeta("description") || null;
    const image = getMeta("og:image") || getMeta("twitter:image") || null;
    const siteName = getMeta("og:site_name") || null;

    return json(
      {
        title: title?.trim().slice(0, 60) || null,
        description: description?.trim().slice(0, 120) || null,
        image: image || null,
        favicon,
        siteName: siteName || null,
        url: fetchUrl,
      },
      { status: 200 },
      request,
      env
    );
  } catch {
    // If scraping fails, return minimal data
    return json(
      {
        title: null,
        description: null,
        image: null,
        favicon: null,
        siteName: null,
        url: url ?? null,
        error: "Could not fetch preview",
      },
      { status: 200 },
      request,
      env
    );
  }
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ── WebSocket upgrade → global matchmaker Durable Object ──
    if (request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      // Forward the real client IP + country so the DO can use them for
      // bans and region matching (DO fetches don't see request.cf).
      const headers = new Headers(request.headers);
      const ip = request.headers.get("cf-connecting-ip");
      if (ip) headers.set("x-client-ip", ip);
      const country = request.cf?.country;
      if (country) headers.set("x-client-country", String(country));

      const stub = env.MATCHMAKER.get(env.MATCHMAKER.idFromName("global"));
      return stub.fetch(new Request(request.url, { method: request.method, headers }));
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    if (request.method === "POST" && url.pathname === "/api/sponsor-checkout") {
      return handleCheckout(request, env);
    }

    if (request.method === "POST" && url.pathname === "/api/plus-verify") {
      return handlePlusVerify(request, env);
    }

    // ── Analytics + AI insights — served by the Matchmaker DO ──
    if (url.pathname === "/api/analytics" || url.pathname === "/api/insights") {
      const stub = env.MATCHMAKER.get(env.MATCHMAKER.idFromName("global"));
      return stub.fetch(new Request(request.url, { method: request.method, headers: request.headers }));
    }

    if (request.method === "POST" && url.pathname === "/api/fetch-preview") {
      return handleFetchPreview(request, env);
    }

    return json({ error: "Not found" }, { status: 404 }, request, env);
  },
} satisfies ExportedHandler<Env>;

// ══════════════════════════════════════════════════════════════════
//  Matchmaker Durable Object — the global matching engine
// ══════════════════════════════════════════════════════════════════

export class Matchmaker extends DurableObject<Env> {
  private bannedIps = new Map<string, number>();
  private stats: MatchAnalytics = emptyStats();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Hydrate banned IPs + analytics from storage (survives hibernation/eviction)
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<Record<string, number>>("bannedIps");
      if (stored) this.bannedIps = new Map(Object.entries(stored));
      const stats = await this.ctx.storage.get<MatchAnalytics>("stats");
      if (stats) this.stats = { ...emptyStats(), ...stats };
    });
  }

  // ── Analytics persistence (fire-and-forget; DO SQLite writes are cheap) ──
  private persistStats() {
    void this.ctx.storage.put("stats", this.stats);
  }

  private trackCountry(c: ClientState) {
    if (c.country && !c.countryCounted) {
      c.countryCounted = true;
      this.stats.byCountry[c.country] = (this.stats.byCountry[c.country] ?? 0) + 1;
      this.persistStats();
    }
  }

  private trackGender(c: ClientState) {
    if (c.selfGender && !c.genderCounted) {
      c.genderCounted = true;
      this.stats.byGender[c.selfGender] = (this.stats.byGender[c.selfGender] ?? 0) + 1;
      this.persistStats();
    }
  }

  /** Call ended (skip/leave/disconnect/ban) — accumulate call duration. */
  private endCall(c: ClientState) {
    if (c.matchedAt) {
      this.stats.totalCalls++;
      this.stats.totalCallMs += Date.now() - c.matchedAt;
      c.matchedAt = undefined;
      this.persistStats();
    }
  }

  private liveCounts() {
    let online = 0, searching = 0, inCall = 0;
    for (const ws of this.ctx.getWebSockets()) {
      const c = this.getClient(ws);
      if (!c || c.closed) continue;
      online++;
      if (c.status === "searching") searching++;
      else inCall++;
    }
    return { online, searching, inCall };
  }

  private adminOk(request: Request): boolean {
    const key = this.env.ADMIN_KEY;
    if (!key) return true; // no key configured → open (local dev)
    const url = new URL(request.url);
    return url.searchParams.get("key") === key;
  }

  // ── AI insights via Workers AI (Llama) with heuristic fallback ──
  private async buildInsights(): Promise<{ insights: string[]; source: string }> {
    const live = this.liveCounts();
    const view = analyticsView(this.stats, live);

    if (this.env.AI) {
      try {
        const prompt = [
          "You are a product analyst for FaceFrenzy, a random video chat app (like Omegle).",
          "Given this aggregate usage data (JSON below), write 5-7 short, punchy insights for the founder.",
          "Cover: who the users are (gender split), where they're from (countries),",
          "how long they stay (session + call duration), which mode they use most,",
          "and one concrete monetization suggestion based on the data.",
          "Each insight = one line starting with a bullet '•'. No headers, no preamble.",
          "",
          JSON.stringify({
            live,
            totalConnections: view.totalConnections,
            totalSearches: view.totalSearches,
            totalMatches: view.totalMatches,
            matchRate: view.matchRate,
            avgSessionSec: view.avgSessionSec,
            avgCallSec: view.avgCallSec,
            topCountries: view.topCountries,
            genders: view.topGenders,
            modes: view.topModes,
            violations: view.violations,
            bans: view.bans,
            last30Days: view.days,
          }),
        ].join("\n");

        const res = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          messages: [{ role: "user", content: prompt }],
          max_tokens: 512,
        } as never);
        const text = (res as { response?: string }).response ?? "";
        const lines = text
          .split("\n")
          .map((l) => l.trim().replace(/^[•\-\*]\s*/, ""))
          .filter((l) => l.length > 10);
        if (lines.length > 0) return { insights: lines.slice(0, 8), source: "workers-ai" };
      } catch (err) {
        console.error("[insights] Workers AI failed, falling back:", err);
      }
    }
    return { insights: heuristicInsights(this.stats, live), source: "heuristic" };
  }

  // ── Attachment helpers ──
  private getClient(ws: WebSocket): ClientState | null {
    try {
      return (ws.deserializeAttachment() as ClientState | null) ?? null;
    } catch {
      return null;
    }
  }

  private putClient(ws: WebSocket, c: ClientState) {
    try {
      ws.serializeAttachment(c);
    } catch {}
  }

  private wsById(id: string): WebSocket | null {
    return this.ctx.getWebSockets(id)[0] ?? null;
  }

  private send(ws: WebSocket, msg: object) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {}
  }

  // Live clients = sockets with a client attachment that isn't closed
  private clientCount(): number {
    let n = 0;
    for (const ws of this.ctx.getWebSockets()) {
      const c = this.getClient(ws);
      if (c && !c.closed) n++;
    }
    return n;
  }

  private broadcastOnlineCount() {
    const count = this.clientCount();
    for (const ws of this.ctx.getWebSockets()) {
      this.send(ws, { type: "presence", onlineCount: count });
    }
  }

  // ── Moderation ──
  private isIpBanned(ip: string): boolean {
    const expiry = this.bannedIps.get(ip);
    if (!expiry) return false;
    if (Date.now() > expiry) {
      this.bannedIps.delete(ip);
      void this.ctx.storage.put("bannedIps", Object.fromEntries(this.bannedIps));
      return false;
    }
    return true;
  }

  private banIp(ip: string, reason: string) {
    this.bannedIps.set(ip, Date.now() + BAN_DURATION_MS);
    void this.ctx.storage.put("bannedIps", Object.fromEntries(this.bannedIps));
    console.log(`[moderation] IP ${ip} banned for 24h: ${reason}`);
  }

  private recordViolation(
    ws: WebSocket,
    client: ClientState,
    nsfwClass: string,
    probability: number,
    source: "local" | "remote"
  ) {
    if (Date.now() - client.lastViolationAt < VIOLATION_COOLDOWN_MS) return;
    client.lastViolationAt = Date.now();
    client.violations += 1;
    this.stats.violations++;
    this.putClient(ws, client);

    console.log(
      `[moderation] Violation #${client.violations} for ${client.id}: ` +
        `${nsfwClass} (${(probability * 100).toFixed(1)}%) source=${source}`
    );

    this.send(ws, {
      type: "moderation-warning",
      violations: client.violations,
      maxViolations: MAX_VIOLATIONS,
      class: nsfwClass,
      source,
    });

    if (client.violations >= MAX_VIOLATIONS) {
      this.banIp(client.ip, `${nsfwClass} x${client.violations}`);
      this.stats.bans++;

      if (client.partnerId) {
        const partnerWs = this.wsById(client.partnerId);
        const partner = partnerWs ? this.getClient(partnerWs) : null;
        if (partnerWs && partner) {
          this.send(partnerWs, { type: "partner-banned", peerId: client.id });
          partner.status = "searching";
          partner.partnerId = undefined;
          this.endCall(partner);
          this.putClient(partnerWs, partner);
        }
      }

      this.send(ws, {
        type: "banned",
        reason: "Content policy violation",
        duration: BAN_DURATION_MS,
      });

      setTimeout(() => {
        try {
          ws.close(4003, "Banned");
        } catch {}
      }, 500);

      console.log(`[moderation] Client ${client.id} banned and disconnected`);
    }
  }

  // ── Matching ──
  private findMatch(client: ClientState): { ws: WebSocket; client: ClientState } | null {
    if (client.partnerId) return null;
    const now = Date.now();

    for (const otherWs of this.ctx.getWebSockets()) {
      const other = this.getClient(otherWs);
      if (!other || other.closed) continue;
      if (other.id === client.id) continue;
      if (other.status !== "searching") continue;
      if (other.partnerId) continue;
      if (now - other.lastSeen > 5000) continue; // ghost check
      if (other.mode !== client.mode) continue;

      // Skip recently-skipped partners (entries expire after 60s)
      const skippedByMe = client.recentlySkipped[other.id];
      if (skippedByMe && skippedByMe > now) continue;
      const skippedByThem = other.recentlySkipped[client.id];
      if (skippedByThem && skippedByThem > now) continue;

      // Gender compatibility
      if (client.gender !== "any" && other.gender !== client.gender) continue;
      if (other.gender !== "any" && client.gender !== other.gender) continue;

      // Scholar filter
      if (client.scholarOnly && !other.scholarOnly) continue;
      if (other.scholarOnly && !client.scholarOnly) continue;

      // Country / region filter — the OTHER person's actual country must be
      // in the filter list (and vice versa)
      if (client.countries.length > 0) {
        if (!other.country || !client.countries.includes(other.country)) continue;
      }
      if (other.countries.length > 0) {
        if (!client.country || !other.countries.includes(client.country)) continue;
      }

      return { ws: otherWs, client: other };
    }
    return null;
  }

  private pairClients(
    aWs: WebSocket,
    a: ClientState,
    bWs: WebSocket,
    b: ClientState
  ) {
    if (a.partnerId || b.partnerId) {
      console.log(
        `pairClients skipped: ${a.id} partner=${a.partnerId}, ${b.id} partner=${b.partnerId}`
      );
      return;
    }

    a.status = "matched";
    b.status = "matched";
    a.partnerId = b.id;
    b.partnerId = a.id;
    a.matchedAt = Date.now();
    b.matchedAt = a.matchedAt;
    this.putClient(aWs, a);
    this.putClient(bWs, b);

    // ── Analytics ──
    this.stats.totalMatches++;
    bumpDay(this.stats, "matches");
    this.persistStats();

    this.send(aWs, {
      type: "matched",
      role: "caller",
      peerId: b.id,
      peerCountry: b.country,
      peerName: b.name,
    });
    this.send(bWs, {
      type: "matched",
      role: "receiver",
      peerId: a.id,
      peerCountry: a.country,
      peerName: a.name,
    });

    console.log(
      `Matched ${a.id} (${a.name}, ${a.country}) ↔ ${b.id} (${b.name}, ${b.country}) [mode: ${a.mode}]`
    );
  }

  // ── Lobby helpers ──
  private async leaveLobby(ws: WebSocket, c: ClientState) {
    if (!c.lobbyRoomId) return;
    const roomId = c.lobbyRoomId;

    if (c.lobbyFriendId) {
      const friendWs = this.wsById(c.lobbyFriendId);
      const friend = friendWs ? this.getClient(friendWs) : null;
      if (friendWs && friend) {
        friend.lobbyFriendId = undefined;
        // If the host left, the room is gone for the guest too
        if (c.lobbyRole === "host") {
          friend.lobbyRoomId = undefined;
          friend.lobbyRole = undefined;
        }
        this.putClient(friendWs, friend);
        this.send(friendWs, { type: "lobby-friend-left", roomId });
      }
    }

    if (c.lobbyRole === "host") {
      await this.ctx.storage.delete(`room:${roomId}`);
    } else {
      const room = await this.ctx.storage.get<LobbyRoom>(`room:${roomId}`);
      if (room) {
        delete room.guestId;
        await this.ctx.storage.put(`room:${roomId}`, room);
      }
    }

    c.lobbyRoomId = undefined;
    c.lobbyRole = undefined;
    c.lobbyFriendId = undefined;
    this.putClient(ws, c);
  }

  private async removeClient(ws: WebSocket) {
    const c = this.getClient(ws);
    if (!c || c.closed) return;
    c.closed = true;
    this.putClient(ws, c);

    if (c.partnerId) {
      const partnerWs = this.wsById(c.partnerId);
      const partner = partnerWs ? this.getClient(partnerWs) : null;
      if (partnerWs && partner) {
        this.send(partnerWs, { type: "partner-left", peerId: c.id });
        partner.status = "searching";
        partner.partnerId = undefined;
        this.endCall(partner);
        this.putClient(partnerWs, partner);
      }
    }

    // ── Analytics: session + call duration ──
    this.endCall(c);
    this.stats.sessionsEnded++;
    this.stats.totalSessionMs += Date.now() - c.joinedAt;
    this.persistStats();

    await this.leaveLobby(ws, c);

    console.log(`Client ${c.id} (${c.country ?? "??"}) disconnected (${this.ctx.getWebSockets().length} online)`);
    this.broadcastOnlineCount();
  }

  // ── DO entry point: WebSocket upgrade + analytics endpoints ──
  async fetch(request: Request): Promise<Response> {
    const pathname = new URL(request.url).pathname;

    // Analytics snapshot — "who's using it, from where, how long"
    if (pathname === "/api/analytics") {
      if (!this.adminOk(request)) return new Response("Unauthorized", { status: 401 });
      return Response.json(analyticsView(this.stats, this.liveCounts()));
    }

    // AI-generated insights (Workers AI, heuristic fallback)
    if (pathname === "/api/insights") {
      if (!this.adminOk(request)) return new Response("Unauthorized", { status: 401 });
      const result = await this.buildInsights();
      return Response.json({ ...result, stats: analyticsView(this.stats, this.liveCounts()) });
    }

    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const ip = request.headers.get("x-client-ip") ?? "unknown";
    const pair = new WebSocketPair();
    const [clientSocket, server] = Object.values(pair);

    // ── IP ban check ──
    if (this.isIpBanned(ip)) {
      console.log(`[moderation] Banned IP ${ip} rejected`);
      this.ctx.acceptWebSocket(server);
      this.send(server, {
        type: "banned",
        reason: "You are banned for content policy violations",
        duration: 0,
      });
      server.close(4003, "Banned");
      return new Response(null, { status: 101, webSocket: clientSocket });
    }

    const id = `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const client: ClientState = {
      id,
      ip,
      // Cloudflare's own geolocation as a baseline; the client's "register"
      // message can still override it.
      country: request.headers.get("x-client-country"),
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
      recentlySkipped: {},
      selfGender: null,
    };

    // ── Analytics: connection + country ──
    this.stats.totalConnections++;
    bumpDay(this.stats, "connections");
    this.trackCountry(client);
    this.persistStats();

    // Tag the socket with the client ID so we can look it up directly
    this.ctx.acceptWebSocket(server, [id]);
    server.serializeAttachment(client);

    this.send(server, { type: "connected", id, onlineCount: this.clientCount() });
    console.log(`Client ${id} connected (${this.ctx.getWebSockets().length} online) from ${ip}`);
    this.broadcastOnlineCount();

    // Make sure the ghost sweep is running
    if (!(await this.ctx.storage.getAlarm())) {
      await this.ctx.storage.setAlarm(Date.now() + SWEEP_INTERVAL_MS);
    }

    return new Response(null, { status: 101, webSocket: clientSocket });
  }

  // ── Incoming WebSocket message ──
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    let msg: any;
    try {
      msg = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message));
    } catch {
      return;
    }

    const c = this.getClient(ws);
    if (!c || c.closed) return;
    const id = c.id;
    c.lastSeen = Date.now();

    switch (msg.type) {
      // ── Register country (sent right after connect) ──
      case "register": {
        c.country = msg.country ?? c.country;
        c.name = msg.name ?? c.name;
        if (msg.selfGender) c.selfGender = normalizeGender(msg.selfGender);
        this.trackCountry(c);
        this.trackGender(c);
        console.log(`Client ${id} registered country: ${c.country} name: ${c.name} gender: ${c.selfGender ?? "?"}`);
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
        if (msg.selfGender) c.selfGender = normalizeGender(msg.selfGender);
        c.partnerId = undefined;

        // ── Analytics ──
        this.stats.totalSearches++;
        this.stats.byMode[c.mode] = (this.stats.byMode[c.mode] ?? 0) + 1;
        this.trackGender(c);
        this.persistStats();

        console.log(
          `Client ${id} searching: mode=${c.mode} gender=${c.gender} countries=${c.countries.join(",") || "global"} scholar=${c.scholarOnly}`
        );

        const match = this.findMatch(c);
        if (match) {
          this.putClient(ws, c);
          this.pairClients(ws, c, match.ws, match.client);
        } else {
          this.send(ws, { type: "searching", onlineCount: this.clientCount() });
        }
        break;
      }

      // ── Cancel search ──
      case "cancel": {
        c.status = "searching";
        c.partnerId = undefined;
        this.send(ws, { type: "cancelled" });
        break;
      }

      // ── WebRTC signaling relay ──
      case "offer":
      case "answer":
      case "ice": {
        if (c.partnerId) {
          const partnerWs = this.wsById(c.partnerId);
          if (partnerWs) {
            const payload: Record<string, unknown> = { type: msg.type, peerId: id };
            if (msg.type === "ice") payload.candidate = msg.candidate;
            else payload.sdp = msg.sdp;
            this.send(partnerWs, payload);
            console.log(`Signaling ${msg.type}: ${id} → ${c.partnerId}`);
          } else {
            console.log(`Signaling ${msg.type}: ${id} → ${c.partnerId} (partner not found!)`);
          }
        } else {
          console.log(`Signaling ${msg.type}: ${id} has no partnerId!`);
        }
        break;
      }

      // ── Skip / next match ──
      case "skip": {
        if (c.partnerId) {
          const partnerWs = this.wsById(c.partnerId);
          const partner = partnerWs ? this.getClient(partnerWs) : null;
          if (partnerWs && partner) {
            // Both sides remember this peer so they don't immediately re-match.
            // Prune expired entries to keep the attachment small.
            const now = Date.now();
            for (const rec of [c.recentlySkipped, partner.recentlySkipped]) {
              for (const k of Object.keys(rec)) if (rec[k] <= now) delete rec[k];
            }
            const expiry = now + 60000;
            c.recentlySkipped[partner.id] = expiry;
            partner.recentlySkipped[id] = expiry;
            partner.status = "searching";
            partner.partnerId = undefined;
            this.endCall(partner);
            this.putClient(partnerWs, partner);
            this.send(partnerWs, { type: "partner-left", peerId: id });
          }
        }
        this.stats.skips++;
        this.endCall(c);
        c.status = "searching";
        c.partnerId = undefined;
        this.send(ws, { type: "skipped" });
        // The client's next search() call will trigger findMatch
        this.send(ws, { type: "searching", onlineCount: this.clientCount() });
        break;
      }

      // ── Extend request: ask partner if they want to keep talking ──
      case "extend-request": {
        if (c.partnerId) {
          const partnerWs = this.wsById(c.partnerId);
          if (partnerWs) this.send(partnerWs, { type: "extend-request", peerId: id });
        }
        break;
      }

      case "extend-accept": {
        if (c.partnerId) {
          const partnerWs = this.wsById(c.partnerId);
          if (partnerWs) this.send(partnerWs, { type: "extend-accepted", peerId: id });
          this.send(ws, { type: "extend-accepted", peerId: c.partnerId });
        }
        break;
      }

      case "extend-decline": {
        if (c.partnerId) {
          const partnerWs = this.wsById(c.partnerId);
          if (partnerWs) this.send(partnerWs, { type: "extend-declined", peerId: id });
        }
        break;
      }

      // ── Leave the call (not searching) ──
      case "leave": {
        if (c.partnerId) {
          const partnerWs = this.wsById(c.partnerId);
          const partner = partnerWs ? this.getClient(partnerWs) : null;
          if (partnerWs && partner) {
            this.send(partnerWs, { type: "partner-left", peerId: id });
            partner.status = "searching";
            partner.partnerId = undefined;
            this.endCall(partner);
            this.putClient(partnerWs, partner);
          }
        }
        this.endCall(c);
        c.status = "in-call";
        c.partnerId = undefined;
        break;
      }

      // ── Lobby: create a room (host) ──
      case "lobby-create": {
        const roomId = `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await this.ctx.storage.put(`room:${roomId}`, { hostId: id } satisfies LobbyRoom);
        c.lobbyRoomId = roomId;
        c.lobbyRole = "host";
        this.send(ws, { type: "lobby-created", roomId });
        console.log(`Lobby room ${roomId} created by ${id}`);
        break;
      }

      // ── Lobby: join a room (guest) ──
      case "lobby-join": {
        const roomId = msg.roomId;
        const room = await this.ctx.storage.get<LobbyRoom>(`room:${roomId}`);
        if (!room) {
          this.send(ws, { type: "lobby-error", error: "Room not found" });
          break;
        }
        if (room.guestId && room.guestId !== id) {
          this.send(ws, { type: "lobby-error", error: "Room is full" });
          break;
        }
        room.guestId = id;
        await this.ctx.storage.put(`room:${roomId}`, room);

        c.lobbyRoomId = roomId;
        c.lobbyRole = "guest";
        c.lobbyFriendId = room.hostId;

        const hostWs = this.wsById(room.hostId);
        const host = hostWs ? this.getClient(hostWs) : null;
        if (hostWs && host) {
          host.lobbyFriendId = id;
          this.putClient(hostWs, host);
          this.send(hostWs, {
            type: "lobby-friend-joined",
            roomId,
            role: "caller",
            friendId: id,
          });
        }
        this.send(ws, { type: "lobby-joined", roomId, role: "receiver", friendId: room.hostId });
        console.log(`Lobby room ${roomId}: guest ${id} joined`);
        break;
      }

      // ── Lobby: leave a room ──
      case "lobby-leave": {
        await this.leaveLobby(ws, c);
        break;
      }

      // ── Lobby: WebRTC signaling relay ──
      case "lobby-offer": {
        if (c.lobbyRole === "host" && c.lobbyFriendId) {
          const friendWs = this.wsById(c.lobbyFriendId);
          if (friendWs) this.send(friendWs, { type: "lobby-offer", sdp: msg.sdp });
        }
        break;
      }
      case "lobby-answer": {
        if (c.lobbyRole === "guest" && c.lobbyFriendId) {
          const friendWs = this.wsById(c.lobbyFriendId);
          if (friendWs) this.send(friendWs, { type: "lobby-answer", sdp: msg.sdp });
        }
        break;
      }
      case "lobby-ice": {
        if (c.lobbyFriendId) {
          const friendWs = this.wsById(c.lobbyFriendId);
          if (friendWs) this.send(friendWs, { type: "lobby-ice", candidate: msg.candidate });
        }
        break;
      }

      // ── Content moderation: report a violation ──
      // source = "local"  → violation counts against the reporter
      // source = "remote" → reporter saw NSFW on partner's feed, counts against partner
      case "report-violation": {
        const nsfwClass = msg.class ?? "Unknown";
        const probability = msg.probability ?? 0;
        const source = msg.source ?? "local";
        const reportedPeerId = msg.peerId;

        if (source === "remote" && reportedPeerId) {
          const peerWs = this.wsById(reportedPeerId);
          const peer = peerWs ? this.getClient(peerWs) : null;
          if (peerWs && peer) {
            this.recordViolation(peerWs, peer, nsfwClass, probability, "remote");
          }
        } else {
          this.recordViolation(ws, c, nsfwClass, probability, "local");
        }
        break;
      }

      // ── Ping/Pong (keepalive) ──
      case "ping": {
        this.send(ws, { type: "pong" });
        break;
      }
      case "pong": {
        break;
      }
    }

    this.putClient(ws, c);
    this.persistStats();
  }

  async webSocketClose(ws: WebSocket) {
    await this.removeClient(ws);
  }

  async webSocketError(ws: WebSocket) {
    await this.removeClient(ws);
  }

  // ── Heartbeat sweep: ping clients, drop ghosts ──
  async alarm() {
    const now = Date.now();
    for (const ws of this.ctx.getWebSockets()) {
      const c = this.getClient(ws);
      if (!c || c.closed) {
        try {
          ws.close(4000, "inactive");
        } catch {}
        continue;
      }
      if (now - c.lastSeen > GHOST_TIMEOUT_MS) {
        console.log(`Removing ghost client ${c.id} (no activity for ${Math.round((now - c.lastSeen) / 1000)}s)`);
        await this.removeClient(ws);
        try {
          ws.close(4000, "inactive");
        } catch {}
        continue;
      }
      this.send(ws, { type: "ping" });
    }

    // Flush analytics on every sweep
    this.persistStats();

    // Keep sweeping while anyone is connected; let the DO sleep when empty
    if (this.ctx.getWebSockets().length > 0) {
      await this.ctx.storage.setAlarm(now + SWEEP_INTERVAL_MS);
    }
  }
}
