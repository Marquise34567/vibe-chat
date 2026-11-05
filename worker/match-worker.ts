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
  MatchAnalytics, emptyStats, bumpDay, bumpHourET, normalizeGender, normalizeAge,
  ageBracket, durationBucket, genderPairKey, pushSample, pushEvent,
  analyticsView, heuristicInsights, trackUniqueVisitor, mergeAnalytics,
} from "../shared/analytics";
import { sendPushTickle } from "../shared/webpush";

interface Env {
  MATCHMAKER: DurableObjectNamespace;
  STRIPE_SECRET_KEY: string;
  FRONTEND_URL: string;
  AI?: Ai;                        // Workers AI binding — powers /api/insights
  ADMIN_KEY?: string;             // optional — protects /api/analytics & /api/insights
  VITE_PUBLIC_POSTHOG_KEY?: string;
  VITE_PUBLIC_POSTHOG_HOST?: string;
  ENVIRONMENT?: string;
  SUBSHARDS?: string;             // extra DO shards for NA/EU/AS — "1" = off, raise at scale
  TURN_KEY_ID?: string;           // Cloudflare Calls TURN key (optional)
  TURN_API_TOKEN?: string;        // Cloudflare Calls API token (optional)
  VAPID_PUBLIC_KEY?: string;      // Web Push — "someone's online" pings
  VAPID_PRIVATE_KEY?: string;     // secret: npx wrangler secret put VAPID_PRIVATE_KEY
  VAPID_SUB?: string;             // mailto: contact embedded in the VAPID JWT
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
// Silence before a client is reaped. Kept generous (45s) because mobile
// browsers suspend JS timers when the tab is backgrounded — a 10s cutoff
// caused constant disconnect/reconnect churn (each reconnect = a counted
// connection). findMatch still enforces a 5s freshness check, so suspended
// searchers can never actually be paired while backgrounded.
const GHOST_TIMEOUT_MS = 45000;
const SWEEP_INTERVAL_MS = 5000;

// ── Web Push pool pings ──
// Per-subscriber cooldown so a burst of searches can't spam one browser.
const PUSH_COOLDOWN_MS = 30 * 60 * 1000;
const HOT_POOL_THRESHOLD = 3; // searchers in queue = "the frenzy is live" ping
type StoredPushSub = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  updatedAt: number;
  lastPushAt: number;
};

// ── Sharding: SINGLE global Matchmaker DO ──
// Per-continent DOs were tried and reverted: each DO has its own isolated
// queue, so a US user could never match a BR user even on "Worldwide" —
// the pool fractured into nearly-empty continent queues and everyone sat
// in queue forever. One DO = one liquid global queue (a single isolate
// handles ~5-7k concurrent sockets; revisit sharding only well past that,
// and then it needs a cross-DO match broker, not queue isolation).
const GLOBAL_SHARD = "mm-global-0";
const CONTINENTS = ["AF", "AS", "EU", "NA", "OC", "SA"] as const;

const subshardsFor = (env: Env, c: string): number =>
  c === "NA" || c === "EU" || c === "AS"
    ? Math.min(16, Math.max(1, parseInt(env.SUBSHARDS ?? "1", 10) || 1))
    : 1;

const shardName = (c: string, i: number) => `mm-${c.toLowerCase()}-${i}`;


/** Which Matchmaker DO should host this socket? */
const shardForRequest = (request: Request): string => {
  const url = new URL(request.url);
  // Lobby joins carry the room's home shard (?room=r-NA2-xxxx) — legacy
  // room pins still honored so host and guest land on the same DO.
  const room = url.searchParams.get("room") ?? "";
  const m = room.match(/^r-([a-z]{2})(\d+)-/i);
  if (m) return shardName(m[1], parseInt(m[2], 10));
  return GLOBAL_SHARD;
};

const allShardNames = (env: Env): string[] => [
  GLOBAL_SHARD,
  ...CONTINENTS.flatMap((c) => Array.from({ length: subshardsFor(env, c) }, (_, i) => shardName(c, i))),
];

