import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

/**
 * SEOPage — shared layout for all SEO/landing pages.
 * Dark branded design matching FaceFrenzy, with CTA to start chatting.
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
    <div style={{ minHeight: "100dvh", background: "#050508", color: "#fff", display: "flex", flexDirection: "column" }}>
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
      <nav style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer" }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg, #7C5CFF, #FF4D8D)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>F</span>
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>facefrenzy</span>
        </button>
        <button onClick={() => navigate("/")} style={{ padding: "8px 18px", borderRadius: 20, background: "linear-gradient(180deg, #FFE45E, #F5D000)", color: "#0A0A0F", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer" }}>
          Start Chatting
        </button>
      </nav>

      {/* Hero */}
      <div style={{ padding: "60px 20px 40px", textAlign: "center", maxWidth: 760, margin: "0 auto" }}>
        <h1 style={{ fontSize: "clamp(28px, 6vw, 44px)", fontWeight: 900, letterSpacing: "-1px", lineHeight: 1.1, marginBottom: 12, color: "#fff" }}>
          {title}
        </h1>
        <p style={{ fontSize: "clamp(15px, 3vw, 18px)", color: "rgba(255,255,255,0.6)", lineHeight: 1.5, marginBottom: 24 }}>
          {subtitle}
        </p>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "14px 36px", borderRadius: 28,
            background: "linear-gradient(180deg, #FFE45E 0%, #F5D000 100%)",
            color: "#0A0A0F", fontSize: 16, fontWeight: 800, border: "none", cursor: "pointer",
            boxShadow: "0 6px 24px rgba(245,208,0,0.3)",
          }}
        >
          Start Video Chat — Free
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "0 20px 60px", maxWidth: 760, margin: "0 auto", width: "100%" }}>
        {children}
      </div>

      {/* Footer */}
      <footer style={{ padding: "24px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
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
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>© 2026 FaceFrenzy. Random video chat with real people. 16+ only.</p>
      </footer>
    </div>
  );
};

const FooterLink = ({ href, label, navigate }: { href: string; label: string; navigate: (path: string) => void }) => (
  <button onClick={() => navigate(href)} style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer" }}>{label}</button>
);

// ── Reusable styled components ──
export const Section = ({ children, style }: { children: ReactNode; style?: React.CSSProperties }) => (
  <section style={{ marginBottom: 32, ...style }}>{children}</section>
);

export const H2 = ({ children }: { children: ReactNode }) => (
  <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 12, marginTop: 8 }}>{children}</h2>
);

export const P = ({ children }: { children: ReactNode }) => (
  <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, marginBottom: 12 }}>{children}</p>
);

export const UL = ({ children }: { children: ReactNode }) => (
  <ul style={{ listStyle: "none", padding: 0, marginBottom: 16 }}>{children}</ul>
);

export const LI = ({ children }: { children: ReactNode }) => (
  <li style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, marginBottom: 8, paddingLeft: 24, position: "relative" }}>
    <span style={{ position: "absolute", left: 0, color: "#FFD60A" }}>✓</span>
    {children}
  </li>
);

