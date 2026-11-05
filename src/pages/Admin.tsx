import { ReactNode, useCallback, useEffect, useState } from "react";
import { apiBase } from "@/lib/config";
import { countryByCode } from "@/lib/countries";
import { BUBBLE } from "@/lib/bubble";
import type { MatchEvent } from "../../shared/analytics";

/**
 * Admin — matchmaking analytics + AI insights.
 * Hidden route (/admin). Fetches the match server's aggregate stats.
 * If ADMIN_KEY is set on the server, enter it once (stored in sessionStorage).
 */

type Stats = {
  startedAt: number;
  totalConnections: number;
  totalSearches: number;
  totalMatches: number;
  totalCalls: number;
  sessionsEnded: number;
  totalSessionMs: number;
  totalCallMs: number;
  skips: number;
  searchesAbandoned: number;
  violations: number;
  bans: number;
  byCountry: Record<string, number>;
  byGender: Record<string, number>;
  byMode: Record<string, number>;
  byModeMatches: Record<string, number>;
  byGenderPair: Record<string, number>;
  byAgeBracket: Record<string, number>;
  byEndReason: Record<string, number>;
  byDurationBucket: Record<string, number>;
  ageSample: number[];
  callMsSample: number[];
  waitMsSample: number[];
  days: Record<string, { connections: number; matches: number }>;
  avgSessionSec: number;
  avgCallSec: number;
  matchRate: number;
  searchSuccessRate: number;
  abandonRate: number;
  medianAge: number | null;
  medianCallSec: number | null;
  p75CallSec: number | null;
  p90CallSec: number | null;
  medianWaitSec: number | null;
  p90WaitSec: number | null;
  topCountries: [string, number][];
  topGenders: [string, number][];
  topModes: [string, number][];
  topModeMatches: [string, number][];
  topGenderPairs: [string, number][];
  endReasons: [string, number][];
  durationBuckets: [string, number][];
  ageBrackets: [string, number][];
  recentEvents: MatchEvent[];
  live: { online: number; searching: number; inCall: number };
};