/** Aggregate stats + live counts across every shard DO. */
const aggregateStats = async (env: Env) => {
  const parts = await Promise.all(
    allShardNames(env).map(async (name) => {
      try {
        const stub = env.MATCHMAKER.get(env.MATCHMAKER.idFromName(name));
        const res = await stub.fetch("https://do/internal/stats");
        return (await res.json()) as {
          stats: MatchAnalytics;
          live: { online: number; searching: number; inCall: number };
        };
      } catch {
        return null;
      }
    })
  );
  const stats = emptyStats();
  const live = { online: 0, searching: 0, inCall: 0 };
  let startedAt = Infinity;
  for (const p of parts) {
    if (!p) continue;
    mergeAnalytics(stats, p.stats);
    if (p.stats.startedAt) startedAt = Math.min(startedAt, p.stats.startedAt);
    live.online += p.live?.online ?? 0;
    live.searching += p.live?.searching ?? 0;
    live.inCall += p.live?.inCall ?? 0;
  }
  if (Number.isFinite(startedAt)) stats.startedAt = startedAt;
  return { stats, live };
};

const adminOk = (request: Request, env: Env): boolean => {
  const key = env.ADMIN_KEY;
  if (!key) return true;
  return new URL(request.url).searchParams.get("key") === key;
};

/** ICE server config for clients — Cloudflare Calls TURN when provisioned,
 *  else public STUN + the free OpenRelay fallback (not 100k-ready). */
const handleIceServers = async (request: Request, env: Env): Promise<Response> => {
  const iceServers: unknown[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];
  if (env.TURN_KEY_ID && env.TURN_API_TOKEN) {
    try {
      const res = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.TURN_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ttl: 86400 }),
        }
      );
      const data = (await res.json()) as { iceServers?: unknown };
      if (res.ok && data.iceServers) iceServers.push(data.iceServers);
    } catch (err) {
      console.error("TURN credential fetch failed:", err);
    }
  } else {
    iceServers.push({
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    });
  }
  return json({ iceServers }, { status: 200 }, request, env);
};

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
  // "idle" = connected (presence/lobby) but NOT in the match queue. Only an
  // explicit "search" message moves a client to "searching" — otherwise
  // presence sockets (online counter, invite lobby) would get paired.
  status: "idle" | "searching" | "matched" | "in-call";
  partnerId?: string;
  matchedAt?: number;             // when the current call started (for call-duration stats)
  searchStartedAt?: number;       // when the current search began (wait-time stats)
  selfGender: string | null;      // user's own gender (analytics bucket)
  selfAge: number | null;         // user's own age (analytics, sent by client)
  peerGender: string | null;      // snapshot of the current partner's gender (for call-end events)
  peerAge: number | null;         // snapshot of the current partner's age
  peerCountry: string | null;     // snapshot of the current partner's country
  countryCounted?: boolean;       // analytics: already counted in byCountry
  genderCounted?: boolean;        // analytics: already counted in byGender
  ageCounted?: boolean;           // analytics: already counted in byAgeBracket
  counted?: boolean;              // analytics: client identified (register/search/lobby)
  visitorId?: string | null;      // stable per-browser ID — daily unique dedupe
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

type AiGeneration = {
  traceId: string;
  sessionId: string;
  prompt: string;
  completion: string;
  latencySeconds: number;
};

const captureAiGeneration = async (env: Env, generation: AiGeneration): Promise<void> => {
  const apiKey = env.VITE_PUBLIC_POSTHOG_KEY;
  const host = env.VITE_PUBLIC_POSTHOG_HOST;
  if (!apiKey || !host) return;

  try {
    const response = await fetch(new URL("/i/v0/e/", host), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event: "$ai_generation",
        properties: {
          distinct_id: generation.sessionId,
          $ai_trace_id: generation.traceId,
          $ai_session_id: generation.sessionId,
          $ai_model: "@cf/meta/llama-3.1-8b-instruct",
          $ai_provider: "cloudflare",
          $ai_input: [{ role: "user", content: generation.prompt }],
          $ai_output_choices: [{ role: "assistant", content: generation.completion }],
          $ai_latency: generation.latencySeconds,
          $ai_max_tokens: 512,
        },
      }),
    });
    if (!response.ok) console.error("[posthog] AI generation capture failed:", response.status);
  } catch (err) {
    console.error("[posthog] AI generation capture failed:", err);
  }
};

