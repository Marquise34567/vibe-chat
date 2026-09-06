// Per-route SEO metadata — served via api/ssr.ts edge function so Google
// sees unique <title>, <meta description>, and canonical per URL instead of
// the same homepage title for every route (which Google treats as duplicates).

type SeoMeta = {
  title: string;
  description: string;
  path: string;
};

export const SEO_ROUTES: Record<string, SeoMeta> = {
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
