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
  "/vs/bazoocam": {
    path: "/vs/bazoocam",
    title: "Bazoocam Alternative — Better Than Bazoocam? | FaceFrenzy",
    description:
      "Looking for a Bazoocam alternative? FaceFrenzy is free random video chat with real people — no bots, AI moderated, 16+, group and blind modes. No signup.",
  },
  "/vs/chatspin": {
    path: "/vs/chatspin",
    title: "Chatspin Alternative — Better Than Chatspin? | FaceFrenzy",
    description:
      "Looking for a Chatspin alternative? FaceFrenzy is free random video chat with real people — no bots, no paywall, AI moderated, 16+, group and blind modes.",
  },
  "/vs/chatrandom": {
    path: "/vs/chatrandom",
    title: "Chatrandom Alternative — Better Than Chatrandom? | FaceFrenzy",
    description:
      "Looking for a Chatrandom alternative? FaceFrenzy is free random video chat with real people — no bots, AI moderated, 16+, group and blind modes. No signup.",
  },
  "/vs/shagle": {
    path: "/vs/shagle",
    title: "Shagle Alternative — Better Than Shagle? | FaceFrenzy",
    description:
      "Looking for a Shagle alternative? FaceFrenzy is free random video chat with real people — no bots, no paywall, AI moderated, 16+, group and blind modes.",
  },
  "/vs/camsurf": {
    path: "/vs/camsurf",
    title: "CamSurf Alternative — Better Than CamSurf? | FaceFrenzy",
    description:
      "Looking for a CamSurf alternative? FaceFrenzy is free random video chat with real people — no bots, AI moderated, 16+, group and blind modes. No signup.",
  },
  "/vs/joingy": {
    path: "/vs/joingy",
    title: "Joingy Alternative — Better Than Joingy? | FaceFrenzy",
    description:
      "Looking for a Joingy alternative? FaceFrenzy is free random video chat with real people — no bots, AI moderated, 16+, group and blind modes. No signup.",
  },
  "/blog/what-happened-to-omegle": {
    path: "/blog/what-happened-to-omegle",
    title: "What Happened to Omegle? (2026) — Why It Shut Down & What Replaced It",
    description:
      "What happened to Omegle? Omegle shut down permanently in November 2023. Here's the full story of why it closed, what happened to its users, and what replaced it.",
  },
  "/blog/best-random-video-chat-2026": {
    path: "/blog/best-random-video-chat-2026",
    title: "Best Random Video Chat Sites 2026 — Ranked & Reviewed | FaceFrenzy",
    description:
      "The best random video chat sites in 2026, ranked by safety, features, and bot-free experience. See why FaceFrenzy is the #1 Omegle alternative.",
  },
  "/blog/how-to-stay-safe": {
    path: "/blog/how-to-stay-safe",
    title: "How to Stay Safe on Random Video Chat (2026 Guide) | FaceFrenzy",
    description:
      "How to stay safe on random video chat in 2026. Privacy tips, red flags to watch for, and how to choose a safe platform. Complete safety guide from FaceFrenzy.",
  },
  "/blog/omegle-alternative-no-signup": {
    path: "/blog/omegle-alternative-no-signup",
    title: "Omegle Alternative No Signup — Free Video Chat Without Registration | FaceFrenzy",
    description:
      "Omegle alternative with no signup required. Free random video chat without registration — no email, no account. AI moderated, 16+, zero bots. Start in seconds.",
  },
  "/free-omegle-alternative": {
    path: "/free-omegle-alternative",
    title: "Free Omegle Alternative — 100% Free Random Video Chat | FaceFrenzy",
    description:
      "The best free Omegle alternative. 100% free random video chat with real people — no bots, no paywall, no signup. AI moderated, 16+, group and blind modes.",
  },
  "/anonymous-video-chat": {
    path: "/anonymous-video-chat",
    title: "Anonymous Video Chat — Free, No Signup, No Tracking | FaceFrenzy",
    description:
      "Free anonymous video chat with strangers worldwide. No signup, no email, no tracking. AI moderated, 16+, WebRTC encrypted. Start chatting in seconds.",
  },
  "/random-cam-chat": {
    path: "/random-cam-chat",
    title: "Random Cam Chat — Free Webcam Chat with Strangers | FaceFrenzy",
    description:
      "Free random cam chat with strangers worldwide. No signup, no bots, AI moderated. Webcam chat with real people in seconds. 16+, group and blind modes.",
  },
  "/1v1-video-chat": {
    path: "/1v1-video-chat",
    title: "1v1 Video Chat — Free 1-on-1 Random Video Call | FaceFrenzy",
    description:
      "Free 1v1 video chat with random strangers. No bots, no signup, AI moderated. Start a 1-on-1 random video call in seconds. 16+, HD quality, works in browser.",
  },
  "/best-omegle-alternatives": {
    path: "/best-omegle-alternatives",
    title: "10 Best Omegle Alternatives in 2026 — Sites Like Omegle, Ranked | FaceFrenzy",
    description:
      "The 10 best Omegle alternatives in 2026, ranked. Sites like Omegle that still work — free random video chat, no signup, no bots. See why FaceFrenzy ranks #1.",
  },
  "/best-chatroulette-alternatives": {
    path: "/best-chatroulette-alternatives",
    title: "10 Best Chatroulette Alternatives in 2026 — Sites Like Chatroulette | FaceFrenzy",
    description:
      "The 10 best Chatroulette alternatives in 2026, ranked. Sites like Chatroulette with real users, no bots, better moderation — see why FaceFrenzy ranks #1.",
  },
  "/monkey-app-alternatives": {
    path: "/monkey-app-alternatives",
    title: "10 Best Monkey App Alternatives in 2026 — No Download Needed | FaceFrenzy",
    description:
      "The 10 best Monkey app alternatives in 2026. Random video chat without the download or signup — see why FaceFrenzy is the #1 free Monkey alternative.",
  },
  "/random-video-chat-apps": {
    path: "/random-video-chat-apps",
    title: "10 Best Random Video Chat Apps in 2026 — Talk to Strangers Free | FaceFrenzy",
    description:
      "The 10 best random video chat apps in 2026, ranked. Talk to strangers free — most don't even need a download. See why FaceFrenzy ranks #1.",
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