const corsHeaders = (request: Request, env: Env): Record<string, string> => {
  const origin = request.headers.get("Origin") ?? "";
  const allow =
    origin === env.FRONTEND_URL || /^https?:\/\/localhost(:\d+)?$/.test(origin)
      ? origin
      : env.FRONTEND_URL;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

    // ── WebSocket upgrade → the client's continental Matchmaker DO ──
    if (request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      // Forward the real client IP + country so the DO can use them for
      // bans and region matching (DO fetches don't see request.cf).
      const headers = new Headers(request.headers);
      const ip = request.headers.get("cf-connecting-ip");
      if (ip) headers.set("x-client-ip", ip);
      const country = request.cf?.country;
      if (country) headers.set("x-client-country", String(country));

      const stub = env.MATCHMAKER.get(env.MATCHMAKER.idFromName(shardForRequest(request)));
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

    // ── Analytics — aggregate across every shard DO ──
    if (url.pathname === "/api/analytics") {
      if (!adminOk(request, env)) return json({ error: "Unauthorized" }, { status: 401 }, request, env);
      const { stats, live } = await aggregateStats(env);
      return json(analyticsView(stats, live), { status: 200 }, request, env);
    }

    // ── AI insights — merged stats analyzed by the primary shard's AI ──
    if (url.pathname === "/api/insights") {
      if (!adminOk(request, env)) return json({ error: "Unauthorized" }, { status: 401 }, request, env);
      const { stats, live } = await aggregateStats(env);
      const stub = env.MATCHMAKER.get(env.MATCHMAKER.idFromName(shardName("na", 0)));
      const res = await stub.fetch("https://do/internal/insights", {
        method: "POST",
        body: JSON.stringify({ stats, live }),
      });
      return json(await res.json(), { status: 200 }, request, env);
    }

    // ── ICE servers — clients fetch TURN/STUN config before calling ──
    if (url.pathname === "/api/ice-servers") {
      return handleIceServers(request, env);
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
  private readonly aiInsightsSessionId = `admin-insights-${crypto.randomUUID()}`;

  // ── In-memory search queue: mode → ordered client ids (FIFO = fair) ──
  // findMatch iterates only same-mode searchers — a small subset of all
  // sockets — instead of deserializing every client attachment per search.
  // Rebuilt lazily after hibernation (attachment state is the source of truth).
  private searchQueues: Map<string, Set<string>> | null = null;

  private queues(): Map<string, Set<string>> {
    if (this.searchQueues) return this.searchQueues;
    const q = new Map<string, Set<string>>();
    for (const ws of this.ctx.getWebSockets()) {
      const c = this.getClient(ws);
      if (c && !c.closed && c.status === "searching") {
        const set = q.get(c.mode) ?? new Set<string>();
        set.add(c.id);
        q.set(c.mode, set);
      }
    }
    this.searchQueues = q;
    return q;
  }

  private queueFor(mode: string): Set<string> {
    const q = this.queues();
    let set = q.get(mode);
    if (!set) { set = new Set<string>(); q.set(mode, set); }
    return set;
  }

  /** Status changes must flow through here to keep the queue index in sync. */
  private setStatus(c: ClientState, status: ClientState["status"]) {
    if (c.status === status) return;
    if (c.status === "searching") this.queueFor(c.mode).delete(c.id);
    c.status = status;
    if (status === "searching") this.queueFor(c.mode).add(c.id);
  }

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

  private trackAge(c: ClientState) {
    if (c.selfAge != null && !c.ageCounted) {
      c.ageCounted = true;
      const b = ageBracket(c.selfAge);
      this.stats.byAgeBracket[b] = (this.stats.byAgeBracket[b] ?? 0) + 1;
      pushSample(this.stats.ageSample, c.selfAge);
      this.persistStats();
    }
  }

  /**
   * Count a client in connection stats — called on the FIRST purposeful
   * message (register/search/lobby), not at socket-open. Silent sockets
   * (bots, probes, people who bounce before registering) never pollute
   * totalConnections/byCountry/days.
   */
  private markIdentified(c: ClientState, visitorId?: unknown) {
    if (typeof visitorId === "string" && visitorId && visitorId.length <= 128 && !c.visitorId) {
      c.visitorId = visitorId;
    }
    if (c.counted) return;
    c.counted = true;
    this.stats.totalConnections++;
    bumpDay(this.stats, "connections");
    bumpHourET(this.stats);
    trackUniqueVisitor(this.stats, c.visitorId);
    this.trackCountry(c); // CF geo baseline is already set — count it now that the client is real
    this.persistStats();
  }

  /** Search given up before a match (cancel/disconnect) — funnel + event. */
  private abandonSearch(c: ClientState, reason: "cancel" | "disconnect") {
    if (c.status !== "searching" || c.searchStartedAt == null) return;
    this.stats.searchesAbandoned++;
    pushEvent(this.stats, {
      t: Date.now(),
      kind: "search-abandoned",
      mode: c.mode,
      aGender: c.selfGender,
      bGender: null,
      aAge: c.selfAge,
      bAge: null,
      aCountry: c.country,
      bCountry: null,
      waitMs: Date.now() - c.searchStartedAt,
      reason,
    });
    c.searchStartedAt = undefined;
    this.persistStats();
  }

  /**
   * Call ended (skip/leave/disconnect/ban) — accumulate call duration and
   * emit a rich call-end event. The event + end-reason are only recorded
   * by the side that still has partnerId set (the initiator), so each
   * call logs once even though endCall runs for both participants.
   */
  private endCall(c: ClientState, reason: string) {
    if (!c.matchedAt) return;
    const durationMs = Date.now() - c.matchedAt;
    this.stats.totalCalls++;
    this.stats.totalCallMs += durationMs;
    pushSample(this.stats.callMsSample, durationMs);
    const bucket = durationBucket(durationMs);
    this.stats.byDurationBucket[bucket] = (this.stats.byDurationBucket[bucket] ?? 0) + 1;
    if (c.partnerId) {
      this.stats.byEndReason[reason] = (this.stats.byEndReason[reason] ?? 0) + 1;
      pushEvent(this.stats, {
        t: Date.now(),
        kind: "call-end",
        mode: c.mode,
        aGender: c.selfGender,
        bGender: c.peerGender,
        aAge: c.selfAge,
        bAge: c.peerAge,
        aCountry: c.country,
        bCountry: c.peerCountry,
        durationMs,
        reason,
      });
    }
    c.matchedAt = undefined;
    c.peerGender = null;
    c.peerAge = null;
    c.peerCountry = null;
    this.persistStats();
  }

  private liveCounts() {
    let online = 0, searching = 0, inCall = 0;
    for (const ws of this.ctx.getWebSockets()) {
      const c = this.getClient(ws);
      if (!c || c.closed) continue;
      online++;
      if (c.status === "searching") searching++;
      else if (c.status === "matched") inCall++;
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
  private async buildInsights(stats: MatchAnalytics, live: { online: number; searching: number; inCall: number }): Promise<{ insights: string[]; source: string }> {
    if (this.env.ENVIRONMENT === "development") {
      const missingPostHogVariable = !this.env.VITE_PUBLIC_POSTHOG_KEY
        ? "VITE_PUBLIC_POSTHOG_KEY"
        : !this.env.VITE_PUBLIC_POSTHOG_HOST
          ? "VITE_PUBLIC_POSTHOG_HOST"
          : null;
      if (missingPostHogVariable) {
        throw new Error(`${missingPostHogVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingPostHogVariable} is configured`);
      }
    }

    const view = analyticsView(stats, live);

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

        const traceId = crypto.randomUUID();
        const startedAt = Date.now();
        const res = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          messages: [{ role: "user", content: prompt }],
          max_tokens: 512,
        } as never);
        const text = (res as { response?: string }).response ?? "";
        await captureAiGeneration(this.env, {
          traceId,
          sessionId: this.aiInsightsSessionId,
          prompt,
          completion: text,
          latencySeconds: (Date.now() - startedAt) / 1000,
        });
        const lines = text
          .split("\n")
          .map((l) => l.trim().replace(/^[•\-\*]\s*/, ""))
          .filter((l) => l.length > 10);
        if (lines.length > 0) return { insights: lines.slice(0, 8), source: "workers-ai" };
      } catch (err) {
        console.error("[insights] Workers AI failed, falling back:", err);
      }
    }
    return { insights: heuristicInsights(stats, live), source: "heuristic" };
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
    const live = this.liveCounts();
    for (const ws of this.ctx.getWebSockets()) {
      this.send(ws, { type: "presence", onlineCount: live.online, searching: live.searching });
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
          this.setStatus(partner, "searching");
          partner.partnerId = undefined;
          this.endCall(partner, "partner-left");
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

    // Iterate only same-mode searchers (oldest first = FIFO fairness).
    const queue = this.queues().get(client.mode);
    if (!queue || queue.size === 0) return null;

    for (const otherId of queue) {
      if (otherId === client.id) continue;
      const otherWs = this.wsById(otherId);
      if (!otherWs) { queue.delete(otherId); continue; } // stale entry
      const other = this.getClient(otherWs);
      if (!other || other.closed || other.status !== "searching" || other.partnerId) {
        queue.delete(otherId);
        continue;
      }
      if (now - other.lastSeen > 5000) continue; // ghost check
      if (other.mode !== client.mode) continue;

      // Skip recently-skipped partners (entries expire after 60s)
      const skippedByMe = client.recentlySkipped[other.id];
      if (skippedByMe && skippedByMe > now) continue;
      const skippedByThem = other.recentlySkipped[client.id];
      if (skippedByThem && skippedByThem > now) continue;

      // Gender compatibility — `gender` is the *filter* (who they want to
      // meet); `selfGender` is who they ARE. Compare filter → selfGender,
      // not filter → filter (otherwise two users both seeking women match
      // each other).
      if (client.gender !== "any" && other.selfGender !== client.gender) continue;
      if (other.gender !== "any" && client.selfGender !== other.gender) continue;

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

    this.setStatus(a, "matched");
    this.setStatus(b, "matched");
    a.partnerId = b.id;
    b.partnerId = a.id;
    a.matchedAt = Date.now();
    b.matchedAt = a.matchedAt;
    // Peer snapshots — lets a call-end event carry both sides' demographics
    // even after the partner's socket is gone.
    a.peerGender = b.selfGender;
    a.peerAge = b.selfAge;
    a.peerCountry = b.country;
    b.peerGender = a.selfGender;
    b.peerAge = a.selfAge;
    b.peerCountry = a.country;
    this.putClient(aWs, a);
    this.putClient(bWs, b);

    // ── Analytics: match event + pairing distributions ──
    this.stats.totalMatches++;
    bumpDay(this.stats, "matches");
    this.stats.byModeMatches[a.mode] = (this.stats.byModeMatches[a.mode] ?? 0) + 1;
    const pairKey = genderPairKey(a.selfGender, b.selfGender);
    this.stats.byGenderPair[pairKey] = (this.stats.byGenderPair[pairKey] ?? 0) + 1;
    const waitA = a.searchStartedAt != null ? a.matchedAt - a.searchStartedAt : 0;
    const waitB = b.searchStartedAt != null ? a.matchedAt - b.searchStartedAt : 0;
    a.searchStartedAt = undefined;
    b.searchStartedAt = undefined;
    pushSample(this.stats.waitMsSample, waitA);
    pushSample(this.stats.waitMsSample, waitB);
    pushEvent(this.stats, {
      t: a.matchedAt,
      kind: "match",
      mode: a.mode,
      aGender: a.selfGender,
      bGender: b.selfGender,
      aAge: a.selfAge,
      bAge: b.selfAge,
      aCountry: a.country,
      bCountry: b.country,
      waitMs: Math.max(waitA, waitB),
    });
    this.persistStats();

    this.send(aWs, {
      type: "matched",
      role: "caller",
      peerId: b.id,
      peerCountry: b.country,
      peerName: b.name,
      peerGender: b.selfGender,
      peerAge: b.selfAge,
    });
    this.send(bWs, {
      type: "matched",
      role: "receiver",
      peerId: a.id,
      peerCountry: a.country,
      peerName: a.name,
      peerGender: a.selfGender,
      peerAge: a.selfAge,
    });

    console.log(
      `Matched ${a.id} (${a.name}, ${a.country}) ↔ ${b.id} (${b.name}, ${b.country}) [mode: ${a.mode}]`
    );

    // A match just happened — proof of liquidity. Ping offline subs
    // ("the frenzy is live") so departed visitors come back while it's hot.
    this.ctx.waitUntil(
      this.pingOfflineSubs(new Set([a.visitorId, b.visitorId].filter((v): v is string => !!v)))
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

  /**
   * Liquidity ping — tickle every stored push subscription except people
   * already online (they can just match) and the `except` set. Fired when
   * the pool gains liquidity: a searcher finds no one, a match pairs, or
   * the queue stays hot — so departed visitors come back when it counts.
   */
  private async pingOfflineSubs(except: ReadonlySet<string>) {
    const publicKey = this.env.VAPID_PUBLIC_KEY;
    const privateKey = this.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) return;
    const cfg = {
      publicKey,
      privateKey,
      subject: this.env.VAPID_SUB ?? "mailto:admin@facefrenzy.fun",
    };

    // Skip subscribers who are online right now — they can just match.
    const onlineVisitors = new Set<string>();
    for (const sock of this.ctx.getWebSockets()) {
      const oc = this.getClient(sock);
      if (oc?.visitorId && !oc.closed) onlineVisitors.add(oc.visitorId);
    }

    const subs = await this.ctx.storage.list<StoredPushSub>({ prefix: "push:" });
    const now = Date.now();
    for (const [key, sub] of subs) {
      const vid = key.slice(5);
      if (except.has(vid) || onlineVisitors.has(vid)) continue;
      if (now - sub.lastPushAt < PUSH_COOLDOWN_MS) continue;
      try {
        const status = await sendPushTickle({ endpoint: sub.endpoint, keys: sub.keys }, cfg);
        if (status === 404 || status === 410) {
          await this.ctx.storage.delete(key); // subscription is gone for good
        } else {
          sub.lastPushAt = now;
          await this.ctx.storage.put(key, sub);
        }
      } catch {
        // transient push failure — keep the sub, retry on the next search
      }
    }
  }

  private async removeClient(ws: WebSocket, reason = "disconnect") {
    const c = this.getClient(ws);
    if (!c || c.closed) return;
    c.closed = true;
    this.putClient(ws, c);

    if (c.partnerId) {
      const partnerWs = this.wsById(c.partnerId);
      const partner = partnerWs ? this.getClient(partnerWs) : null;
      if (partnerWs && partner) {
        this.send(partnerWs, { type: "partner-left", peerId: c.id });
        this.setStatus(partner, "searching");
        partner.partnerId = undefined;
        this.endCall(partner, "partner-left");
        this.putClient(partnerWs, partner);
      }
    }
    this.queueFor(c.mode).delete(c.id); // drop from queue index (client is gone)

    // ── Analytics: abandoned search + session + call duration ──
    // (only identified clients count — silent sockets never had a session)
    this.abandonSearch(c, "disconnect");
    this.endCall(c, reason);
    if (c.counted) {
      this.stats.sessionsEnded++;
      this.stats.totalSessionMs += Date.now() - c.joinedAt;
    }
    this.persistStats();

    await this.leaveLobby(ws, c);

    console.log(`Client ${c.id} (${c.country ?? "??"}) disconnected (${this.ctx.getWebSockets().length} online)`);
    this.broadcastOnlineCount();
  }

  // ── DO entry point: WebSocket upgrade + analytics endpoints ──
  async fetch(request: Request): Promise<Response> {
    const pathname = new URL(request.url).pathname;

    // Internal: raw stats for cross-shard aggregation (worker fan-out only —
    // /internal/* is never routed from the public fetch handler)
    if (pathname === "/internal/stats") {
      return Response.json({ stats: this.stats, live: this.liveCounts() });
    }
    if (pathname === "/internal/insights" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as {
        stats?: MatchAnalytics;
        live?: { online: number; searching: number; inCall: number };
      };
      const stats = body.stats ?? this.stats;
      const live = body.live ?? this.liveCounts();
      const result = await this.buildInsights(stats, live);
      return Response.json({ ...result, stats: analyticsView(stats, live) });
    }

    // Analytics snapshot — "who's using it, from where, how long" (this shard)
    if (pathname === "/api/analytics") {
      if (!this.adminOk(request)) return new Response("Unauthorized", { status: 401 });
      return Response.json(analyticsView(this.stats, this.liveCounts()));
    }

    // AI-generated insights (Workers AI, heuristic fallback)
    if (pathname === "/api/insights") {
      if (!this.adminOk(request)) return new Response("Unauthorized", { status: 401 });
      const result = await this.buildInsights(this.stats, this.liveCounts());
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
      status: "idle",
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      violations: 0,
      lastViolationAt: 0,
      recentlySkipped: {},
      selfGender: null,
      selfAge: null,
      peerGender: null,
      peerAge: null,
      peerCountry: null,
    };

    // NOTE: connection stats are NOT counted here — bots/probes open
    // silent sockets all day. markIdentified() counts on the first real
    // message (register/search/lobby).

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
        this.markIdentified(c, msg.visitorId);
        c.country = msg.country ?? c.country;
        c.name = msg.name ?? c.name;
        if (msg.selfGender) c.selfGender = normalizeGender(msg.selfGender);
        const regAge = normalizeAge(msg.selfAge);
        if (regAge != null) c.selfAge = regAge;
        this.trackCountry(c);
        this.trackGender(c);
        this.trackAge(c);
        console.log(`Client ${id} registered country: ${c.country} name: ${c.name} gender: ${c.selfGender ?? "?"} age: ${c.selfAge ?? "?"}`);
        break;
      }

      // ── Start searching for a match ──
      case "search": {
        this.markIdentified(c, msg.visitorId);
        // If still paired (e.g. re-search after reconnect without skipping),
        // release the old partner so they aren't stuck in "matched" status
        // with a dangling partnerId forever.
        if (c.partnerId) {
          const oldWs = this.wsById(c.partnerId);
          const oldPartner = oldWs ? this.getClient(oldWs) : null;
          if (oldWs && oldPartner) {
            const now = Date.now();
            c.recentlySkipped[oldPartner.id] = now + 60000;
            oldPartner.recentlySkipped[id] = now + 60000;
            this.setStatus(oldPartner, "searching");
            oldPartner.partnerId = undefined;
            this.endCall(oldPartner, "partner-left");
            this.putClient(oldWs, oldPartner);
            this.send(oldWs, { type: "partner-left", peerId: id });
          }
          // Close out the old call on this side too — keeps matchedAt
          // from spanning the old call + the new search.
          this.endCall(c, "replaced");
        }
        this.setStatus(c, "searching");
        c.mode = msg.mode ?? "solo";
        c.gender = msg.gender ?? "any";
        c.scholarOnly = msg.scholarOnly ?? false;
        c.countries = msg.countries ?? [];
        if (msg.name) c.name = msg.name;
        if (msg.selfGender) c.selfGender = normalizeGender(msg.selfGender);
        const searchAge = normalizeAge(msg.selfAge);
        if (searchAge != null) { c.selfAge = searchAge; this.trackAge(c); }
        c.partnerId = undefined;
        c.searchStartedAt = Date.now();

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
          this.send(ws, { type: "searching", onlineCount: this.clientCount(), searching: this.liveCounts().searching });
          // No one compatible right now — ping departed subscribers so an
          // earlier visitor can come back and meet this searcher.
          this.ctx.waitUntil(this.pingOfflineSubs(new Set(c.visitorId ? [c.visitorId] : [])));
        }
        break;
      }

      // ── Web Push: store/drop the browser subscription used for
      // "someone's online" pings after the tab closes ──
      case "push-sub": {
        this.markIdentified(c, msg.visitorId);
        const sub = msg.subscription;
        if (
          c.visitorId &&
          sub &&
          typeof sub.endpoint === "string" &&
          typeof sub.keys?.p256dh === "string" &&
          typeof sub.keys?.auth === "string"
        ) {
          const prev = await this.ctx.storage.get<StoredPushSub>(`push:${c.visitorId}`);
          const rec: StoredPushSub = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
            updatedAt: Date.now(),
            lastPushAt: prev?.lastPushAt ?? 0,
          };
          await this.ctx.storage.put(`push:${c.visitorId}`, rec);
        }
        break;
      }

      case "push-unsub": {
        this.markIdentified(c, msg.visitorId);
        if (c.visitorId) await this.ctx.storage.delete(`push:${c.visitorId}`);
        break;
      }

      // ── Cancel search ──
      case "cancel": {
        // Gave up searching — record before flipping status off "searching".
        this.abandonSearch(c, "cancel");
        // "in-call" = not in the queue — keeps findMatch from pairing a user
        // who already backed out to the lobby.
        this.setStatus(c, "in-call");
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

      // ── In-call game relay ──
      // Fallback transport for peer messages (games) when the WebRTC data
      // channel isn't open — forwards the opaque payload to the partner.
      case "game-relay": {
        if (c.partnerId && msg.data !== undefined) {
          const partnerWs = this.wsById(c.partnerId);
          if (partnerWs) this.send(partnerWs, { type: "game-relay", data: msg.data, peerId: id });
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
            this.setStatus(partner, "searching");
            partner.partnerId = undefined;
            this.endCall(partner, "partner-left");
            this.putClient(partnerWs, partner);
            this.send(partnerWs, { type: "partner-left", peerId: id });
          }
        }
        this.stats.skips++;
        this.endCall(c, "skip");
        this.setStatus(c, "searching");
        c.partnerId = undefined;
        this.send(ws, { type: "skipped" });
        // The client's next search() call will trigger findMatch
        this.send(ws, { type: "searching", onlineCount: this.clientCount(), searching: this.liveCounts().searching });
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
            this.setStatus(partner, "searching");
            partner.partnerId = undefined;
            this.endCall(partner, "partner-left");
            this.putClient(partnerWs, partner);
          }
        }
        this.endCall(c, "leave");
        this.setStatus(c, "in-call");
        c.partnerId = undefined;
        break;
      }

      // ── Lobby: create a room (host) ──
      case "lobby-create": {
        this.markIdentified(c, msg.visitorId);
        // Room ID embeds this DO's shard tag so a guest anywhere in the
        // world gets routed to the same shard (?room= on the WS upgrade).
        // "mm-na-2" → "NA2" → room "r-NA2-xxxx".
        const tag = (this.ctx.id.name ?? "mm-na-0")
          .replace(/^mm-/i, "")
          .replace("-", "")
          .toUpperCase();
        const roomId = `r-${tag}-${Math.random().toString(36).slice(2, 10)}`;
        await this.ctx.storage.put(`room:${roomId}`, { hostId: id } satisfies LobbyRoom);
        c.lobbyRoomId = roomId;
        c.lobbyRole = "host";
        this.send(ws, { type: "lobby-created", roomId });
        console.log(`Lobby room ${roomId} created by ${id}`);
        break;
      }

      // ── Lobby: join a room (guest) ──
      case "lobby-join": {
        this.markIdentified(c, msg.visitorId);
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

  async webSocketClose(ws: WebSocket, code: number) {
    // 4003 = closed by our own ban — attribute the call end accordingly
    await this.removeClient(ws, code === 4003 ? "ban" : "disconnect");
  }

  async webSocketError(ws: WebSocket) {
    await this.removeClient(ws, "disconnect");
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

    // Hot pool — enough searchers waiting that matches are likely. Ping
    // offline subs; the per-sub cooldown keeps this from spamming.
    if (this.liveCounts().searching >= HOT_POOL_THRESHOLD) {
      this.ctx.waitUntil(this.pingOfflineSubs(new Set()));
    }

    // Keep sweeping while anyone is connected; let the DO sleep when empty
    if (this.ctx.getWebSockets().length > 0) {
      await this.ctx.storage.setAlarm(now + SWEEP_INTERVAL_MS);
    }
  }
}
