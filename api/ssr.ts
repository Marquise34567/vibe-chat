import { readFileSync } from "fs";
import { join } from "path";

type SeoMeta = {
  title: string;
  description: string;
  path: string;
};

const SEO_ROUTES: Record<string, SeoMeta> = {
  "/": {
    path: "/",
    title: "FaceFrenzy — #1 Omegle Alternative for Random Video Chat",
    description:
      "FaceFrenzy is the #1 Omegle alternative for random video chat with real people — no bots, no fake profiles. 16+ age gated, AI moderated, one-click start. Talk to strangers worldwide via 1-on-1, group, and blind video chat.",
  },
  "/omegle-alternative": {
    path: "/omegle-alternative",
    title: "Best Omegle Alternative 2026 — FaceFrenzy Free Random Video Chat",
    description:
      "Looking for an Omegle alternative? FaceFrenzy is the best free Omegle replacement in 2026 — random video chat with real people, no bots, no signup. Group chat, blind mode, country filters, AI moderation.",
  },
  "/talk-to-strangers": {
    path: "/talk-to-strangers",
    title: "Talk to Strangers Online — Free Random Video Chat | FaceFrenzy",
    description:
      "Talk to strangers worldwide on FaceFrenzy — free random video chat with real people. No bots, no fake profiles. 16+, AI moderated, one-click start. Meet new people instantly.",
  },
  "/safety": {
    path: "/safety",
    title: "Safety & Moderation — FaceFrenzy Random Video Chat",
    description:
      "FaceFrenzy is committed to safety. 16+ age gating, AI content moderation, reporting tools, and privacy controls. Learn how we keep random video chat safe.",
  },
  "/vs/ometv": {
    path: "/vs/ometv",
    title: "FaceFrenzy vs OmeTV — Which Is the Better Omegle Alternative?",
    description:
      "FaceFrenzy vs OmeTV comparison: features, safety, video quality, modes, and pricing. See why FaceFrenzy is the best OmeTV alternative for random video chat.",
  },
  "/vs/emerald-chat": {
    path: "/vs/emerald-chat",
    title: "FaceFrenzy vs Emerald Chat — Better Omegle Alternative?",
    description:
      "FaceFrenzy vs Emerald Chat comparison: features, safety, modes, video quality. See why FaceFrenzy is the best Emerald Chat alternative for random video chat.",
  },
  "/vs/chatroulette": {
    path: "/vs/chatroulette",
    title: "FaceFrenzy vs Chatroulette — Best Random Video Chat 2026?",
    description:
      "FaceFrenzy vs Chatroulette comparison: features, safety, moderation, modes, and pricing. See why FaceFrenzy is the best Chatroulette alternative.",
  },
  "/vs/monkey": {
    path: "/vs/monkey",
    title: "FaceFrenzy vs Monkey App — Best Random Video Chat Alternative?",
    description:
      "FaceFrenzy vs Monkey App comparison: features, safety, modes, no download required. See why FaceFrenzy is the best Monkey app alternative for random video chat.",
  },
  "/blog/is-omegle-back": {
    path: "/blog/is-omegle-back",
    title: "Is Omegle Back? (2026 Update) — Best Omegle Alternatives | FaceFrenzy",
    description:
      "Is Omegle coming back in 2026? The full story and the best Omegle alternatives to use right now — FaceFrenzy, free random video chat with real people.",
  },
};

// Edge function that serves the SPA index.html with per-route <title>,
// <meta description>, and <link canonical> injected — so Google sees unique
// metadata for each URL instead of the homepage title for every route.
export default function handler(req, res) {
  const url = new URL(req.url, "https://www.facefrenzy.fun");
  let path = url.pathname;
  // Strip trailing slash (except root)
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);

  const seo = SEO_ROUTES[path];

  // Read the built index.html
  let html: string;
  try {
    html = readFileSync(join(process.cwd(), "dist", "index.html"), "utf-8");
  } catch {
    try {
      html = readFileSync(join(process.cwd(), "public", "index.html"), "utf-8");
    } catch {
      res.status(500).send("Internal error");
      return;
    }
  }

  if (seo) {
    // Replace title
    html = html.replace(
      /<title>.*?<\/title>/,
      `<title>${seo.title}</title>`
    );

    // Replace meta description
    html = html.replace(
      /<meta name="description" content=".*?"\s*\/?>/,
      `<meta name="description" content="${seo.description}" />`
    );

    // Replace canonical
    html = html.replace(
      /<link rel="canonical" href=".*?"\s*\/?>/,
      `<link rel="canonical" href="https://www.facefrenzy.fun${seo.path}" />`
    );

    // Replace og:title
    html = html.replace(
      /<meta property="og:title" content=".*?"\s*\/?>/,
      `<meta property="og:title" content="${seo.title}" />`
    );

    // Replace og:description
    html = html.replace(
      /<meta property="og:description" content=".*?"\s*\/?>/,
      `<meta property="og:description" content="${seo.description}" />`
    );

    // Replace og:url
    html = html.replace(
      /<meta property="og:url" content=".*?"\s*\/?>/,
      `<meta property="og:url" content="https://www.facefrenzy.fun${seo.path}" />`
    );

    // Replace twitter:title
    html = html.replace(
      /<meta name="twitter:title" content=".*?"\s*\/?>/,
      `<meta name="twitter:title" content="${seo.title}" />`
    );

    // Replace twitter:description
    html = html.replace(
      /<meta name="twitter:description" content=".*?"\s*\/?>/,
      `<meta name="twitter:description" content="${seo.description}" />`
    );
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600");
  res.status(200).send(html);
}