export const ComparisonTable = ({ rows }: { rows: { name: string; bots: string; age: string; mods: string; signup: string; free: string; highlight?: boolean }[] }) => (
  <div style={{ overflowX: "auto", marginBottom: 24 }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: "2px solid rgba(255,255,255,0.1)" }}>
          <th style={{ textAlign: "left", padding: "10px 8px", color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>Site</th>
          <th style={{ textAlign: "center", padding: "10px 8px", color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>Bots?</th>
          <th style={{ textAlign: "center", padding: "10px 8px", color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>Age Gate</th>
          <th style={{ textAlign: "center", padding: "10px 8px", color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>Moderation</th>
          <th style={{ textAlign: "center", padding: "10px 8px", color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>Signup</th>
          <th style={{ textAlign: "center", padding: "10px 8px", color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>Free</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name} style={{
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            background: r.highlight ? "rgba(255,214,10,0.06)" : "transparent",
          }}>
            <td style={{ padding: "12px 8px", fontWeight: r.highlight ? 800 : 600, color: r.highlight ? "#FFD60A" : "#fff" }}>
              {r.name}{r.highlight && " ←"}
            </td>
            <td style={{ textAlign: "center", padding: "12px 8px", color: r.bots === "No" ? "#22c55e" : "#ef4444" }}>{r.bots}</td>
            <td style={{ textAlign: "center", padding: "12px 8px", color: r.age === "16+" ? "#22c55e" : "#f59e0b" }}>{r.age}</td>
            <td style={{ textAlign: "center", padding: "12px 8px", color: r.mods === "AI" ? "#22c55e" : "#f59e0b" }}>{r.mods}</td>
            <td style={{ textAlign: "center", padding: "12px 8px", color: r.signup === "None" ? "#22c55e" : "#f59e0b" }}>{r.signup}</td>
            <td style={{ textAlign: "center", padding: "12px 8px", color: r.free === "Yes" ? "#22c55e" : "#ef4444" }}>{r.free}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const FAQ = ({ items }: { items: { q: string; a: string }[] }) => (
  <div style={{ marginBottom: 24 }}>
    {items.map((item, i) => (
      <details key={i} style={{ marginBottom: 8, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <summary style={{ padding: "14px 16px", fontSize: 15, fontWeight: 600, color: "#fff", cursor: "pointer", listStyle: "none" }}>
          {item.q}
        </summary>
        <div style={{ padding: "0 16px 14px", fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
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
        marginTop: 10, padding: "11px 24px", borderRadius: 24,
        background: "linear-gradient(180deg, #FFE45E 0%, #F5D000 100%)",
        color: "#0A0A0F", fontSize: 14, fontWeight: 800, border: "none", cursor: "pointer",
        boxShadow: "0 4px 18px rgba(245,208,0,0.3)",
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
  <div style={{ display: "flex", gap: 14, marginBottom: 26, alignItems: "flex-start" }}>
    {/* Visual tile + rank badge */}
    <div style={{ position: "relative", flexShrink: 0, width: "clamp(92px, 27vw, 130px)" }}>
      <div
        style={{
          width: "100%", aspectRatio: "4/5", borderRadius: 16,
          background: `linear-gradient(160deg, ${accent} 0%, ${accent}88 55%, #0A0A14 130%)`,
          border: "1px solid rgba(255,255,255,0.10)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 6, boxShadow: `0 8px 28px ${accent}33`,
        }}
      >
        <span style={{ fontSize: "clamp(30px, 9vw, 42px)", filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.5))" }}>{icon}</span>
      </div>
      <div
        style={{
          position: "absolute", top: -9, right: -9, width: 30, height: 30, borderRadius: "50%",
          background: "linear-gradient(180deg, #FFE45E, #F5D000)", color: "#0A0A0F",
          fontWeight: 900, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 3px 10px rgba(0,0,0,0.5)",
        }}
      >
        {n}
      </div>
    </div>

    {/* Copy */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <h3 style={{ fontSize: "clamp(16px, 4.4vw, 19px)", fontWeight: 800, color: "#fff", marginBottom: 6, lineHeight: 1.2 }}>
        {title}
      </h3>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.62)", lineHeight: 1.55 }}>
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
        borderRadius: 20, padding: "28px 22px", margin: "34px 0", textAlign: "center",
        background: "linear-gradient(160deg, #2A1B6B 0%, #7C5CFF 55%, #FF4D8D 130%)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 16px 48px rgba(124,92,255,0.3)",
      }}
    >
      <div style={{ fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.3px", marginBottom: 6 }}>
        {title}
      </div>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", marginBottom: 16, lineHeight: 1.45 }}>
        {subtitle}
      </p>
      <button
        onClick={() => navigate("/")}
        style={{
          padding: "13px 32px", borderRadius: 26,
          background: "linear-gradient(180deg, #FFE45E 0%, #F5D000 100%)",
          color: "#0A0A0F", fontSize: 15, fontWeight: 800, border: "none", cursor: "pointer",
          boxShadow: "0 6px 22px rgba(0,0,0,0.35)",
        }}
      >
        {cta}
      </button>
    </div>
  );
};

// ── Article byline (named author + last updated date for E-E-A-T) ──
export const ArticleMeta = ({ author, role, updated }: { author: string; role: string; updated: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #7C5CFF, #FF4D8D)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{author.charAt(0)}</span>
    </div>
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{author}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{role} · Updated {updated}</div>
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
