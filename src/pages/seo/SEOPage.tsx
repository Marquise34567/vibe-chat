import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { FrenzyFace } from "@/components/MatchIcons";

// ── Design tokens (light, bubbly theme) ──
const INK = "#1B1A33";
const SUB = "rgba(27,26,51,0.62)";
const FAINT = "rgba(27,26,51,0.42)";
const BORDER = "rgba(27,26,51,0.09)";
const CARD = "#FFFFFF";
const VIOLET = "#6362F2";
const GRAD = "linear-gradient(180deg, #7B78FF 0%, #625FF3 100%)";
const CTA_SHADOW = "inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -2.5px 0 rgba(30,27,75,0.16), 0 8px 22px rgba(98,95,243,0.38)";
const SHADOW = "0 1px 2px rgba(27,26,51,0.04), 0 8px 24px rgba(109,94,245,0.10)";

const BG = [
  "radial-gradient(55% 42% at 50% -5%, rgba(139,92,246,0.22), transparent 70%)",
  "radial-gradient(38% 32% at 90% 16%, rgba(255,77,141,0.11), transparent 70%)",
  "radial-gradient(38% 32% at 6% 24%, rgba(99,102,241,0.13), transparent 70%)",
  "linear-gradient(180deg, #F6F4FF 0%, #EFEBFF 55%, #F8F6FF 100%)",
].join(", ");

const Chip = ({ icon, children }: { icon: string; children: ReactNode }) => (
  <span
    style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      padding: "8px 16px", borderRadius: 999,
      background: CARD, border: `1px solid ${BORDER}`,
      fontSize: 13, fontWeight: 700, color: INK,
      boxShadow: "0 2px 10px rgba(27,26,51,0.05)",
      whiteSpace: "nowrap",
    }}
  >
    <span style={{ fontSize: 14 }}>{icon}</span>
    {children}
  </span>
);

