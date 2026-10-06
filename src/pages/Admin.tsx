import { ReactNode, useCallback, useEffect, useState } from "react";
import { apiBase } from "@/lib/config";
import { countryByCode } from "@/lib/countries";
import { isHalloweenSeason, HALLOWEEN } from "@/lib/halloween";
import { FrightBadge } from "@/components/HalloweenOverlay";

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
  violations: number;
  bans: number;
  byCountry: Record<string, number>;
  byGender: Record<string, number>;
  byMode: Record<string, number>;
  days: Record<string, { connections: number; matches: number }>;
  avgSessionSec: number;
  avgCallSec: number;
  matchRate: number;
  topCountries: [string, number][];
  topGenders: [string, number][];
  topModes: [string, number][];
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
};

const Admin = () => {
  const spooky = isHalloweenSeason();
  const accent = spooky ? HALLOWEEN.pumpkin : "#FFD60A";

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
              {spooky && <FrightBadge />}
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
              <StatCard emoji="⏱️" label="Avg session" value={fmtSec(stats.avgSessionSec)} sub={`${stats.sessionsEnded} ended`} />
              <StatCard emoji="📹" label="Avg call" value={fmtSec(stats.avgCallSec)} sub={`${stats.totalCalls} calls`} />
              <StatCard emoji="🚨" label="Violations" value={String(stats.violations)} sub={`${stats.bans} bans`} />
            </div>

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
            </Section>

            {/* Daily activity */}
            <Section title="Last 30 days">
              {Object.keys(stats.days).length === 0 && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>No history yet.</div>}
              {Object.entries(stats.days).sort().map(([day, d]) => (
                <div key={day} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 88, fontSize: 11, color: "rgba(255,255,255,0.4)", fontVariantNumeric: "tabular-nums" }}>{day.slice(5)}</div>
                  <div style={{ flex: 1, display: "flex", gap: 3, height: 12 }}>
                    <div style={{ width: `${(d.connections / Math.max(1, stats.totalConnections)) * 1000}%`, minWidth: d.connections ? 3 : 0, background: "rgba(255,255,255,0.25)", borderRadius: 3 }} title={`${d.connections} connections`} />
                    <div style={{ width: `${(d.matches / Math.max(1, stats.totalConnections)) * 1000}%`, minWidth: d.matches ? 3 : 0, background: accent, borderRadius: 3 }} title={`${d.matches} matches`} />
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", width: 90, textAlign: "right" }}>{d.connections} conn · {d.matches} m</div>
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
