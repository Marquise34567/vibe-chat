/**
 * Shared analytics types + heuristic insights for the FaceFrenzy
 * matchmaking backends (Cloudflare Durable Object + local Node server).
 * Both record the same aggregate shape so /api/analytics and
 * /api/insights return identical schemas.
 */

/**
 * A single matchmaking event — the granular record behind the aggregates.
 * One event is written per pairing ("match"), per call end ("call-end"),
 * and per abandoned search ("search-abandoned"). `a` is the initiator
 * (the side that skipped / left / disconnected / gave up); `b` is the
 * partner they were paired with.
 */
export type MatchEvent = {
  t: number;                          // epoch ms
  kind: "match" | "call-end" | "search-abandoned";
  mode: string;                       // solo | group | blind
  aGender: string | null;             // initiator's own gender bucket
  bGender: string | null;             // partner's own gender bucket
  aAge: number | null;                // initiator's self-reported age
  bAge: number | null;                // partner's self-reported age
  aCountry: string | null;
  bCountry: string | null;
  waitMs?: number;                    // match: longest queue wait in the pair; abandoned: time given up after
  durationMs?: number;                // call-end: how long the call lasted
  reason?: string;                    // call-end: skip|leave|disconnect|ban|replaced; abandoned: cancel|disconnect
};

export type MatchAnalytics = {
  startedAt: number;            // when stats collection began (ms)
  totalConnections: number;     // identified clients (register/search/lobby) — NOT raw sockets
  totalSearches: number;        // "search" requests
  totalMatches: number;         // pairs formed
  totalCalls: number;           // participant-call-ends (≈2 per solo call)
  sessionsEnded: number;        // identified connections closed
  totalSessionMs: number;       // sum of session durations
  totalCallMs: number;          // sum of participant call durations
  skips: number;                // skip presses
  searchesAbandoned: number;    // searches given up before a match (cancel/disconnect)
  violations: number;           // moderation violations recorded
  bans: number;                 // auto-bans issued
  byCountry: Record<string, number>;      // connections per ISO country code
  byGender: Record<string, number>;       // sessions per self-reported gender
  byMode: Record<string, number>;         // searches per mode
  byModeMatches: Record<string, number>;  // matches per mode
  byGenderPair: Record<string, number>;   // pairings per gender combo, e.g. "man↔woman"
  byAgeBracket: Record<string, number>;   // users per age bracket
  byEndReason: Record<string, number>;    // how calls end (initiator's reason)
  byDurationBucket: Record<string, number>; // call-length histogram
  ageSample: number[];          // bounded reservoir of ages → median age
  callMsSample: number[];       // bounded reservoir of call durations → median/p90
  waitMsSample: number[];       // bounded reservoir of queue waits → median wait
  recentEvents: MatchEvent[];   // ring buffer of the last events (admin live feed)
  days: Record<string, { connections: number; matches: number; uniques?: number }>; // YYYY-MM-DD
  byHourET: Record<string, number>; // connections per hour of day in ET ("0"-"23")
  uniqueVisitorDay: Record<string, string>; // visitorId → last dayKey counted (daily dedupe)
};

export const emptyStats = (): MatchAnalytics => ({
  startedAt: Date.now(),
  totalConnections: 0,
  totalSearches: 0,
  totalMatches: 0,
  totalCalls: 0,
  sessionsEnded: 0,
  totalSessionMs: 0,
  totalCallMs: 0,
  skips: 0,
  searchesAbandoned: 0,
  violations: 0,
  bans: 0,
  byCountry: {},
  byGender: {},
  byMode: {},
  byModeMatches: {},
  byGenderPair: {},
  byAgeBracket: {},
  byEndReason: {},
  byDurationBucket: {},
  ageSample: [],
  callMsSample: [],
  waitMsSample: [],
  recentEvents: [],
  days: {},
  byHourET: {},
  uniqueVisitorDay: {},
});

export const dayKey = (ts = Date.now()): string =>
  new Date(ts).toISOString().slice(0, 10);

export const bumpDay = (stats: MatchAnalytics, field: "connections" | "matches") => {
  const k = dayKey();
  const d = (stats.days[k] ??= { connections: 0, matches: 0 });
  d[field]++;
  // Prune to the last 30 days
  const keys = Object.keys(stats.days).sort();
  while (keys.length > 30) delete stats.days[keys.shift()!];
};

const ET_HOUR = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" });

