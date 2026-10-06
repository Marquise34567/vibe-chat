export default function handler(req, res) {
  const today = new Date().toISOString().split("T")[0];

  const urls = [
    { loc: "https://www.facefrenzy.fun/", priority: "1.0", freq: "daily", lastmod: today },
    { loc: "https://www.facefrenzy.fun/omegle-alternative", priority: "0.9", freq: "weekly", lastmod: "2026-09-01" },
    { loc: "https://www.facefrenzy.fun/free-omegle-alternative", priority: "0.9", freq: "weekly", lastmod: "2026-09-01" },
    { loc: "https://www.facefrenzy.fun/talk-to-strangers", priority: "0.8", freq: "weekly", lastmod: "2026-09-01" },
    { loc: "https://www.facefrenzy.fun/anonymous-video-chat", priority: "0.8", freq: "weekly", lastmod: "2026-09-01" },
    { loc: "https://www.facefrenzy.fun/random-cam-chat", priority: "0.8", freq: "weekly", lastmod: "2026-09-01" },
    { loc: "https://www.facefrenzy.fun/1v1-video-chat", priority: "0.8", freq: "weekly", lastmod: "2026-09-01" },
    { loc: "https://www.facefrenzy.fun/best-omegle-alternatives", priority: "0.9", freq: "weekly", lastmod: "2026-09-23" },
    { loc: "https://www.facefrenzy.fun/best-chatroulette-alternatives", priority: "0.9", freq: "weekly", lastmod: "2026-10-05" },
    { loc: "https://www.facefrenzy.fun/monkey-app-alternatives", priority: "0.9", freq: "weekly", lastmod: "2026-10-05" },
    { loc: "https://www.facefrenzy.fun/random-video-chat-apps", priority: "0.9", freq: "weekly", lastmod: "2026-10-05" },
    { loc: "https://www.facefrenzy.fun/safety", priority: "0.7", freq: "monthly", lastmod: "2026-09-01" },
    { loc: "https://www.facefrenzy.fun/vs/ometv", priority: "0.7", freq: "monthly", lastmod: "2026-09-01" },
    { loc: "https://www.facefrenzy.fun/vs/emerald-chat", priority: "0.7", freq: "monthly", lastmod: "2026-09-01" },
    { loc: "https://www.facefrenzy.fun/vs/chatroulette", priority: "0.7", freq: "monthly", lastmod: "2026-09-01" },
    { loc: "https://www.facefrenzy.fun/vs/monkey", priority: "0.7", freq: "monthly", lastmod: "2026-09-01" },
    { loc: "https://www.facefrenzy.fun/vs/bazoocam", priority: "0.7", freq: "monthly", lastmod: "2026-09-01" },
    { loc: "https://www.facefrenzy.fun/vs/chatspin", priority: "0.7", freq: "monthly", lastmod: "2026-09-01" },
    { loc: "https://www.facefrenzy.fun/vs/chatrandom", priority: "0.7", freq: "monthly", lastmod: "2026-09-01" },
    { loc: "https://www.facefrenzy.fun/vs/shagle", priority: "0.7", freq: "monthly", lastmod: "2026-09-01" },
    { loc: "https://www.facefrenzy.fun/vs/camsurf", priority: "0.7", freq: "monthly", lastmod: "2026-09-01" },
    { loc: "https://www.facefrenzy.fun/vs/joingy", priority: "0.7", freq: "monthly", lastmod: "2026-09-01" },
    { loc: "https://www.facefrenzy.fun/blog/is-omegle-back", priority: "0.6", freq: "monthly", lastmod: "2026-09-01" },
    { loc: "https://www.facefrenzy.fun/blog/what-happened-to-omegle", priority: "0.6", freq: "monthly", lastmod: "2026-09-01" },
    { loc: "https://www.facefrenzy.fun/blog/best-random-video-chat-2026", priority: "0.6", freq: "monthly", lastmod: "2026-09-01" },
    { loc: "https://www.facefrenzy.fun/blog/how-to-stay-safe", priority: "0.6", freq: "monthly", lastmod: "2026-09-01" },
    { loc: "https://www.facefrenzy.fun/blog/omegle-alternative-no-signup", priority: "0.6", freq: "monthly", lastmod: "2026-09-01" },
  ];

  const entries = urls
    .map(
      (u) =>
        `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.freq}</changefreq><priority>${u.priority}</priority></url>`
    )
    .join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).send(sitemap);
}