const ModeCard = ({ icon, name, tag, accent }: { icon: string; name: string; tag: string; accent: string }) => (
  <div
    style={{
      flex: "1 1 160px", maxWidth: 220, padding: "16px 14px",
      borderRadius: 20, background: CARD, border: `1px solid ${BORDER}`,
      boxShadow: SHADOW, textAlign: "center",
    }}
  >
    <div
      style={{
        width: 46, height: 46, margin: "0 auto 10px", borderRadius: 14,
        background: `linear-gradient(140deg, ${accent}, ${accent}BB)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, boxShadow: `0 6px 16px ${accent}44`,
      }}
    >
      {icon}
    </div>
    <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginBottom: 2 }}>{name}</div>
    <div style={{ fontSize: 12, color: SUB, lineHeight: 1.35 }}>{tag}</div>
  </div>
);

/**
 * SEOPage — shared layout for all SEO/landing pages.
 * Light, bubbly design with CTA to start chatting.
 */
export const SEOPage = ({
  title,
  subtitle,
  children,
  faqSchema,
  articleSchema,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  faqSchema?: object[];
  articleSchema?: object;
}) => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100dvh", background: BG, color: INK, display: "flex", flexDirection: "column" }}>
      {/* Article schema */}
      {articleSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />
      )}

      {/* FAQ schema */}
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqSchema }) }}
        />
      )}

      {/* Nav */}
      <nav
        style={{
          position: "sticky", top: 0, zIndex: 20,
          padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(250,249,255,0.72)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 9, background: "none", border: "none", cursor: "pointer" }}>
          <div style={{ width: 34, height: 34, borderRadius: 12, background: CARD, border: `1px solid ${BORDER}`, boxShadow: "inset 0 -2px 0 rgba(27,26,51,0.05), 0 4px 12px rgba(27,26,51,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FrenzyFace className="w-5 h-5" />
          </div>
          <span className="ff-wordmark" style={{ fontSize: 16 }}>facefrenzy</span>
        </button>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "9px 20px", borderRadius: 999, background: GRAD,
            color: "#fff", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer",
            boxShadow: CTA_SHADOW,
          }}
        >
          Start Chatting →
        </button>
      </nav>

      {/* Hero */}
      <div style={{ padding: "56px 20px 36px", textAlign: "center", maxWidth: 780, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <Chip icon="✨">Free random video chat · No signup · 16+</Chip>
        </div>
        <h1 style={{ fontSize: "clamp(30px, 6.5vw, 50px)", fontWeight: 900, letterSpacing: "-1.6px", lineHeight: 1.08, marginBottom: 14, color: INK }}>
          {title}
        </h1>
        <p style={{ fontSize: "clamp(15px, 3vw, 18px)", color: SUB, lineHeight: 1.5, marginBottom: 22, maxWidth: 620, margin: "0 auto 22px" }}>
          {subtitle}
        </p>

        {/* Feature chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 26 }}>
          <Chip icon="⚡">Matches in seconds</Chip>
          <Chip icon="🎥">Real people, zero bots</Chip>
          <Chip icon="🛡️">AI moderated</Chip>
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginBottom: 40 }}>
          <button
            onClick={() => navigate("/")}
            style={{
              padding: "15px 34px", borderRadius: 999, background: GRAD,
              color: "#fff", fontSize: 16, fontWeight: 800, border: "none", cursor: "pointer",
              boxShadow: CTA_SHADOW,
            }}
          >
            Start Video Chat →
          </button>
          <button
            onClick={() => document.getElementById("seo-content")?.scrollIntoView({ behavior: "smooth" })}
            style={{
              padding: "15px 30px", borderRadius: 999, background: CARD,
              color: INK, fontSize: 16, fontWeight: 800, border: `1px solid ${BORDER}`, cursor: "pointer",
              boxShadow: "0 2px 12px rgba(27,26,51,0.06)",
            }}
          >
            How it works
          </button>
        </div>

        {/* Mode cards */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
          <ModeCard icon="⚡" name="Solo" tag="1-on-1 random video chat" accent="#7C5CFF" />
          <ModeCard icon="🎉" name="Group" tag="3-4 people in one call" accent="#FF4D8D" />
          <ModeCard icon="🎭" name="Blind" tag="Voice first, reveal at 30s" accent="#38BDF8" />
        </div>
      </div>

      {/* Content */}
      <div id="seo-content" style={{ flex: 1, padding: "8px 20px 60px", maxWidth: 760, margin: "0 auto", width: "100%" }}>
        {children}
      </div>

      {/* Footer */}
      <footer style={{ padding: "28px 20px", borderTop: `1px solid ${BORDER}`, textAlign: "center", background: "rgba(255,255,255,0.5)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", marginBottom: 12 }}>
          <FooterLink href="/omegle-alternative" label="Omegle Alternative" navigate={navigate} />
          <FooterLink href="/free-omegle-alternative" label="Free Omegle Alternative" navigate={navigate} />
          <FooterLink href="/talk-to-strangers" label="Talk to Strangers" navigate={navigate} />
          <FooterLink href="/anonymous-video-chat" label="Anonymous Video Chat" navigate={navigate} />
          <FooterLink href="/random-cam-chat" label="Random Cam Chat" navigate={navigate} />
          <FooterLink href="/1v1-video-chat" label="1v1 Video Chat" navigate={navigate} />
          <FooterLink href="/best-omegle-alternatives" label="Best Omegle Alternatives" navigate={navigate} />
          <FooterLink href="/best-chatroulette-alternatives" label="Chatroulette Alternatives" navigate={navigate} />
          <FooterLink href="/monkey-app-alternatives" label="Monkey App Alternatives" navigate={navigate} />
          <FooterLink href="/random-video-chat-apps" label="Random Video Chat Apps" navigate={navigate} />
          <FooterLink href="/random-video-chat-no-sign-up" label="No Sign Up Video Chat" navigate={navigate} />
          <FooterLink href="/group-video-chat-strangers" label="Group Video Chat" navigate={navigate} />
          <FooterLink href="/blind-date-video-chat" label="Blind Date Chat" navigate={navigate} />
          <FooterLink href="/voice-chat-with-strangers" label="Voice Chat Strangers" navigate={navigate} />
          <FooterLink href="/college-video-chat" label="College Video Chat" navigate={navigate} />
          <FooterLink href="/websites-like-omegle" label="Websites Like Omegle" navigate={navigate} />
          <FooterLink href="/cam-to-cam-chat" label="Cam to Cam Chat" navigate={navigate} />
          <FooterLink href="/safety" label="Safety" navigate={navigate} />
          <FooterLink href="/vs/ometv" label="OmeTV Alternative" navigate={navigate} />
          <FooterLink href="/vs/emerald-chat" label="Emerald Chat Alternative" navigate={navigate} />
          <FooterLink href="/vs/chatroulette" label="Chatroulette Alternative" navigate={navigate} />
          <FooterLink href="/vs/monkey" label="Monkey App Alternative" navigate={navigate} />
          <FooterLink href="/vs/bazoocam" label="Bazoocam Alternative" navigate={navigate} />
          <FooterLink href="/vs/chatspin" label="Chatspin Alternative" navigate={navigate} />
          <FooterLink href="/vs/chatrandom" label="Chatrandom Alternative" navigate={navigate} />
          <FooterLink href="/vs/shagle" label="Shagle Alternative" navigate={navigate} />
          <FooterLink href="/vs/camsurf" label="CamSurf Alternative" navigate={navigate} />
          <FooterLink href="/vs/joingy" label="Joingy Alternative" navigate={navigate} />
          <FooterLink href="/blog/is-omegle-back" label="Is Omegle Back?" navigate={navigate} />
          <FooterLink href="/blog/what-happened-to-omegle" label="What Happened to Omegle" navigate={navigate} />
          <FooterLink href="/blog/best-random-video-chat-2026" label="Best Random Video Chat 2026" navigate={navigate} />
          <FooterLink href="/blog/how-to-stay-safe" label="How to Stay Safe" navigate={navigate} />
          <FooterLink href="/blog/omegle-alternative-no-signup" label="Omegle Alternative No Signup" navigate={navigate} />
        </div>
        <p style={{ fontSize: 12, color: FAINT }}>© 2026 FaceFrenzy. Random video chat with real people. 16+ only.</p>
      </footer>
    </div>
  );
};

const FooterLink = ({ href, label, navigate }: { href: string; label: string; navigate: (path: string) => void }) => (
  <button onClick={() => navigate(href)} style={{ fontSize: 12, color: SUB, background: "none", border: "none", cursor: "pointer" }}>{label}</button>
);

// ── Reusable styled components ──
export const Section = ({ children, style }: { children: ReactNode; style?: React.CSSProperties }) => (
  <section style={{ marginBottom: 32, ...style }}>{children}</section>
);

export const H2 = ({ children }: { children: ReactNode }) => (
  <h2 style={{ fontSize: 24, fontWeight: 800, color: INK, marginBottom: 12, marginTop: 8, letterSpacing: "-0.5px" }}>{children}</h2>
);

export const P = ({ children }: { children: ReactNode }) => (
  <p style={{ fontSize: 15, color: SUB, lineHeight: 1.65, marginBottom: 12 }}>{children}</p>
);

export const UL = ({ children }: { children: ReactNode }) => (
  <ul style={{ listStyle: "none", padding: 0, marginBottom: 16 }}>{children}</ul>
);

export const LI = ({ children }: { children: ReactNode }) => (
  <li
    style={{
      fontSize: 15, color: SUB, lineHeight: 1.6, marginBottom: 10,
      padding: "12px 16px 12px 42px", position: "relative",
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14,
      boxShadow: "0 1px 6px rgba(27,26,51,0.04)",
    }}
  >
    <span
      style={{
        position: "absolute", left: 14, top: 14, width: 18, height: 18, borderRadius: "50%",
        background: "rgba(109,94,245,0.12)", color: VIOLET,
        fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      ✓
    </span>
    {children}
  </li>
);

export const ComparisonTable = ({ rows }: { rows: { name: string; bots: string; age: string; mods: string; signup: string; free: string; highlight?: boolean }[] }) => (
  <div style={{ overflowX: "auto", marginBottom: 24, borderRadius: 18, background: CARD, border: `1px solid ${BORDER}`, boxShadow: SHADOW }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(109,94,245,0.05)" }}>
          <th style={{ textAlign: "left", padding: "12px 10px", color: FAINT, fontWeight: 700 }}>Site</th>
          <th style={{ textAlign: "center", padding: "12px 8px", color: FAINT, fontWeight: 700 }}>Bots?</th>
          <th style={{ textAlign: "center", padding: "12px 8px", color: FAINT, fontWeight: 700 }}>Age Gate</th>
          <th style={{ textAlign: "center", padding: "12px 8px", color: FAINT, fontWeight: 700 }}>Moderation</th>
          <th style={{ textAlign: "center", padding: "12px 8px", color: FAINT, fontWeight: 700 }}>Signup</th>
          <th style={{ textAlign: "center", padding: "12px 8px", color: FAINT, fontWeight: 700 }}>Free</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name} style={{
            borderBottom: `1px solid ${BORDER}`,
            background: r.highlight ? "rgba(109,94,245,0.07)" : "transparent",
          }}>
            <td style={{ padding: "12px 10px", fontWeight: r.highlight ? 800 : 600, color: r.highlight ? VIOLET : INK }}>
              {r.name}{r.highlight && " ←"}
            </td>
            <td style={{ textAlign: "center", padding: "12px 8px", color: r.bots === "No" ? "#16a34a" : "#dc2626" }}>{r.bots}</td>
            <td style={{ textAlign: "center", padding: "12px 8px", color: r.age === "16+" ? "#16a34a" : "#d97706" }}>{r.age}</td>
            <td style={{ textAlign: "center", padding: "12px 8px", color: r.mods === "AI" ? "#16a34a" : "#d97706" }}>{r.mods}</td>
            <td style={{ textAlign: "center", padding: "12px 8px", color: r.signup === "None" ? "#16a34a" : "#d97706" }}>{r.signup}</td>
            <td style={{ textAlign: "center", padding: "12px 8px", color: r.free === "Yes" ? "#16a34a" : "#dc2626" }}>{r.free}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const FAQ = ({ items }: { items: { q: string; a: string }[] }) => (
  <div style={{ marginBottom: 24 }}>
    {items.map((item, i) => (
      <details key={i} style={{ marginBottom: 10, borderRadius: 16, background: CARD, border: `1px solid ${BORDER}`, overflow: "hidden", boxShadow: "0 1px 6px rgba(27,26,51,0.04)" }}>
        <summary style={{ padding: "15px 18px", fontSize: 15, fontWeight: 700, color: INK, cursor: "pointer", listStyle: "none" }}>
          {item.q}
        </summary>
        <div style={{ padding: "0 18px 15px", fontSize: 14, color: SUB, lineHeight: 1.65 }}>
          {item.a}
        </div>
      </details>
    ))}
  </div>
);

export const faqToJson = (items: { q: string; a: string }[]) =>
  items.map((item) => ({
    "@type": "Question" as const,
    name: item.q,
    acceptedAnswer: { "@type": "Answer" as const, text: item.a },
  }));

// ── Advertorial listicle primitives (numbered rows, visual tiles, CTAs) ──

/** Big CTA button used inside listicle rows + banners */
export const ListicleCTA = ({ label = "Start Video Chat — Free" }: { label?: string }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/")}
      style={{
        marginTop: 10, padding: "12px 26px", borderRadius: 999,
        background: GRAD,
        color: "#fff", fontSize: 14, fontWeight: 800, border: "none", cursor: "pointer",
        boxShadow: CTA_SHADOW,
      }}
    >
      {label}
    </button>
  );
};

/**
 * Numbered listicle row — visual tile on the left, rank badge,
 * headline + copy on the right (advertorial style).
 */
export const ListicleItem = ({
  n,
  icon,
  title,
  accent = "#7C5CFF",
  children,
  cta = false,
}: {
  n: number;
  icon: string;
  title: ReactNode;
  accent?: string;
  children: ReactNode;
  cta?: boolean;
}) => (
  <div
    style={{
      display: "flex", gap: 16, marginBottom: 18, alignItems: "flex-start",
      padding: "18px 18px 18px 16px", borderRadius: 20,
      background: CARD, border: `1px solid ${BORDER}`, boxShadow: SHADOW,
    }}
  >
    {/* Visual tile + rank badge */}
    <div style={{ position: "relative", flexShrink: 0, width: "clamp(88px, 25vw, 120px)" }}>
      <div
        style={{
          width: "100%", aspectRatio: "4/5", borderRadius: 16,
          background: `linear-gradient(160deg, ${accent} 0%, ${accent}88 55%, #2A1B6B 130%)`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 6, boxShadow: `0 8px 24px ${accent}44`,
        }}
      >
        <span style={{ fontSize: "clamp(30px, 9vw, 42px)", filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.35))" }}>{icon}</span>
      </div>
      <div
        style={{
          position: "absolute", top: -9, right: -9, width: 30, height: 30, borderRadius: "50%",
          background: "linear-gradient(180deg, #FFE45E, #F5D000)", color: "#0A0A0F",
          fontWeight: 900, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 12px rgba(245,208,0,0.45)",
        }}
      >
        {n}
      </div>
    </div>

    {/* Copy */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <h3 style={{ fontSize: "clamp(16px, 4.4vw, 19px)", fontWeight: 800, color: INK, marginBottom: 6, lineHeight: 1.2, letterSpacing: "-0.3px" }}>
        {title}
      </h3>
      <div style={{ fontSize: 14, color: SUB, lineHeight: 1.6 }}>
        {children}
      </div>
      {cta && <ListicleCTA />}
    </div>
  </div>
);

/** Full-width promo banner — like the quiz/discount banner in advertorials */
export const ListicleBanner = ({
  title,
  subtitle,
  cta = "Try FaceFrenzy Free",
}: {
  title: string;
  subtitle: string;
  cta?: string;
}) => {
  const navigate = useNavigate();
  return (
    <div
      style={{
        borderRadius: 24, padding: "30px 24px", margin: "34px 0", textAlign: "center",
        background: "linear-gradient(150deg, #6362F2 0%, #8B5CF6 45%, #FF4D8D 120%)",
        boxShadow: "0 18px 48px rgba(124,92,255,0.35)",
      }}
    >
      <div style={{ fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.3px", marginBottom: 6 }}>
        {title}
      </div>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", marginBottom: 18, lineHeight: 1.5 }}>
        {subtitle}
      </p>
      <button
        onClick={() => navigate("/")}
        style={{
          padding: "13px 32px", borderRadius: 999,
          background: "#fff",
          color: INK, fontSize: 15, fontWeight: 800, border: "none", cursor: "pointer",
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        }}
      >
        {cta}
      </button>
    </div>
  );
};

// ── Article byline (named author + last updated date for E-E-A-T) ──
export const ArticleMeta = ({ author, role, updated }: { author: string; role: string; updated: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, padding: "12px 16px", borderRadius: 16, background: CARD, border: `1px solid ${BORDER}`, boxShadow: "0 1px 6px rgba(27,26,51,0.04)" }}>
    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #8B5CF6, #FF4D8D)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{author.charAt(0)}</span>
    </div>
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>{author}</div>
      <div style={{ fontSize: 12, color: FAINT }}>{role} · Updated {updated}</div>
    </div>
  </div>
);

// ── Build Article schema for JSON-LD ──
export const buildArticleSchema = ({
  headline,
  description,
  author,
  authorUrl,
  datePublished,
  dateModified,
  url,
}: {
  headline: string;
  description: string;
  author: string;
  authorUrl?: string;
  datePublished: string;
  dateModified: string;
  url: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline,
  description,
  author: {
    "@type": "Person",
    name: author,
    ...(authorUrl ? { url: authorUrl } : {}),
  },
  publisher: {
    "@type": "Organization",
    name: "FaceFrenzy",
    logo: {
      "@type": "ImageObject",
      url: "https://www.facefrenzy.fun/favicon.svg",
    },
  },
  datePublished,
  dateModified,
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": url,
  },
});