/** Count a connection under its hour of day in ET — powers real "peak hours" data. */
export const bumpHourET = (stats: MatchAnalytics, ts = Date.now()) => {
  const h = String(parseInt(ET_HOUR.format(ts), 10));
  stats.byHourET[h] = (stats.byHourET[h] ?? 0) + 1;
};

/**
 * Daily unique visitors — the real DAU number. A visitorId (stable local
 * UUID sent by the client) counts once per UTC day no matter how many
 * sockets it opens (reconnects, lobby + match sockets, multi-tab).
 */
export const trackUniqueVisitor = (stats: MatchAnalytics, id: unknown) => {
  if (typeof id !== "string" || !id || id.length > 128) return;
  const k = dayKey();
  if (stats.uniqueVisitorDay[id] === k) return; // already counted today
  stats.uniqueVisitorDay[id] = k;
  const d = (stats.days[k] ??= { connections: 0, matches: 0 });
  d.uniques = (d.uniques ?? 0) + 1;
  // Bound the map — entries from other days can never match again, so
  // drop them once the map gets large.
  if (Object.keys(stats.uniqueVisitorDay).length > 20_000) {
    for (const vid of Object.keys(stats.uniqueVisitorDay)) {
      if (stats.uniqueVisitorDay[vid] !== k) delete stats.uniqueVisitorDay[vid];
    }
  }
};

/** Normalize a profile gender string into an analytics bucket. */
export const normalizeGender = (raw: string | null | undefined): string => {
  const g = (raw ?? "").trim().toLowerCase();
  if (!g || g === "prefer not to say") return "unspecified";
  // Already-normalized values pass through — clients normalize before
  // sending, and without this "unspecified" fell through to "other".
  if (g === "unspecified" || g === "other") return g;
  if (g === "woman" || g === "female" || g === "girl") return "woman";
  if (g === "man" || g === "male" || g === "guy") return "man";
  if (g === "non-binary" || g === "nonbinary" || g === "nb") return "non-binary";
  return "other";
};

/** Clamp a self-reported age to a sane integer, or null. */
export const normalizeAge = (raw: unknown): number | null => {
  const n = typeof raw === "string" ? parseInt(raw, 10) : typeof raw === "number" ? raw : NaN;
  if (!Number.isFinite(n) || n < 1 || n > 120) return null;
  return Math.floor(n);
};

// ── Bounded reservoirs for median/percentile stats ──
const SAMPLE_CAP = 1000;
export const EVENT_CAP = 200;

/** Append to a capped sample reservoir (keeps memory + DO storage bounded). */
export const pushSample = (arr: number[], v: number, cap = SAMPLE_CAP) => {
  arr.push(v);
  if (arr.length > cap) arr.splice(0, arr.length - cap);
};

/** Append an event to the recent-events ring buffer. */
export const pushEvent = (stats: MatchAnalytics, ev: MatchEvent) => {
  stats.recentEvents.push(ev);
  if (stats.recentEvents.length > EVENT_CAP) {
    stats.recentEvents.splice(0, stats.recentEvents.length - EVENT_CAP);
  }
};

/**
 * Merge one shard's MatchAnalytics into an aggregate — used when the
 * matchmaker is sharded per continent and /api/analytics fans out.
 * Daily uniques merge exactly: a visitorId hashes to ONE shard per day,
 * so the same user can never be counted in two shards' days.
 */
