/**
 * Shared analytics types + heuristic insights for the FaceFrenzy
 * matchmaking backends (Cloudflare Durable Object + local Node server).
 * Both record the same aggregate shape so /api/analytics and
 * /api/insights return identical schemas.
 */

export type MatchAnalytics = {
  startedAt: number;            // when stats collection began (ms)
  totalConnections: number;     // websocket connections seen
  totalSearches: number;        // "search" requests
  totalMatches: number;         // pairs formed
  totalCalls: number;           // calls that ended (skip/leave/disconnect)
  sessionsEnded: number;        // connections closed
  totalSessionMs: number;       // sum of session durations
  totalCallMs: number;          // sum of call durations
  skips: number;                // skip presses
  violations: number;           // moderation violations recorded
  bans: number;                 // auto-bans issued
  byCountry: Record<string, number>; // connections per ISO country code
  byGender: Record<string, number>;  // sessions per self-reported gender
  byMode: Record<string, number>;    // searches per mode
  days: Record<string, { connections: number; matches: number }>; // YYYY-MM-DD
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
  violations: 0,
  bans: 0,
  byCountry: {},
  byGender: {},
  byMode: {},
  days: {},
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

/** Normalize a profile gender string into an analytics bucket. */
export const normalizeGender = (raw: string | null | undefined): string => {
  const g = (raw ?? "").trim().toLowerCase();
  if (!g || g === "prefer not to say") return "unspecified";
  if (g === "woman" || g === "female" || g === "girl") return "woman";
  if (g === "man" || g === "male" || g === "guy") return "man";
  if (g === "non-binary" || g === "nonbinary" || g === "nb") return "non-binary";
  return "other";
};

/** Computed view returned by /api/analytics */
export const analyticsView = (stats: MatchAnalytics, live: { online: number; searching: number; inCall: number }) => {
  const avgSessionSec = stats.sessionsEnded > 0 ? Math.round(stats.totalSessionMs / stats.sessionsEnded / 1000) : 0;
  const avgCallSec = stats.totalCalls > 0 ? Math.round(stats.totalCallMs / stats.totalCalls / 1000) : 0;
  const topCountries = Object.entries(stats.byCountry).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const topGenders = Object.entries(stats.byGender).sort((a, b) => b[1] - a[1]);
  const topModes = Object.entries(stats.byMode).sort((a, b) => b[1] - a[1]);
  return {
    ...stats,
    avgSessionSec,
    avgCallSec,
    matchRate: stats.totalSearches > 0 ? +(stats.totalMatches / stats.totalSearches).toFixed(3) : 0,
    topCountries,
    topGenders,
    topModes,
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

  if (view.topModes[0]) {
    out.push(`"${view.topModes[0][0]}" is the most-used mode (${view.topModes[0][1]} searches)`);
  }

  if (view.avgSessionSec > 0) {
    const m = Math.floor(view.avgSessionSec / 60);
    out.push(`Average session lasts ${m > 0 ? `${m}m ${view.avgSessionSec % 60}s` : `${view.avgSessionSec}s`} — ${view.avgSessionSec > 300 ? "strong engagement" : "short sessions; consider faster matching"}`);
  }
  if (view.avgCallSec > 0) {
    out.push(`Average call lasts ${view.avgCallSec}s${view.avgCallSec < 15 ? " — most users skip before the 15s timer ends" : ""}`);
  }
  if (stats.totalSearches > 0) {
    out.push(`${Math.round(view.matchRate * 100)}% of searches end in a match${live.searching > 0 ? ` — ${live.searching} searching right now` : ""}`);
  }
  if (stats.bans > 0 || stats.violations > 0) {
    out.push(`Moderation: ${stats.violations} violations, ${stats.bans} auto-bans so far`);
  }

  return out.slice(0, 8);
};