const fmtSec = (s: number) =>
  s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
    : s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s`
    : `${s}s`;

const Bar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
    <div style={{ width: 110, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
    <div style={{ flex: 1, height: 14, borderRadius: 7, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
      <div style={{ width: `${Math.max(4, (value / Math.max(1, max)) * 100)}%`, height: "100%", borderRadius: 7, background: color, transition: "width 0.6s ease" }} />
    </div>
    <div style={{ width: 44, textAlign: "right", fontSize: 12, fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{value}</div>
  </div>
);

const StatCard = ({ label, value, sub, emoji }: { label: string; value: string; sub?: string; emoji: string }) => (
  <div style={{
    padding: "14px 16px", borderRadius: 18,
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
  }}>
    <div style={{ fontSize: 20, marginBottom: 6 }}>{emoji}</div>
    <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{value}</div>
    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 3 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{sub}</div>}
  </div>
);

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <div style={{
    padding: 18, borderRadius: 20, marginBottom: 14,
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
  }}>
    <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>{title}</div>
    {children}
  </div>
);

const GENDER_META: Record<string, { label: string; emoji: string; color: string }> = {
  woman:        { label: "Women",        emoji: "♀️", color: "#FF4D8D" },
  man:          { label: "Men",          emoji: "♂️", color: "#4DA6FF" },
  "non-binary": { label: "Non-binary",   emoji: "⚧️", color: "#B98CFF" },
  other:        { label: "Other",        emoji: "✨", color: "#7CFF6B" },
  unspecified:  { label: "Unspecified",  emoji: "❔", color: "rgba(255,255,255,0.35)" },
  unknown:      { label: "Unknown",      emoji: "❔", color: "rgba(255,255,255,0.35)" },
};

// ── Event feed helpers ──
const END_REASON_META: Record<string, { icon: string; label: string }> = {
  skip:            { icon: "⏭️", label: "skipped" },
  leave:           { icon: "👋", label: "left" },
  disconnect:      { icon: "🔌", label: "disconnected" },
  ban:             { icon: "🚫", label: "banned" },
  replaced:        { icon: "🔁", label: "re-searched" },
  "partner-left":  { icon: "👻", label: "partner left" },
};

const genderGlyph = (g: string | null) =>
  g === "woman" ? "♀" : g === "man" ? "♂" : g === "non-binary" ? "⚧" : g ? "·" : "?";

const evPerson = (g: string | null, age: number | null, country: string | null) =>
  `${genderGlyph(g)}${age != null ? ` ${age}` : ""}${country ? ` ${country}` : ""}`;

const ago = (t: number) => {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

const eventLine = (ev: MatchEvent): { icon: string; text: string } => {
  const pair = `${evPerson(ev.aGender, ev.aAge, ev.aCountry)} × ${evPerson(ev.bGender, ev.bAge, ev.bCountry)}`;
  if (ev.kind === "match") {
    return {
      icon: "⚡",
      text: `${ev.mode} match · ${pair}${ev.waitMs != null ? ` · after ${Math.max(1, Math.round(ev.waitMs / 1000))}s wait` : ""}`,
    };
  }
  if (ev.kind === "call-end") {
    const meta = END_REASON_META[ev.reason ?? ""] ?? { icon: "📞", label: ev.reason ?? "ended" };
    return {
      icon: meta.icon,
      text: `${meta.label} · ${ev.mode} · ${pair}${ev.durationMs != null ? ` · ${fmtSec(Math.round(ev.durationMs / 1000))} call` : ""}`,
    };
  }
  return {
    icon: "🚪",
    text: `gave up searching ${ev.mode} · ${evPerson(ev.aGender, ev.aAge, ev.aCountry)}${ev.waitMs != null ? ` · after ${Math.max(1, Math.round(ev.waitMs / 1000))}s` : ""}`,
  };
};

const Admin = () => {
  const accent = BUBBLE.brand;

  const [key, setKey] = useState(() => sessionStorage.getItem("ff_admin_key") ?? "");
  const [authed, setAuthed] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [insightsSource, setInsightsSource] = useState("");
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (k: string) => {
    setError(null);
    try {
      const qs = k ? `?key=${encodeURIComponent(k)}` : "";
      const res = await fetch(`${apiBase()}/api/analytics${qs}`);
      if (res.status === 401) { setAuthed(false); setError("Wrong admin key"); return; }
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setStats(data);
      setAuthed(true);
      sessionStorage.setItem("ff_admin_key", k);
    } catch (e) {
      setError(`Can't reach match server — ${e instanceof Error ? e.message : "unknown"}. Is it running? (npm run server / npm run worker)`);
    }
  }, []);

  const loadInsights = useCallback(async (k: string) => {
    setInsightsLoading(true);
    try {
      const qs = k ? `?key=${encodeURIComponent(k)}` : "";
      const res = await fetch(`${apiBase()}/api/insights${qs}`);
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights ?? []);
        setInsightsSource(data.source ?? "");
      }
    } catch { /* insights are optional */ }
    setInsightsLoading(false);
  }, []);

  useEffect(() => {
    load(key);
    const t = setInterval(() => load(key), 15000); // live refresh
    return () => clearInterval(t);
  }, [key, load]);

  useEffect(() => { if (authed && insights.length === 0) loadInsights(key); }, [authed]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalGendered = stats?.topGenders.filter(([g]) => g !== "unspecified").reduce((s, [, n]) => s + n, 0) ?? 0;

  return (
    <div style={{ minHeight: "100dvh", background: "#07070F", color: "#fff", padding: "24px 16px 60px", fontFamily: "-apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.5px" }}>Matchmaking Intelligence</h1>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              Live stats from the match server · refreshes every 15s
            </p>
          </div>
          <button
            onClick={() => { load(key); loadInsights(key); }}
            style={{ padding: "8px 16px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            Refresh
          </button>
        </div>

        {/* Key gate */}
        {!authed && (
          <div style={{ padding: 22, borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>🔐 Admin key</div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
              If ADMIN_KEY is set on the server, enter it here. Otherwise press Enter.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load(key)}
                placeholder="ADMIN_KEY"
                style={{ flex: 1, height: 44, borderRadius: 12, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "0 14px", fontSize: 14, outline: "none" }}
              />
              <button onClick={() => load(key)} style={{ height: 44, padding: "0 18px", borderRadius: 12, border: "none", background: accent, color: "#1A1400", fontWeight: 800, cursor: "pointer" }}>
                Open
              </button>
            </div>
            {error && <div style={{ marginTop: 10, fontSize: 12, color: "#FF6B6B" }}>{error}</div>}
          </div>
        )}

        {error && authed && <div style={{ fontSize: 12, color: "#FF6B6B", marginBottom: 12 }}>{error}</div>}

        {stats && (
          <>
            {/* Live now */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 14 }}>
              <StatCard emoji="🟢" label="Online now" value={String(stats.live.online)} />
              <StatCard emoji="🔍" label="Searching" value={String(stats.live.searching)} />
              <StatCard emoji="📞" label="In call" value={String(stats.live.inCall)} />
              <StatCard emoji="🧍" label="DAU today" value={String(stats.uniquesToday ?? 0)} sub="unique visitors" />
              <StatCard emoji="🎯" label="Match rate" value={`${Math.round(stats.matchRate * 100)}%`} sub="searches → matches" />
            </div>

            {/* AI insights */}
            <Section title={`🧠 AI insights ${insightsSource ? `· ${insightsSource === "workers-ai" ? "Workers AI (Llama)" : "heuristic engine"}` : ""}`}>
              {insightsLoading ? (
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Analyzing matchmaking data…</div>
              ) : insights.length > 0 ? (
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
                  {insights.map((ins, i) => (
                    <li key={i} style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.5, display: "flex", gap: 10 }}>
                      <span style={{ color: accent }}>•</span> {ins}
                    </li>
                  ))}
                </ul>
              ) : (
                <button onClick={() => loadInsights(key)} style={{ padding: "10px 18px", borderRadius: 14, border: "none", background: accent, color: "#1A1400", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                  Generate insights
                </button>
              )}
            </Section>

            {/* Totals */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 14 }}>
              <StatCard emoji="👥" label="Connections" value={stats.totalConnections.toLocaleString()} sub="all time" />
              <StatCard emoji="🔎" label="Searches" value={stats.totalSearches.toLocaleString()} />
              <StatCard emoji="🤝" label="Matches" value={stats.totalMatches.toLocaleString()} />
              <StatCard emoji="⏭️" label="Skips" value={stats.skips.toLocaleString()} />
              <StatCard emoji="🚪" label="Abandoned" value={stats.searchesAbandoned.toLocaleString()} sub={`${Math.round(stats.abandonRate * 100)}% of searches`} />
              <StatCard emoji="⏱️" label="Avg session" value={fmtSec(stats.avgSessionSec)} sub={`${stats.sessionsEnded} ended`} />
              <StatCard emoji="📹" label="Median call" value={stats.medianCallSec != null ? fmtSec(stats.medianCallSec) : "—"} sub={`avg ${fmtSec(stats.avgCallSec)} · p90 ${stats.p90CallSec != null ? fmtSec(stats.p90CallSec) : "—"}`} />
              <StatCard emoji="⏳" label="Median wait" value={stats.medianWaitSec != null ? `${stats.medianWaitSec}s` : "—"} sub={stats.p90WaitSec != null ? `p90 ${stats.p90WaitSec}s` : undefined} />
              <StatCard emoji="🎂" label="Median age" value={stats.medianAge != null ? String(stats.medianAge) : "—"} sub="self-reported" />
              <StatCard emoji="🚨" label="Violations" value={String(stats.violations)} sub={`${stats.bans} bans`} />
            </div>

            {/* Live event feed — the rich per-match event log */}
            <Section title="⚡ Live event feed">
              {stats.recentEvents.length === 0 && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>No events yet — they appear as people match, skip, and search.</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {stats.recentEvents.map((ev, i) => {
                  const { icon, text } = eventLine(ev);
                  return (
                    <div key={`${ev.t}-${i}`} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
                      <span style={{ width: 22, textAlign: "center", flexShrink: 0 }}>{icon}</span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{text}</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{ago(ev.t)}</span>
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* Search funnel — searches → matches vs abandoned */}
            <Section title="🔎 Search funnel">
              <Bar label="Searches" value={stats.totalSearches} max={stats.totalSearches} color="#8B5CF6" />
              <Bar label={`Found a match · ${Math.round(stats.searchSuccessRate * 100)}%`} value={Math.min(stats.totalSearches, stats.totalMatches * 2)} max={stats.totalSearches} color="#22C55E" />
              <Bar label={`Gave up · ${Math.round(stats.abandonRate * 100)}%`} value={stats.searchesAbandoned} max={stats.totalSearches} color="#FF6B6B" />
            </Section>

            {/* Call length distribution */}
            <Section title="📞 How long calls last">
              {stats.durationBuckets.every(([, n]) => n === 0) && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>No completed calls yet.</div>}
              {stats.durationBuckets.map(([b, n]) => (
                <Bar key={b} label={b} value={n} max={Math.max(1, ...stats.durationBuckets.map(([, v]) => v))} color={BUBBLE.brand} />
              ))}
              {stats.medianCallSec != null && (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>
                  median {fmtSec(stats.medianCallSec)} · p75 {stats.p75CallSec != null ? fmtSec(stats.p75CallSec) : "—"} · p90 {stats.p90CallSec != null ? fmtSec(stats.p90CallSec) : "—"}
                </div>
              )}
            </Section>

            {/* How calls end */}
            <Section title="🏁 How calls end">
              {stats.endReasons.length === 0 && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>No completed calls yet.</div>}
              {stats.endReasons.map(([r, n]) => {
                const meta = END_REASON_META[r] ?? { icon: "❔", label: r };
                return <Bar key={r} label={`${meta.icon} ${meta.label}`} value={n} max={stats.endReasons[0]?.[1] ?? 1} color="#F59E0B" />;
              })}
            </Section>

            {/* Who matches whom — gender pairing matrix */}
            <Section title="💞 Who matches whom">
              {stats.topGenderPairs.length === 0 && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>No matches yet.</div>}
              {stats.topGenderPairs.slice(0, 8).map(([pair, n]) => (
                <Bar key={pair} label={pair} value={n} max={stats.topGenderPairs[0]?.[1] ?? 1} color="#FF4D8D" />
              ))}
            </Section>

            {/* Gender split */}
            <Section title="Who's using it — gender">
              {stats.topGenders.length === 0 && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>No gender data yet — users can set it in their profile.</div>}
              {stats.topGenders.map(([g, n]) => {
                const meta = GENDER_META[g] ?? GENDER_META.other;
                return <Bar key={g} label={`${meta.emoji} ${meta.label}`} value={n} max={stats.topGenders[0]?.[1] ?? 1} color={meta.color} />;
              })}
              {totalGendered > 0 && (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>
                  {totalGendered} users identified · {stats.byGender["unspecified"] ?? 0} unspecified
                </div>
              )}
            </Section>

            {/* Age distribution */}
            <Section title="🎂 How old they are">
              {stats.ageBrackets.every(([, n]) => n === 0) && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>No age data yet — users can set it in their profile or on sign-up.</div>}
              {stats.ageBrackets.map(([b, n]) => (
                <Bar key={b} label={b === "unknown" ? "❔ unknown" : b} value={n} max={Math.max(1, ...stats.ageBrackets.map(([, v]) => v))} color="#22C55E" />
              ))}
              {stats.medianAge != null && (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>
                  Median age {stats.medianAge} · {stats.ageSample?.length ?? 0} ages reported
                </div>
              )}
            </Section>

            {/* Countries */}
            <Section title="Where they're from — top countries">
              {stats.topCountries.length === 0 && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>No geo data yet.</div>}
              {stats.topCountries.map(([c, n]) => {
                const meta = countryByCode(c);
                return <Bar key={c} label={`${meta?.flag ?? "🏳️"} ${meta?.name ?? c}`} value={n} max={stats.topCountries[0]?.[1] ?? 1} color={accent} />;
              })}
            </Section>

            {/* Modes */}
            <Section title="Modes they search">
              {stats.topModes.length === 0 && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>No searches yet.</div>}
              {stats.topModes.map(([m, n]) => (
                <Bar key={m} label={m === "solo" ? "🎥 Solo" : m === "group" ? "👥 Group" : m === "blind" ? "🙈 Blind" : m} value={n} max={stats.topModes[0]?.[1] ?? 1} color="#8B5CF6" />
              ))}
              {stats.topModeMatches.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>MATCHES PER MODE</div>
                  {stats.topModeMatches.map(([m, n]) => (
                    <Bar key={m} label={m === "solo" ? "🎥 Solo" : m === "group" ? "👥 Group" : m === "blind" ? "🙈 Blind" : m} value={n} max={stats.topModeMatches[0]?.[1] ?? 1} color="#22C55E" />
                  ))}
                </div>
              )}
            </Section>

            {/* Daily activity */}
            <Section title="Last 30 days">
              {Object.keys(stats.days).length === 0 && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>No history yet.</div>}
              {Object.entries(stats.days).sort().map(([day, d]) => (
                <div key={day} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 88, fontSize: 11, color: "rgba(255,255,255,0.4)", fontVariantNumeric: "tabular-nums" }}>{day.slice(5)}</div>
                  <div style={{ flex: 1, display: "flex", gap: 3, height: 12 }}>
                    <div style={{ width: `${(d.connections / Math.max(1, stats.totalConnections)) * 1000}%`, minWidth: d.connections ? 3 : 0, background: "rgba(255,255,255,0.25)", borderRadius: 3 }} title={`${d.connections} connections`} />
                    <div style={{ width: `${((d.uniques ?? 0) / Math.max(1, stats.totalConnections)) * 1000}%`, minWidth: d.uniques ? 3 : 0, background: "#22C55E", borderRadius: 3 }} title={`${d.uniques ?? 0} unique visitors`} />
                    <div style={{ width: `${(d.matches / Math.max(1, stats.totalConnections)) * 1000}%`, minWidth: d.matches ? 3 : 0, background: accent, borderRadius: 3 }} title={`${d.matches} matches`} />
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", width: 110, textAlign: "right" }}>{d.uniques ?? d.connections} ppl · {d.matches} m</div>
                </div>
              ))}
            </Section>
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;