export const mergeAnalytics = (into: MatchAnalytics, from: MatchAnalytics) => {
  into.totalConnections += from.totalConnections ?? 0;
  into.totalSearches += from.totalSearches ?? 0;
  into.totalMatches += from.totalMatches ?? 0;
  into.totalCalls += from.totalCalls ?? 0;
  into.sessionsEnded += from.sessionsEnded ?? 0;
  into.totalSessionMs += from.totalSessionMs ?? 0;
  into.totalCallMs += from.totalCallMs ?? 0;
  into.skips += from.skips ?? 0;
  into.searchesAbandoned += from.searchesAbandoned ?? 0;
  into.violations += from.violations ?? 0;
  into.bans += from.bans ?? 0;
  for (const rec of ["byCountry", "byGender", "byMode", "byModeMatches", "byGenderPair", "byAgeBracket", "byEndReason", "byDurationBucket", "byHourET"] as const) {
    for (const [k, v] of Object.entries(from[rec] ?? {})) {
      into[rec][k] = (into[rec][k] ?? 0) + v;
    }
  }
  for (const [k, d] of Object.entries(from.days ?? {})) {
    const t = (into.days[k] ??= { connections: 0, matches: 0 });
    t.connections += d.connections;
    t.matches += d.matches;
    t.uniques = (t.uniques ?? 0) + (d.uniques ?? 0);
  }
  for (const [vid, k] of Object.entries(from.uniqueVisitorDay ?? {})) {
    if (!into.uniqueVisitorDay[vid] || into.uniqueVisitorDay[vid] < k) into.uniqueVisitorDay[vid] = k;
  }
  into.ageSample = [...into.ageSample, ...(from.ageSample ?? [])].slice(-SAMPLE_CAP);
  into.callMsSample = [...into.callMsSample, ...(from.callMsSample ?? [])].slice(-SAMPLE_CAP);
  into.waitMsSample = [...into.waitMsSample, ...(from.waitMsSample ?? [])].slice(-SAMPLE_CAP);
  into.recentEvents = [...into.recentEvents, ...(from.recentEvents ?? [])].sort((a, b) => a.t - b.t).slice(-EVENT_CAP);
};

export const percentile = (arr: number[], p: number): number | null => {
  if (arr.length === 0) return null;
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return s[idx];
};
export const median = (arr: number[]): number | null => percentile(arr, 50);

// ── Bucket helpers ──
export const AGE_BRACKETS = ["<16", "16-17", "18-24", "25-34", "35-44", "45-54", "55+", "unknown"] as const;
export const ageBracket = (age: number | null | undefined): string => {
  if (age == null) return "unknown";
  if (age < 16) return "<16";
  if (age <= 17) return "16-17";
  if (age <= 24) return "18-24";
  if (age <= 34) return "25-34";
  if (age <= 44) return "35-44";
  if (age <= 54) return "45-54";
  return "55+";
};

export const DURATION_BUCKETS = ["<5s", "5-15s", "15-60s", "1-5m", "5m+"] as const;
export const durationBucket = (ms: number): string => {
  if (ms < 5_000) return "<5s";
  if (ms < 15_000) return "5-15s";
  if (ms < 60_000) return "15-60s";
  if (ms < 300_000) return "1-5m";
  return "5m+";
};

/** Canonical key for a gender pairing (order-independent). */
export const genderPairKey = (a: string | null, b: string | null): string =>
  [a ?? "unknown", b ?? "unknown"].sort().join("↔");

/** Computed view returned by /api/analytics */
export const analyticsView = (stats: MatchAnalytics, live: { online: number; searching: number; inCall: number }) => {
  const avgSessionSec = stats.sessionsEnded > 0 ? Math.round(stats.totalSessionMs / stats.sessionsEnded / 1000) : 0;
  const avgCallSec = stats.totalCalls > 0 ? Math.round(stats.totalCallMs / stats.totalCalls / 1000) : 0;
  const topCountries = Object.entries(stats.byCountry).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const topGenders = Object.entries(stats.byGender).sort((a, b) => b[1] - a[1]);
  const topModes = Object.entries(stats.byMode).sort((a, b) => b[1] - a[1]);
  const sec = (ms: number | null) => (ms == null ? null : Math.round(ms / 1000));
  return {
    ...stats,
    avgSessionSec,
    avgCallSec,
    // matchRate = matches per search; each match consumes ~2 searches, so
    // searchSuccessRate ≈ share of individual searches that found someone.
    matchRate: stats.totalSearches > 0 ? +(stats.totalMatches / stats.totalSearches).toFixed(3) : 0,
    searchSuccessRate: stats.totalSearches > 0 ? +Math.min(1, (stats.totalMatches * 2) / stats.totalSearches).toFixed(3) : 0,
    abandonRate: stats.totalSearches > 0 ? +(stats.searchesAbandoned / stats.totalSearches).toFixed(3) : 0,
    medianAge: median(stats.ageSample),
    medianCallSec: sec(median(stats.callMsSample)),
    p75CallSec: sec(percentile(stats.callMsSample, 75)),
    p90CallSec: sec(percentile(stats.callMsSample, 90)),
    medianWaitSec: sec(median(stats.waitMsSample)),
    p90WaitSec: sec(percentile(stats.waitMsSample, 90)),
    // Real DAU — distinct visitorIds seen today (reconnects collapse to 1)
    uniquesToday: stats.days[dayKey()]?.uniques ?? 0,
    topCountries,
    topGenders,
    topModes,
    topModeMatches: Object.entries(stats.byModeMatches).sort((a, b) => b[1] - a[1]),
    topGenderPairs: Object.entries(stats.byGenderPair).sort((a, b) => b[1] - a[1]),
    endReasons: Object.entries(stats.byEndReason).sort((a, b) => b[1] - a[1]),
    durationBuckets: DURATION_BUCKETS.map((b) => [b, stats.byDurationBucket[b] ?? 0] as [string, number]),
    ageBrackets: AGE_BRACKETS.map((b) => [b, stats.byAgeBracket[b] ?? 0] as [string, number]),
    recentEvents: [...stats.recentEvents].reverse().slice(0, 50), // newest first
    live,
    generatedAt: Date.now(),
  };
};

/**
 * Heuristic insights — used when Workers AI isn't available
 * (local dev server, or as a fallback if the model call fails).
 */
export const heuristicInsights = (stats: MatchAnalytics, live: { online: number; searching: number; inCall: number }): string[] => {
  const out: string[] = [];
  const view = analyticsView(stats, live);

  if (stats.totalConnections === 0) {
    return ["Not enough data yet — insights appear once users start connecting."];
  }

  const top = view.topCountries[0];
  if (top) {
    const pct = Math.round((top[1] / Math.max(1, stats.totalConnections)) * 100);
    out.push(`Your biggest audience is ${top[0]} (${pct}% of all connections)`);
  }
  if (view.topCountries.length >= 3) {
    out.push(`Top regions: ${view.topCountries.slice(0, 3).map(([c, n]) => `${c} (${n})`).join(", ")}`);
  }

  const genders = view.topGenders.filter(([g]) => g !== "unspecified");
  if (genders.length) {
    const total = genders.reduce((s, [, n]) => s + n, 0);
    const [g, n] = genders[0];
    out.push(`${g === "woman" ? "Women" : g === "man" ? "Men" : g} are your most active identified group — ${Math.round((n / total) * 100)}% of users who shared a gender`);
    const women = stats.byGender["woman"] ?? 0;
    const men = stats.byGender["man"] ?? 0;
    if (men > 0 && women / men < 0.3) {
      out.push("Men heavily outnumber women — gender-filtered matching is a strong Plus selling point");
    }
  }

  if (view.medianAge != null) {
    out.push(`Median user age is ${view.medianAge} (based on ${stats.ageSample.length} self-reported ages)`);
  }

  if (view.topGenderPairs[0]) {
    const [pair, n] = view.topGenderPairs[0];
    out.push(`Most common pairing: ${pair} (${n} matches)`);
  }

  if (view.topModes[0]) {
    out.push(`"${view.topModes[0][0]}" is the most-used mode (${view.topModes[0][1]} searches)`);
  }

  if (view.avgSessionSec > 0) {
    const m = Math.floor(view.avgSessionSec / 60);
    out.push(`Average session lasts ${m > 0 ? `${m}m ${view.avgSessionSec % 60}s` : `${view.avgSessionSec}s`} — ${view.avgSessionSec > 300 ? "strong engagement" : "short sessions; consider faster matching"}`);
  }
  if (view.medianCallSec != null) {
    out.push(`Median call lasts ${view.medianCallSec}s (p90: ${view.p90CallSec}s)${view.medianCallSec < 15 ? " — most users skip before the 15s timer ends" : ""}`);
  } else if (view.avgCallSec > 0) {
    out.push(`Average call lasts ${view.avgCallSec}s${view.avgCallSec < 15 ? " — most users skip before the 15s timer ends" : ""}`);
  }
  if (stats.totalSearches > 0) {
    out.push(`${Math.round(view.searchSuccessRate * 100)}% of searches end in a match${view.abandonRate > 0 ? `, ${Math.round(view.abandonRate * 100)}% are abandoned` : ""}${live.searching > 0 ? ` — ${live.searching} searching right now` : ""}`);
  }
  if (view.medianWaitSec != null) {
    out.push(`Median wait to match: ${view.medianWaitSec}s${view.medianWaitSec > 30 ? " — queue is slow, loosen filters or grow concurrency" : ""}`);
  }
  if (stats.bans > 0 || stats.violations > 0) {
    out.push(`Moderation: ${stats.violations} violations, ${stats.bans} auto-bans so far`);
  }

  return out.slice(0, 8);
};
